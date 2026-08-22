// Package websocket distribuye eventos en vivo a los admins conectados al panel
// de cata, agrupados por (org, edición).
//
// El hub es un actor puro: el map de rooms lo toca ÚNICAMENTE la goroutine Run.
// No hay mutex y no debe agregarse uno — si aparece la necesidad de leer el
// estado desde afuera (métricas, health), la forma correcta es un canal de
// request/response servido por Run, no un candado sobre el map.
package websocket

import (
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait = 10 * time.Second
	pongWait  = 60 * time.Second
	// pingPeriod deriva de pongWait a propósito: el margen (54s < 60s) es lo que
	// permite perder un ping sin matar la conexión. Si se vuelve una constante
	// suelta, alguien la desincroniza y las conexiones mueren al minuto.
	pingPeriod = (pongWait * 9) / 10

	// sendBuffer es la política del hub, no del caller: cuántos eventos se le
	// toleran a un client antes de considerarlo lento y expulsarlo.
	sendBuffer = 16
	// broadcastBuffer absorbe ráfagas de eventos mientras Run está ocupado. Con
	// el buffer lleno se descarta el evento — nunca se bloquea al productor.
	broadcastBuffer = 256
)

// RoomKey identifica una room. La org forma parte de la clave: aunque fallara
// la verificación de ownership previa al upgrade, un evento de una org no puede
// alcanzar a un client de otra.
type RoomKey struct {
	OrgID     uuid.UUID
	EdicionID uuid.UUID
}

// Client es una conexión WebSocket de un admin suscripto a una edición.
// Se construye con NewClient: el caller no elige el buffer ni arma la struct.
type Client struct {
	room RoomKey
	conn *websocket.Conn
	send chan []byte
}

// NewClient arma un client listo para ServeClient.
func NewClient(orgID, edicionID uuid.UUID, conn *websocket.Conn) *Client {
	return &Client{
		room: RoomKey{OrgID: orgID, EdicionID: edicionID},
		conn: conn,
		send: make(chan []byte, sendBuffer),
	}
}

// message es un evento a distribuir a los clients de una room.
type message struct {
	room    RoomKey
	payload []byte
}

// Hub mantiene las conexiones activas agrupadas por room y distribuye eventos.
type Hub struct {
	// rooms: propiedad exclusiva de la goroutine Run. Sin lock por diseño.
	rooms map[RoomKey]map[*Client]bool

	register   chan *Client
	unregister chan *Client
	broadcast  chan message
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[RoomKey]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan message, broadcastBuffer),
	}
}

// Broadcast encola un evento para los clients de (orgID, edicionID).
//
// NUNCA bloquea. Si Run no está consumiendo —o murió— el evento se descarta con
// un warning. El panel en vivo es best-effort: la ruta crítica que produce el
// evento (cargar una evaluación) no puede depender de que el hub esté sano.
func (h *Hub) Broadcast(orgID, edicionID uuid.UUID, payload []byte) {
	room := RoomKey{OrgID: orgID, EdicionID: edicionID}
	select {
	case h.broadcast <- message{room: room, payload: payload}:
	default:
		slog.Warn("websocket: evento descartado, buffer de broadcast lleno",
			"org_id", room.OrgID, "edicion_id", room.EdicionID, "buffer", broadcastBuffer)
	}
}

// Run procesa los canales del hub. Debe correr en su propia goroutine, y es la
// única que puede tocar rooms o cerrar el canal send de un client.
//
// Run es solo el router: toda la lógica vive en addClient/removeClient/dispatch,
// que asumen ser llamadas desde una única goroutine.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.addClient(client)
		case client := <-h.unregister:
			h.removeClient(client)
		case msg := <-h.broadcast:
			h.dispatch(msg)
		}
	}
}

func (h *Hub) addClient(client *Client) {
	room := h.rooms[client.room]
	if room == nil {
		room = make(map[*Client]bool)
		h.rooms[client.room] = room
	}
	room[client] = true
}

// dispatch reparte el evento entre los clients de la room. Borrar del map
// mientras se lo recorre es válido en Go, así que expulsar a un client lento
// acá mismo es seguro.
func (h *Hub) dispatch(msg message) {
	for client := range h.rooms[msg.room] {
		select {
		case client.send <- msg.payload:
		default:
			// Client lento: se lo expulsa acá mismo (canal y socket cerrados
			// por removeClient). Se loguea porque, sin esto, un admin expulsado
			// por lentitud es indistinguible de uno que cerró el browser.
			slog.Warn("websocket: client lento expulsado, buffer de envío lleno",
				"org_id", client.room.OrgID, "edicion_id", client.room.EdicionID, "buffer", sendBuffer)
			h.removeClient(client)
		}
	}
}

// removeClient saca al client de su room y lo cierra. Es el ÚNICO camino de
// salida del map y el único lugar donde se cierra client.send — el guard de
// pertenencia lo hace idempotente, así que un client ya expulsado por lento no
// se vuelve a cerrar cuando llega su unregister.
//
// Solo puede llamarse desde Run: Run es también el único que escribe en
// client.send, y esa exclusividad es lo que garantiza que nadie mande sobre un
// canal ya cerrado.
func (h *Hub) removeClient(client *Client) {
	room, ok := h.rooms[client.room]
	if !ok {
		return
	}
	if _, ok := room[client]; !ok {
		return
	}
	delete(room, client)
	close(client.send)
	// La expulsión cierra también el socket: si solo se cerrara el canal, el
	// readPump del client seguiría vivo hasta que writePump reaccione.
	client.conn.Close()
	if len(room) == 0 {
		delete(h.rooms, client.room)
	}
}

// ServeClient registra el client, arranca sus goroutines de lectura/escritura y
// bloquea hasta que la conexión termina.
func (h *Hub) ServeClient(client *Client) {
	h.register <- client

	done := make(chan struct{})
	go h.writePump(client, done)
	h.readPump(client, done)
}

func (h *Hub) readPump(client *Client, done chan struct{}) {
	defer func() {
		h.unregister <- client
		client.conn.Close()
		close(done)
	}()

	client.conn.SetReadDeadline(time.Now().Add(pongWait))
	client.conn.SetPongHandler(func(string) error {
		// Re-arma el deadline en cada pong. Sin esto, TODA conexión muere a los
		// pongWait exactos aunque esté sana.
		client.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		if _, _, err := client.conn.ReadMessage(); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Warn("websocket read error", "error", err)
			}
			return
		}
	}
}

func (h *Hub) writePump(client *Client, done chan struct{}) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		client.conn.Close()
	}()

	for {
		select {
		case payload, ok := <-client.send:
			client.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				client.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := client.conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				return
			}

		case <-ticker.C:
			client.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}

		case <-done:
			return
		}
	}
}
