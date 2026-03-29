package data

import (
	"cardsim-backend/models"
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"os"
	"strings"

	_ "modernc.org/sqlite"
)

var DB *sql.DB
var Cards []models.Card

func InitDB(filepath string) {
	var err error
	DB, err = sql.Open("sqlite", filepath)
	if err != nil {
		log.Fatalf("Failed to open db: %v", err)
	}

	createTables()
}

func createTables() {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE,
		email TEXT UNIQUE,
		password_hash TEXT,
		google_id TEXT
	);
	CREATE TABLE IF NOT EXISTS decks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		name TEXT,
		main_deck TEXT,
		g_zone TEXT,
		hyperspatial TEXT,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`
	_, err := DB.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create tables: %v", err)
	}
}

func LoadCards(filepath string) error {
	file, err := os.Open(filepath)
	if err != nil {
		return err
	}
	defer file.Close()

	bytes, err := io.ReadAll(file)
	if err != nil {
		return err
	}

	err = json.Unmarshal(bytes, &Cards)
	if err != nil {
		return err
	}

	log.Printf("Loaded %d cards from JSON", len(Cards))
	return nil
}

func GetCards() []models.Card {
	return Cards
}

func GetCardsPaginated(search, lang string, page, limit int) ([]models.Card, int) {
	var filtered []models.Card
	search = strings.ToLower(search)
	for _, card := range Cards {
		match := false
		if search == "" {
			match = true
		} else {
			if lang == "ja" {
				match = strings.Contains(strings.ToLower(card.NameJa), search)
			} else if lang == "en" {
				match = strings.Contains(strings.ToLower(card.NameEn), search)
			} else {
				match = strings.Contains(strings.ToLower(card.NameJa), search) || 
				        strings.Contains(strings.ToLower(card.NameEn), search)
			}
		}
		
		if match {
			filtered = append(filtered, card)
		}
	}

	total := len(filtered)
	if limit <= 0 {
		return filtered, total
	}

	start := (page - 1) * limit
	if start >= total {
		return []models.Card{}, total
	}

	end := start + limit
	if end > total {
		end = total
	}

	return filtered[start:end], total
}

func GetDecks(userID int) ([]models.Deck, error) {
	rows, err := DB.Query("SELECT id, user_id, name, main_deck, g_zone, hyperspatial FROM decks WHERE user_id = ?", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var decks []models.Deck
	for rows.Next() {
		var d models.Deck
		var main, g, hyper sql.NullString
		if err := rows.Scan(&d.ID, &d.UserID, &d.Name, &main, &g, &hyper); err != nil {
			log.Printf("Scan error: %v", err)
			return nil, err
		}
		if main.Valid {
			json.Unmarshal([]byte(main.String), &d.MainDeck)
		} else {
			d.MainDeck = []interface{}{}
		}
		
		if g.Valid {
			json.Unmarshal([]byte(g.String), &d.GZone)
		} else {
			d.GZone = []interface{}{}
		}

		if hyper.Valid {
			json.Unmarshal([]byte(hyper.String), &d.HyperspatialZone)
		} else {
			d.HyperspatialZone = []interface{}{}
		}
		
		decks = append(decks, d)
	}
	return decks, nil
}

func SaveDeck(deck models.Deck) error {
	main, _ := json.Marshal(deck.MainDeck)
	g, _ := json.Marshal(deck.GZone)
	hyper, _ := json.Marshal(deck.HyperspatialZone)

	// Check if exists
	var existingID int
	err := DB.QueryRow("SELECT id FROM decks WHERE user_id = ? AND name = ?", deck.UserID, deck.Name).Scan(&existingID)
	if err == sql.ErrNoRows {
		_, err = DB.Exec("INSERT INTO decks (user_id, name, main_deck, g_zone, hyperspatial) VALUES (?, ?, ?, ?, ?)",
			deck.UserID, deck.Name, string(main), string(g), string(hyper))
	} else if err == nil {
		_, err = DB.Exec("UPDATE decks SET main_deck = ?, g_zone = ?, hyperspatial = ? WHERE id = ?",
			string(main), string(g), string(hyper), existingID)
	}
	return err
}

func DeleteDeck(deckID int, userID int) error {
	_, err := DB.Exec("DELETE FROM decks WHERE id = ? AND user_id = ?", deckID, userID)
	return err
}
