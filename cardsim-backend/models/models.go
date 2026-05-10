package models

type CardFace struct {
	Name         string `json:"name,omitempty"`
	ImageUrl     string `json:"image_url,omitempty"`
	Mana         string `json:"mana,omitempty"`
	Power        string `json:"power,omitempty"`
	Cost         string `json:"cost,omitempty"`
	AbilitiesJa  string `json:"abilities_ja,omitempty"`
	AbilitiesEn  string `json:"abilities_en,omitempty"`
	TypeJa       string `json:"type_ja,omitempty"`
	TypeEn       string `json:"type_en,omitempty"`
	RaceJa       string `json:"race_ja,omitempty"`
	RaceEn       string `json:"race_en,omitempty"`
	Civilization string `json:"civilization,omitempty"`
	HyperPower   string `json:"hyper_power,omitempty"`
}

type Card struct {
	NameJa       string     `json:"name_ja"`
	NameEn       string     `json:"name_en"`
	ImageUrl     string     `json:"image_url"`
	Civilization string     `json:"civilization"`
	Mana         string     `json:"mana"`
	Power        string     `json:"power"`
	Cost         string     `json:"cost"`
	AbilitiesJa  string     `json:"abilities_ja"`
	AbilitiesEn  string     `json:"abilities_en"`
	TypeJa       string     `json:"type_ja"`
	TypeEn       string     `json:"type_en"`
	RaceJa       string     `json:"race_ja"`
	RaceEn       string     `json:"race_en"`
	Illustrator  string     `json:"illustrator"`
	Rarity       string     `json:"rarity"`
	Sets         []string   `json:"sets"`
	PrimarySet   string     `json:"primary_set"`
	SetId        int        `json:"set_id"`
	SourceUrl    string     `json:"source_url"`
	HyperPower   string     `json:"hyper_power"`
	Backs        []CardFace `json:"backs,omitempty"`
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
