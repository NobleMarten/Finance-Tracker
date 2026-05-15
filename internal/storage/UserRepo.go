package storage

import (
	"FinanceTracker/internal/model"
	"context"
	"database/sql"
)

func (p *PostgresRepo) CreateUser(ctx context.Context, login, email, password_hash string) (model.User, error) {
	row := p.DB.QueryRowContext(ctx, "INSERT INTO users(login, email, password_hash) VALUES ($1, $2, $3) RETURNING id, login, email, password_hash, created_at", login, email, password_hash)
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

func (p *PostgresRepo) GetUserByEmail(ctx context.Context, email string) (model.User, error) {
	row := p.DB.QueryRowContext(ctx, "SELECT id, login, email, password_hash, created_at FROM users WHERE email = $1", email)
	var user model.User
	if err := row.Scan(&user.ID, &user.Login, &user.Email, &user.PasswordHash, &user.CreatedAt); err != nil {
		if err == sql.ErrNoRows {
			return model.User{}, model.ErrNotFound
		}
		return model.User{}, err
	}
	return user, nil
}
