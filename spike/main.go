// Spike: minimal WebSocket relay for the d3dweb collab notification pattern.
//
// Each WS client joins a room identified by ?room=<dagId>.
// Any JSON message sent by a client is broadcast to all OTHER clients in
// the same room (echo prevention built in).
//
// Run: go run . (fetches gorilla/websocket on first run)
// Connect: ws://localhost:8081/ws?room=<dagId>
//
// DELETE this directory before merging feat/collab-phase0 to main.
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // allow all origins in dev
}

type client struct {
	conn   *websocket.Conn
	send   chan []byte
	roomID string
}

type room struct {
	mu      sync.Mutex
	clients map[*client]struct{}
}

var (
	roomsMu sync.Mutex
	rooms   = map[string]*room{}
)

func getOrCreateRoom(id string) *room {
	roomsMu.Lock()
	defer roomsMu.Unlock()
	if r, ok := rooms[id]; ok {
		return r
	}
	r := &room{clients: make(map[*client]struct{})}
	rooms[id] = r
	return r
}

func (r *room) join(c *client) {
	r.mu.Lock()
	r.clients[c] = struct{}{}
	r.mu.Unlock()
	log.Printf("[%s] client joined (%d total)", c.roomID, r.count())
}

func (r *room) leave(c *client) {
	r.mu.Lock()
	delete(r.clients, c)
	r.mu.Unlock()
	log.Printf("[%s] client left (%d remaining)", c.roomID, r.count())
}

func (r *room) broadcast(sender *client, msg []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for c := range r.clients {
		if c == sender {
			continue // echo prevention
		}
		select {
		case c.send <- msg:
		default:
			log.Printf("[%s] slow client — dropping message", c.roomID)
		}
	}
}

func (r *room) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.clients)
}

func (c *client) writePump() {
	defer c.conn.Close()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			log.Printf("[%s] write error: %v", c.roomID, err)
			return
		}
	}
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("room")
	if roomID == "" {
		http.Error(w, "missing ?room= parameter", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade error: %v", err)
		return
	}

	rm := getOrCreateRoom(roomID)
	c := &client{conn: conn, send: make(chan []byte, 64), roomID: roomID}
	rm.join(c)
	go c.writePump()

	defer func() {
		rm.leave(c)
		close(c.send)
		conn.Close()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		// Validate it's JSON before relaying
		if !json.Valid(msg) {
			log.Printf("[%s] invalid JSON — dropping", roomID)
			continue
		}
		log.Printf("[%s] relay: %s", roomID, msg)
		rm.broadcast(c, msg)
	}
}

func main() {
	http.HandleFunc("/ws", wsHandler)
	http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	log.Println("spike relay listening on :8081")
	log.Println("connect: ws://localhost:8081/ws?room=<dagId>")
	if err := http.ListenAndServe(":8081", nil); err != nil {
		log.Fatal(err)
	}
}
