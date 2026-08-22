package websocket

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Estos tests manejan el estado del hub desde la goroutine del test, llamando
// addClient/removeClient/dispatch directamente en vez de arrancar Run. Es el
// mismo código que ejecuta Run, y mantiene la invariante del actor: una sola
// goroutine toca rooms.

var upgrader = websocket.Upgrader{}

// nuevaConexion devuelve un conn de servidor real y el peer del cliente.
func nuevaConexion(t *testing.T) (*websocket.Conn, *websocket.Conn) {
	t.Helper()
	conns := make(chan *websocket.Conn, 1)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Error(err)
			return
		}
		conns <- c
	}))
	t.Cleanup(srv.Close)

	peer, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(srv.URL, "http"), nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { peer.Close() })

	select {
	case sc := <-conns:
		return sc, peer
	case <-time.After(2 * time.Second):
		t.Fatal("timeout esperando el upgrade")
		return nil, nil
	}
}

func TestDispatch_ClienteLento_EsExpulsadoYSocketCerrado(t *testing.T) {
	h := NewHub()
	org, edicion := uuid.New(), uuid.New()

	conn, peer := nuevaConexion(t)
	client := NewClient(org, edicion, conn)
	h.addClient(client)

	// Nadie drena client.send (no hay writePump): a partir de sendBuffer+1 el
	// client es lento por definición.
	for i := range sendBuffer + 1 {
		h.dispatch(message{room: RoomKey{org, edicion}, payload: []byte("evento")})
		_ = i
	}

	if _, ok := h.rooms[RoomKey{org, edicion}]; ok {
		t.Error("el client lento no fue expulsado: la room sigue existiendo")
	}

	// El socket tiene que quedar cerrado, no solo el canal.
	peer.SetReadDeadline(time.Now().Add(2 * time.Second))
	if _, _, err := peer.ReadMessage(); err == nil {
		t.Error("el socket del client expulsado sigue abierto")
	} else {
		t.Logf("socket cerrado como se esperaba: %v", err)
	}

	// El canal quedó cerrado. Ojo: sigue teniendo los sendBuffer mensajes que
	// alcanzaron a entrar, y un receive sobre un canal cerrado devuelve primero
	// lo bufferado con ok=true — hay que drenarlo antes de comprobar el cierre.
	drenados := 0
	for range client.send {
		drenados++
	}
	t.Logf("client.send cerrado tras drenar %d mensajes bufferados", drenados)
	if drenados != sendBuffer {
		t.Errorf("se esperaban %d mensajes bufferados, hubo %d", sendBuffer, drenados)
	}
}

func TestDispatch_AisladoPorOrg(t *testing.T) {
	h := NewHub()
	orgA, orgB, edicion := uuid.New(), uuid.New(), uuid.New()

	connA, _ := nuevaConexion(t)
	clientA := NewClient(orgA, edicion, connA)
	h.addClient(clientA)

	// Misma edición, otra org.
	h.dispatch(message{room: RoomKey{orgB, edicion}, payload: []byte("evento-de-org-B")})

	select {
	case p := <-clientA.send:
		t.Errorf("el client de org A recibio un evento de org B: %q", p)
	default:
		t.Log("el client de org A no recibio el evento de org B")
	}

	// Control: el mismo evento en su propia org sí llega.
	h.dispatch(message{room: RoomKey{orgA, edicion}, payload: []byte("evento-de-org-A")})
	select {
	case p := <-clientA.send:
		t.Logf("control: el client de org A si recibe lo suyo: %q", p)
	default:
		t.Error("el client de org A no recibio su propio evento")
	}
}

func TestBroadcast_NoBloqueaConRunMuerto(t *testing.T) {
	h := NewHub()
	// Run NUNCA se arranca: simula el hub caido.
	org, edicion := uuid.New(), uuid.New()

	hecho := make(chan time.Duration, 1)
	go func() {
		inicio := time.Now()
		// Muy por encima de broadcastBuffer.
		for range broadcastBuffer * 10 {
			h.Broadcast(org, edicion, []byte("evento"))
		}
		hecho <- time.Since(inicio)
	}()

	select {
	case d := <-hecho:
		t.Logf("%d broadcasts con Run muerto no bloquearon (tardaron %v)", broadcastBuffer*10, d)
	case <-time.After(3 * time.Second):
		t.Fatal("Broadcast bloqueo con Run muerto: la ruta critica quedaria colgada")
	}
}

func TestRemoveClient_RoomVaciaNoQuedaColgada(t *testing.T) {
	h := NewHub()
	org, edicion := uuid.New(), uuid.New()
	key := RoomKey{org, edicion}

	conn1, _ := nuevaConexion(t)
	conn2, _ := nuevaConexion(t)
	c1 := NewClient(org, edicion, conn1)
	c2 := NewClient(org, edicion, conn2)
	h.addClient(c1)
	h.addClient(c2)

	if len(h.rooms) != 1 || len(h.rooms[key]) != 2 {
		t.Fatalf("estado inicial inesperado: %d rooms, %d clients", len(h.rooms), len(h.rooms[key]))
	}

	h.removeClient(c1)
	if len(h.rooms) != 1 {
		t.Errorf("la room se borro con un client todavia adentro")
	}

	h.removeClient(c2)
	if len(h.rooms) != 0 {
		t.Errorf("la room vacia quedo colgada en el map: %d entradas", len(h.rooms))
	}
	t.Logf("tras desconectar a los 2 clients, len(rooms)=%d", len(h.rooms))
}

// removeClient tiene que ser idempotente: un client expulsado por lento recibe
// despues su unregister cuando el readPump muere, y ese segundo paso no puede
// volver a cerrar el canal.
func TestRemoveClient_EsIdempotente(t *testing.T) {
	h := NewHub()
	org, edicion := uuid.New(), uuid.New()
	conn, _ := nuevaConexion(t)
	client := NewClient(org, edicion, conn)
	h.addClient(client)

	h.removeClient(client)
	h.removeClient(client) // el unregister que llega tarde
	h.removeClient(client)
	t.Log("removeClient x3 sobre el mismo client: sin doble close")
}
