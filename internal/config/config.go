package config

import (
	"FinanceTracker/internal/model"
	"os"
	"strings"
)

type Config struct {
	DBURL          string
	Host           string
	JWTSecret      []byte
	AllowedOrigins []string
}

func NewConfig() (*Config, error) {
	db := os.Getenv("DBURL")
	if db == "" {
		return nil, model.ErrEmptyDBURL
	}

	host := os.Getenv("HOST")
	if host == "" {
		host = "localhost:8080"
	}

	jwtSecret := []byte(os.Getenv("JWT_SECRET"))
	if len(jwtSecret) == 0 {
		return nil, model.ErrEmptyJWTSecret
	}

	allowedOrigins := strings.Split((strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))), ",")
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}
	if allowedOrigins[0] == "" {
		return nil, model.ErrEmptyAllowedOrigins
	}

	return &Config{
		DBURL:          db,
		Host:           host,
		JWTSecret:      jwtSecret,
		AllowedOrigins: allowedOrigins,
	}, nil
}
