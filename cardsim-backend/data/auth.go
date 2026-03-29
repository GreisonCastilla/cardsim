package data

import (
	"cardsim-backend/models"
	"database/sql"
	"errors"
	"golang.org/x/crypto/bcrypt"
)

func RegisterUser(username, email, password string) (*models.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	result, err := DB.Exec("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", username, email, string(hash))
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.User{
		ID:       int(id),
		Username: username,
		Email:    email,
	}, nil
}

func LoginUser(username, password string) (*models.User, error) {
	var user models.User
	var hash string

	err := DB.QueryRow("SELECT id, username, email, password_hash FROM users WHERE username = ?", username).Scan(&user.ID, &user.Username, &user.Email, &hash)
	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	} else if err != nil {
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	return &user, nil
}

func GetOrCreateUserByEmail(email string, name string) (*models.User, error) {
	var user models.User
	var hash string
	err := DB.QueryRow("SELECT id, username, email, password_hash FROM users WHERE email = ?", email).Scan(&user.ID, &user.Username, &user.Email, &hash)
	
	if err == sql.ErrNoRows {
		// Create new user if they don't exist
		// Google users won't have a traditional password
		return RegisterUser(name, email, "google_oauth_no_pass")
	} else if err != nil {
		return nil, err
	}

	return &user, nil
}
