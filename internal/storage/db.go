package storage

import "database/sql"

type PostgresRepo struct {
	DB *sql.DB
}

func NewPostgresUserRepo(DB *sql.DB) (*PostgresRepo, error) {
	return &PostgresRepo{DB: DB}, nil
}

func NewPostgresRepo(DB *sql.DB) (*PostgresRepo, error) {
	return &PostgresRepo{DB: DB}, nil
}
