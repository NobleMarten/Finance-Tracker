package storage

import (
	"FinanceTracker/internal/model"
	"context"
	"database/sql"
)

type PostgresUserRepo struct {
	DB *sql.DB
}

func NewPostgresUserRepo(connstr string) (*PostgresUserRepo, error) {
	DB, err := sql.Open("pgx", connstr)
	if err != nil {
		return nil, err
	}
	return &PostgresUserRepo{DB: DB}, nil
}

func (p *PostgresUserRepo) CreateUser(ctx context.Context, login, email, password_hash string) (model.User, error) {
	row := p.DB.QueryRowContext(ctx, "INSERT INTO users(login, email, passwordHash) VALUES ($1, $2, $3) RETURNING id, login, email, passwordHash, created_at", login, email, password_hash)
	var user model.User
	if err := row.Scan(&user.ID, &user.Login, &user.Email, &user.PasswordHash, &user.CreatedAt); err != nil {
		if err == sql.ErrNoRows {
			return model.User{}, model.ErrUserExists
		} else {
			return model.User{}, err
		}
	}
	return user, nil
}

func (p *PostgresUserRepo) GetUserByEmail(ctx context.Context, email string) (model.User, error) {
	row := p.DB.QueryRowContext(ctx, "SELECT id, login, email, passwordHash, created_at FROM users WHERE email = $1", email)
	var user model.User
	if err := row.Scan(&user.ID, &user.Login, &user.Email, &user.PasswordHash, &user.CreatedAt); err != nil {
		if err == sql.ErrNoRows {
			return model.User{}, model.ErrNotFound
		}
		return model.User{}, err
	}
	return user, nil
}
