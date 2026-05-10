package server

import (
	"cardsim-backend/data"
	"cardsim-backend/models"
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func RegisterRoutes(hub *Hub) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/cards", handleGetCards)
	mux.HandleFunc("/api/cards/update", handleUpdateCard)
	mux.HandleFunc("/api/cards/add", handleAddCard)
	mux.HandleFunc("/api/cards/by-names", handleGetCardsByNames)
	mux.HandleFunc("/api/auth/register", handleRegister)
	mux.HandleFunc("/api/auth/login", handleLogin)
	mux.HandleFunc("/api/auth/google", handleGoogleLogin)
	
	// Protected Deck Routes
	mux.Handle("/api/decks", withAuth(http.HandlerFunc(handleDecks)))

	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		ServeWs(hub, w, r)
	})

	return withCORS(mux)
}

func withAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing Authorization Header", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid Token", http.StatusUnauthorized)
			return
		}

		// Set context with user info
		ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func handleDecks(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("user_id").(int)
	if !ok {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if r.Method == http.MethodGet {
		decks, err := data.GetDecks(userID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(decks)
		return
	}

	if r.Method == http.MethodPost {
		var deck models.Deck
		if err := json.NewDecoder(r.Body).Decode(&deck); err != nil {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}
		deck.UserID = userID
		err := data.SaveDeck(deck)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method == http.MethodDelete {
		deckIDStr := r.URL.Query().Get("id")
		deckID, err := strconv.Atoi(deckIDStr)
		if err != nil {
			http.Error(w, "Invalid Deck ID", http.StatusBadRequest)
			return
		}
		
		err = data.DeleteDeck(deckID, userID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}

	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow any origin for development; for production, specify the client URL.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func handleGetCards(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	q := query.Get("q")
	lang := query.Get("lang")
	pageStr := query.Get("page")
	limitStr := query.Get("limit")

	civs := query["civ"] // multiple ?civ=Fire&civ=Nature
	cardTypes := query["type"]
	costStr := query.Get("cost")
	powerStr := query.Get("power")
	race := query.Get("race")
	abilities := query["ability"]
	rarity := query.Get("rarity")

	page, _ := strconv.Atoi(pageStr)
	if page <= 0 { page = 1 }

	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 { limit = 20 }

	cost := -1
	if costStr != "" {
		cost, _ = strconv.Atoi(costStr)
	}

	power := -1
	if powerStr != "" {
		power, _ = strconv.Atoi(powerStr)
	}

	setFilter := query.Get("set")
	doubleSided := query.Get("doubleSided") == "true"

	cards, total := data.GetCardsPaginated(q, lang, page, limit, civs, cardTypes, cost, power, race, abilities, rarity, setFilter, doubleSided)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"cards": cards,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func handleGetCardsByNames(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Names []string `json:"names"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	cards := data.GetCardsByNames(request.Names)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cards)
}

func handleUpdateCard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Card          models.Card `json:"card"`
		OriginalName  string      `json:"original_name"`
		OriginalImage string      `json:"original_image"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Bad Request: Expected wrap with 'card' field", http.StatusBadRequest)
		return
	}

	if err := data.UpdateCard(request.Card, request.OriginalName, request.OriginalImage); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleAddCard(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var card models.Card
	if err := json.NewDecoder(r.Body).Decode(&card); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if err := data.AddCard(card); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
