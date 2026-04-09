package config

import (
	"FinanceTracker/internal/model"
	"os"
)

type Config struct {
	DBURL string
	Host  string
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

	return &Config{
		DBURL: db,
		Host:  host,
	}, nil
}
