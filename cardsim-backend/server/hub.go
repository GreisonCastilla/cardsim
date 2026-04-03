package server

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"sync"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all for dev
	},
}

type Hub struct {
	clients    map[*Client]bool
	rooms      map[string]*Room
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.Mutex
}

type Room struct {
	ID         string
	Name       string
	Password   string
	Host       *Client
	Guest      *Client
	HostReady  bool
	GuestReady bool
	HostDeck   string
	GuestDeck  string
	mu         sync.Mutex
}

type RoomInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	HasPassword bool   `json:"has_password"`
	Players     int    `json:"players"`
	MaxPlayers  int    `json:"max_players"`
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]*Room),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			h.broadcastRooms() // Send updated room list to all
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				h.removeClientFromRooms(client)
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			h.broadcastRooms() // Send updated room list
		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// Generates a random alphanumeric room ID
func generateRoomID() string {
	var letters = []rune("ABCDEF123456789")
	b := make([]rune, 6)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func (h *Hub) removeClientFromRooms(client *Client) {
	for id, room := range h.rooms {
		room.mu.Lock()
		if room.Host == client {
			// If host leaves, destroy the room
			if room.Guest != nil {
				h.sendToClient(room.Guest, "ROOM_CLOSED", nil)
			}
			room.mu.Unlock()
			delete(h.rooms, id)
			continue
		} else if room.Guest == client {
			room.Guest = nil
			room.GuestReady = false
			h.sendToClient(room.Host, "GUEST_LEFT", nil)
		}
		room.mu.Unlock()
	}
}

func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	tokenString := r.URL.Query().Get("token")
	if tokenString == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !token.Valid {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		UserID:   claims.UserID,
		Username: claims.Username,
	}
	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

// Helper methods on Hub

func (h *Hub) getRoomList() []RoomInfo {
	h.mu.Lock()
	defer h.mu.Unlock()

	rooms := make([]RoomInfo, 0, len(h.rooms))
	for _, room := range h.rooms {
		room.mu.Lock()
		players := 0
		if room.Host != nil {
			players++
		}
		if room.Guest != nil {
			players++
		}

		rooms = append(rooms, RoomInfo{
			ID:          room.ID,
			Name:        room.Name,
			HasPassword: room.Password != "",
			Players:     players,
			MaxPlayers:  2,
		})
		room.mu.Unlock()
	}
	return rooms
}

func (h *Hub) broadcastRooms() {
	go func() {
		rooms := h.getRoomList()
		h.broadcastToAll("ROOM_LIST", rooms)
	}()
}

func (h *Hub) broadcastToAll(msgType string, payload interface{}) {
	msg := map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	}
	data, _ := json.Marshal(msg)
	h.broadcast <- data
}

func (h *Hub) sendToClient(c *Client, msgType string, payload interface{}) {
	if c == nil {
		return
	}
	msg := map[string]interface{}{
		"type":    msgType,
		"payload": payload,
	}
	data, _ := json.Marshal(msg)
	c.send <- data
}

type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

func (h *Hub) handleMessage(c *Client, data []byte) {
	var msg WSMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Println("Invalid json in handleMessage:", err)
		return
	}

	log.Printf("Received WS Message: %s\n", msg.Type)

	switch msg.Type {
	case "CREATE_ROOM":
		var req struct {
			Name     string `json:"name"`
			Password string `json:"password"`
		}
		if err := json.Unmarshal(msg.Payload, &req); err == nil {
			log.Printf("Creating Room with Name: %s\n", req.Name)
			h.createRoom(c, req.Name, req.Password)
		} else {
			log.Println("Failed to unmarshal CREATE_ROOM payload:", string(msg.Payload), err)
		}
	case "JOIN_ROOM":
		var req struct {
			ID       string `json:"id"`
			Password string `json:"password"`
		}
		if err := json.Unmarshal(msg.Payload, &req); err == nil {
			h.joinRoom(c, req.ID, req.Password)
		} else {
			log.Println("Failed to unmarshal JOIN_ROOM payload:", string(msg.Payload), err)
		}
	case "LEAVE_ROOM":
		h.mu.Lock()
		h.removeClientFromRooms(c)
		h.mu.Unlock()
		h.broadcastRooms()
	case "READY":
		h.setReady(c)
	case "ROOM_CHAT":
		var req struct {
			Text string `json:"text"`
		}
		if err := json.Unmarshal(msg.Payload, &req); err == nil {
			h.roomChat(c, req.Text)
		}
	case "SELECT_DECK":
		var req struct {
			DeckName string `json:"deckName"`
		}
		if err := json.Unmarshal(msg.Payload, &req); err == nil {
			h.selectDeck(c, req.DeckName)
		}
	}
}

func (h *Hub) selectDeck(c *Client, deckName string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for _, room := range h.rooms {
		room.mu.Lock()
		if room.Host == c {
			room.HostDeck = deckName
			h.sendToClient(room.Guest, "OPPONENT_DECK", deckName)
		} else if room.Guest == c {
			room.GuestDeck = deckName
			h.sendToClient(room.Host, "OPPONENT_DECK", deckName)
		}
		room.mu.Unlock()
	}
}

func (h *Hub) roomChat(c *Client, text string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, room := range h.rooms {
		room.mu.Lock()
		if room.Host == c || room.Guest == c {
			chatMsg := map[string]interface{}{
				"sender": c.Username,
				"text":   text,
			}
			h.sendToClient(room.Host, "CHAT_MESSAGE", chatMsg)
			if room.Guest != nil {
				h.sendToClient(room.Guest, "CHAT_MESSAGE", chatMsg)
			}
			room.mu.Unlock()
			break
		}
		room.mu.Unlock()
	}
}

func (h *Hub) createRoom(c *Client, name, password string) {
	h.mu.Lock()

	// Remove client from any existing rooms first
	h.removeClientFromRooms(c)

	id := generateRoomID()
	room := &Room{
		ID:       id,
		Name:     name,
		Password: password,
		Host:     c,
	}
	h.rooms[id] = room
	h.mu.Unlock()

	h.sendToClient(c, "ROOM_CREATED", map[string]interface{}{
		"id":       id,
		"name":     name,
		"isHost":   true,
		"hostName": c.Username,
	})
	h.broadcastRooms()
}

func (h *Hub) joinRoom(c *Client, id, password string) {
	h.mu.Lock()
	room, exists := h.rooms[id]
	if !exists {
		h.mu.Unlock()
		h.sendToClient(c, "ERROR", "Room not found")
		return
	}

	room.mu.Lock()
	if room.Password != "" && room.Password != password {
		room.mu.Unlock()
		h.mu.Unlock()
		h.sendToClient(c, "ERROR", "Invalid password")
		return
	}

	if room.Guest != nil {
		room.mu.Unlock()
		h.mu.Unlock()
		h.sendToClient(c, "ERROR", "Room is full")
		return
	}

	room.mu.Unlock()
	h.removeClientFromRooms(c)
	room.mu.Lock()

	room.Guest = c
	hostUsername := room.Host.Username
	roomName := room.Name
	room.mu.Unlock()
	h.mu.Unlock()

	h.sendToClient(c, "ROOM_JOINED", map[string]interface{}{
		"id":       id,
		"name":     roomName,
		"isHost":   false,
		"hostName": hostUsername,
	})

	h.sendToClient(room.Host, "GUEST_JOINED", map[string]interface{}{
		"guestName": c.Username,
	})

	if room.HostDeck != "" {
		h.sendToClient(c, "OPPONENT_DECK", room.HostDeck)
	}

	h.broadcastRooms()
}

func (h *Hub) setReady(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for _, room := range h.rooms {
		room.mu.Lock()
		if room.Host == c {
			room.HostReady = !room.HostReady
			h.sendToClient(room.Guest, "OPPONENT_READY", room.HostReady)
			h.sendToClient(room.Host, "READY_STATE", room.HostReady)
		} else if room.Guest == c {
			room.GuestReady = !room.GuestReady
			h.sendToClient(room.Host, "OPPONENT_READY", room.GuestReady)
			h.sendToClient(room.Guest, "READY_STATE", room.GuestReady)
		}

		if room.HostReady && room.GuestReady {
			h.sendToClient(room.Host, "GAME_START", nil)
			h.sendToClient(room.Guest, "GAME_START", nil)
		}
		room.mu.Unlock()
	}
}
