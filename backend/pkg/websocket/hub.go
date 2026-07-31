package websocket

import (
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

// Client representa una conexión WebSocket de un admin suscripto a una edición.
type Client struct {
	EdicionID uuid.UUID
	Conn      *websocket.Conn
	Send      chan []byte
}

// Message es un evento a distribuir a todos los clients de una edición.
type Message struct {
	EdicionID uuid.UUID
	Payload   []byte
}

// Hub mantiene las conexiones activas agrupadas por edición y distribuye mensajes.
type Hub struct {
	rooms map[uuid.UUID]map[*Client]bool
	mu    sync.RWMutex

	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan Message
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[uuid.UUID]map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan Message),
	}
}

// Run procesa los canales del hub. Debe correr en su propia goroutine.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if h.rooms[client.EdicionID] == nil {
				h.rooms[client.EdicionID] = make(map[*Client]bool)
			}
			h.rooms[client.EdicionID][client] = true
			h.mu.Unlock()

		case client := <-h.Unregister:
			h.mu.Lock()
			if clients, ok := h.rooms[client.EdicionID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.Send)
					if len(clients) == 0 {
						delete(h.rooms, client.EdicionID)
					}
				}
			}
			h.mu.Unlock()

		case msg := <-h.Broadcast:
			h.mu.RLock()
			clients := h.rooms[msg.EdicionID]
			for client := range clients {
				select {
				case client.Send <- msg.Payload:
				default:
					// Client lento o desconectado: se limpia via readPump/writePump.
					close(client.Send)
					delete(clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// ServeClient registra el client, arranca sus goroutines de lectura/escritura y bloquea
// hasta que la conexión termina.
func (h *Hub) ServeClient(client *Client) {
	h.Register <- client

	done := make(chan struct{})
	go h.writePump(client, done)
	h.readPump(client, done)
}

func (h *Hub) readPump(client *Client, done chan struct{}) {
	defer func() {
		h.Unregister <- client
		client.Conn.Close()
		close(done)
	}()

	client.Conn.SetReadDeadline(time.Now().Add(pongWait))
	client.Conn.SetPongHandler(func(string) error {
		client.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		if _, _, err := client.Conn.ReadMessage(); err != nil {
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
		client.Conn.Close()
	}()

	for {
		select {
		case payload, ok := <-client.Send:
			client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := client.Conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				return
			}

		case <-ticker.C:
			client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}

		case <-done:
			return
		}
	}
}
