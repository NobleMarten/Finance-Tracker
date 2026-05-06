package config

import (
	"FinanceTracker/internal/model"
	"os"
)

type Config struct {
	DBURL     string
	Host      string
	JWTSecret []byte
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

	return &Config{
		DBURL:     db,
		Host:      host,
		JWTSecret: jwtSecret,
	}, nil
}
