package main

import (
	"cardsim-backend/data"
	"cardsim-backend/server"
	"log"
	"net/http"
)

func main() {
	// Initialize DB
	data.InitDB("cardsim.db")
	
	// Load Cards JSON
	cardsPath := "cards.json" // Located inside backend directory
	if err := data.LoadCards(cardsPath); err != nil {
		log.Printf("Warning: Failed to load cards.json: %v", err)
	}

	hub := server.NewHub()
	go hub.Run()

	mux := server.RegisterRoutes(hub)

	log.Println("Server starting on :8080...")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
