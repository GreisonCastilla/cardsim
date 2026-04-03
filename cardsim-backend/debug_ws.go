package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var jwtKey = []byte("cardsim_secret_key_change_in_production")

func makeToken(id int, user string) string {
	expirationTime := time.Now().Add(1 * time.Hour)
	type Claims struct {
		UserID   int    `json:"user_id"`
		Username string `json:"username"`
		jwt.RegisteredClaims
	}
	claims := &Claims{
		UserID:   id,
		Username: user,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := token.SignedString(jwtKey)
	return s
}

func main() {
	// Connect A
	tokA := makeToken(1, "Player A")
	uA := url.URL{Scheme: "ws", Host: "localhost:8080", Path: "/ws", RawQuery: "token=" + tokA}
	cA, _, err := websocket.DefaultDialer.Dial(uA.String(), nil)
	if err != nil {
		log.Fatal("dial A:", err)
	}
	defer cA.Close()

	go func() {
		for {
			_, msg, err := cA.ReadMessage()
			if err != nil { return }
			fmt.Println("A received:", string(msg))
		}
	}()

	time.Sleep(200 * time.Millisecond)

	// A creates room
	createMsg := map[string]interface{}{
		"type": "CREATE_ROOM",
		"payload": map[string]interface{}{
			"name":     "Test Room A",
			"password": "",
		},
	}
	cA.WriteJSON(createMsg)

	time.Sleep(200 * time.Millisecond)

	// Connect B
	tokB := makeToken(2, "Player B")
	uB := url.URL{Scheme: "ws", Host: "localhost:8080", Path: "/ws", RawQuery: "token=" + tokB}
	cB, _, err := websocket.DefaultDialer.Dial(uB.String(), nil)
	if err != nil {
		log.Fatal("dial B:", err)
	}
	defer cB.Close()

	// Read what B receives upon connection!
	for i := 0; i < 2; i++ {
		_, msg, err := cB.ReadMessage()
		if err != nil { break }
		fmt.Println("B received:", string(msg))
	}
}
