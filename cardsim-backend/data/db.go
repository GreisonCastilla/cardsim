package data

import (
	"cardsim-backend/models"
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"os"
	"strconv"
	"strings"

	_ "modernc.org/sqlite"
)

var DB *sql.DB
var Cards []models.Card
var cardsFilePath string

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
	cardsFilePath = filepath
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

	// Apply double-sided relations if the file exists
	relationsPath := strings.Replace(filepath, "cards.json", "double_side_cards.json", 1)
	if _, err := os.Stat(relationsPath); err == nil {
		if err := applyDoubleSidedRelations(relationsPath); err != nil {
			log.Printf("Warning: Failed to apply double-sided relations: %v", err)
		}
	}

	return nil
}

func applyDoubleSidedRelations(relationsPath string) error {
	file, err := os.Open(relationsPath)
	if err != nil {
		return err
	}
	defer file.Close()

	var relations map[string][]string
	if err := json.NewDecoder(file).Decode(&relations); err != nil {
		return err
	}

	// Build undirected graph
	graph := make(map[string]map[string]bool)
	addEdge := func(u, v string) {
		if graph[u] == nil {
			graph[u] = make(map[string]bool)
		}
		if graph[v] == nil {
			graph[v] = make(map[string]bool)
		}
		graph[u][v] = true
		graph[v][u] = true
	}

	for key, related := range relations {
		for _, rel := range related {
			relClean := strings.TrimPrefix(rel, "2=")
			addEdge(key, relClean)
		}
	}

	// Find connected components
	visited := make(map[string]bool)
	var components [][]string

	for node := range graph {
		if !visited[node] {
			var comp []string
			queue := []string{node}
			visited[node] = true
			for len(queue) > 0 {
				curr := queue[0]
				queue = queue[1:]
				comp = append(comp, curr)
				for neighbor := range graph[curr] {
					if !visited[neighbor] {
						visited[neighbor] = true
						queue = append(queue, neighbor)
					}
				}
			}
			components = append(components, comp)
		}
	}

	log.Printf("Found %d connected components for double-sided cards", len(components))

	// Create a map for quick card lookup by name
	cardByName := make(map[string]*models.Card)
	for i := range Cards {
		if Cards[i].NameEn != "" {
			cardByName[Cards[i].NameEn] = &Cards[i]
		}
	}

	modifiedCount := 0
	for _, comp := range components {
		if len(comp) < 2 {
			continue
		}

		// Gather faces for this component
		var faces []models.CardFace
		for _, name := range comp {
			if c, ok := cardByName[name]; ok {
				faces = append(faces, models.CardFace{
					Name:         c.NameEn,
					ImageUrl:     c.ImageUrl,
					Mana:         c.Mana,
					Power:        c.Power,
					Cost:         c.Cost,
					AbilitiesJa:  c.AbilitiesJa,
					AbilitiesEn:  c.AbilitiesEn,
					TypeJa:       c.TypeJa,
					TypeEn:       c.TypeEn,
					RaceJa:       c.RaceJa,
					RaceEn:       c.RaceEn,
					Civilization: c.Civilization,
				})
			}
		}

		// Update each card in the component with all other faces as "Backs"
		for _, name := range comp {
			if c, ok := cardByName[name]; ok {
				var backs []models.CardFace
				for _, face := range faces {
					if face.Name != c.NameEn {
						backs = append(backs, face)
					}
				}
				if len(backs) > 0 {
					c.Backs = backs
					modifiedCount++
				}
			}
		}
	}

	log.Printf("Applied backs to %d cards", modifiedCount)
	return nil
}

func SaveCards() error {
	if cardsFilePath == "" {
		return nil
	}
	data, err := json.MarshalIndent(Cards, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(cardsFilePath, data, 0644)
}

func UpdateCard(updatedCard models.Card, originalName string, originalImage string) error {
	index := -1
	
	log.Printf("Attempting to update card. Original: [%s] [%s], New: [%s]", originalName, originalImage, updatedCard.NameJa)

	// 1. Try matching by original identity if provided
	if originalName != "" {
		for i, card := range Cards {
			// Check both Japanese and English names for the original identity
			nameMatches := card.NameJa == originalName || card.NameEn == originalName
			imageMatches := originalImage == "" || card.ImageUrl == originalImage
			
			if nameMatches && imageMatches {
				index = i
				break
			}
		}
	}

	// 2. Try matching by current name and image
	if index == -1 {
		for i, card := range Cards {
			if card.NameJa == updatedCard.NameJa && card.ImageUrl == updatedCard.ImageUrl {
				index = i
				break
			}
		}
	}

	// 3. Fallback: try matching by current NameJa or NameEn
	if index == -1 {
		for i, card := range Cards {
			if card.NameJa == updatedCard.NameJa || (updatedCard.NameEn != "" && card.NameEn == updatedCard.NameEn) {
				index = i
				break
			}
		}
	}

	if index == -1 {
		log.Printf("Card NOT FOUND for update: %s (Original: %s)", updatedCard.NameJa, originalName)
		return sql.ErrNoRows
	}

	log.Printf("Card found at index %d. Updating and saving...", index)
	Cards[index] = updatedCard
	return SaveCards()
}

func AddCard(card models.Card) error {
	log.Printf("Adding new card: %s", card.NameJa)
	Cards = append(Cards, card)
	return SaveCards()
}

func GetCards() []models.Card {
	return Cards
}

func GetCardsPaginated(search, lang string, page, limit int, civs []string, cardTypes []string, cost, power int, race string, abilities []string, rarity string, setFilter string, doubleSided bool) ([]models.Card, int) {
	var filtered []models.Card
	search = strings.ToLower(search)
	race = strings.ToLower(race)

	for _, card := range Cards {
		match := true

		if doubleSided {
			if len(card.Backs) == 0 {
				match = false
			}
		}

		if !match {
			continue
		}

		// Text Search (Name)
		if search != "" {
			nameMatch := false
			switch lang {
			case "ja":
				nameMatch = strings.Contains(strings.ToLower(card.NameJa), search)
			case "en":
				nameMatch = strings.Contains(strings.ToLower(card.NameEn), search)
			default:
				nameMatch = strings.Contains(strings.ToLower(card.NameJa), search) || 
				            strings.Contains(strings.ToLower(card.NameEn), search)
			}
			if !nameMatch {
				match = false
			}
		}

		// Civilization Filter
		if match && len(civs) > 0 {
			civMatch := false
			cardCivs := strings.Split(card.Civilization, "/")
			for _, c := range civs {
				for _, cc := range cardCivs {
					if strings.EqualFold(c, strings.TrimSpace(cc)) {
						civMatch = true
						break
					}
				}
				if civMatch { break }
			}
			if !civMatch { match = false }
		}

		// Type Filter
		if match && len(cardTypes) > 0 {
			typeMatch := false
			for _, t := range cardTypes {
				if strings.Contains(strings.ToLower(card.TypeEn), strings.ToLower(t)) ||
				   strings.Contains(strings.ToLower(card.TypeJa), strings.ToLower(t)) {
					typeMatch = true
					break
				}
			}
			if !typeMatch { match = false }
		}

		// Cost Filter
		if match && cost != -1 {
			if cardCost, err := strconv.Atoi(card.Cost); err == nil {
				if cardCost != cost { match = false }
			} else if card.Cost != strconv.Itoa(cost) {
				match = false
			}
		}

		// Power Filter
		if match && power != -1 {
			pStr := strings.ReplaceAll(card.Power, "+", "")
			pStr = strings.ReplaceAll(pStr, "-", "")
			if cardPower, err := strconv.Atoi(pStr); err == nil {
				if cardPower != power { match = false }
			} else if card.Power != strconv.Itoa(power) {
				match = false
			}
		}

		// Race Filter
		if match && race != "" {
			if !strings.Contains(strings.ToLower(card.RaceEn), race) &&
			   !strings.Contains(strings.ToLower(card.RaceJa), race) {
				match = false
			}
		}

		// Ability Filter
		if match && len(abilities) > 0 {
			abilityMatch := false
			for _, ab := range abilities {
				if strings.Contains(strings.ToLower(card.AbilitiesEn), strings.ToLower(ab)) ||
				   strings.Contains(strings.ToLower(card.AbilitiesJa), strings.ToLower(ab)) {
					abilityMatch = true
					break
				}
			}
			if !abilityMatch { match = false }
		}

		// Rarity Filter
		if match && rarity != "" {
			if !strings.EqualFold(card.Rarity, rarity) {
				match = false
			}
		}

		// Set Filter
		if match && setFilter != "" {
			if card.PrimarySet != setFilter {
				// check if it's in Sets array too
				inSetsList := false
				for _, s := range card.Sets {
					if s == setFilter {
						inSetsList = true
						break
					}
				}
				if !inSetsList {
					match = false
				}
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

func GetCardsByNames(names []string) map[string]models.Card {
	results := make(map[string]models.Card)
	nameMap := make(map[string]models.Card)

	for _, card := range Cards {
		nameMap[strings.ToLower(card.NameEn)] = card
		nameMap[strings.ToLower(card.NameJa)] = card
	}

	for _, name := range names {
		lower := strings.ToLower(name)
		if card, ok := nameMap[lower]; ok {
			results[lower] = card
		}
	}

	return results
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
	switch err {
	case sql.ErrNoRows:
		_, err = DB.Exec("INSERT INTO decks (user_id, name, main_deck, g_zone, hyperspatial) VALUES (?, ?, ?, ?, ?)",
			deck.UserID, deck.Name, string(main), string(g), string(hyper))
	case nil:
		_, err = DB.Exec("UPDATE decks SET main_deck = ?, g_zone = ?, hyperspatial = ? WHERE id = ?",
			string(main), string(g), string(hyper), existingID)
	}
	return err
}

func DeleteDeck(deckID int, userID int) error {
	_, err := DB.Exec("DELETE FROM decks WHERE id = ? AND user_id = ?", deckID, userID)
	return err
}
