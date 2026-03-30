package db

import (
	"FinanceTracker/internal/storage"
	"database/sql"
)

func NewPostgresRepo(connstr string) (*storage.PostgresRepo, error) {
	DB, err := sql.Open("pgx", connstr)
	if err != nil {
		return nil, err
	}

	if err := DB.Ping(); err != nil {
		return nil, err
	}

	return &storage.PostgresRepo{DB: DB}, nil // возвращаем указатель на структуру, чтобы методы могли изменять состояние базы данных
}
