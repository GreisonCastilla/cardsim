package models

type Card struct {
	NameJa      string `json:"name_ja"`
	NameEn      string `json:"name_en"`
	ImageUrl    string `json:"image_url"`
	Mana        string `json:"mana"`
	Power       string `json:"power"`
	Cost        string `json:"cost"`
	AbilitiesJa string `json:"abilities_ja"`
	AbilitiesEn string `json:"abilities_en"`
	TypeJa      string `json:"type_ja"`
	TypeEn      string `json:"type_en"`
	RaceJa      string `json:"race_ja"`
	RaceEn      string `json:"race_en"`
	SourceUrl   string `json:"source_url"`
}

type User struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"` // Don't expose password
	GoogleID     string `json:"google_id,omitempty"`
}

type Deck struct {
	ID               int           `json:"id"`
	UserID           int           `json:"user_id"`
	Name             string        `json:"name"`
	MainDeck         []interface{} `json:"main_deck"`
	GZone            []interface{} `json:"g_zone"`
	HyperspatialZone []interface{} `json:"hyperspatial"`
}
