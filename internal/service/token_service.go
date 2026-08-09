package service

import (
	"FinanceTracker/internal/model"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"strings"
)

const ftPrefix = "ft_"

type TokenRepository interface {
	Create(ctx context.Context, userID int, tokenHash []byte, name string) (model.Token, error)
	GetByHash(ctx context.Context, tokenHash []byte) (model.Token, error)
	ListByUser(ctx context.Context, userID int) ([]model.Token, error)
	Revoke(ctx context.Context, userID, tokenID int) error
	TouchLastUsed(ctx context.Context, tokenID int) error
}

type TokenService struct {
	repo TokenRepository
}

func NewTokenService(repo TokenRepository) *TokenService {
	return &TokenService{repo: repo}
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func (t *TokenService) Generate(ctx context.Context, userID int, name string) (string, model.Token, error) {
	name, err := ValidateTitle(name)
	if err != nil {
		return "", model.Token{}, fmt.Errorf("validate name: %w: %w", model.ErrTooLongTitle, err)
	}
	predToken, err := generateToken()
	if err != nil {
		return "", model.Token{}, fmt.Errorf("generate token: %w: %w", model.ErrFailedCreateToken, err)
	}
	plaintext := ftPrefix + predToken
	hash := sha256.Sum256([]byte(plaintext))
	token, err := t.repo.Create(ctx, userID, hash[:], name)
	if err != nil {
		return "", model.Token{}, err
	}
	return plaintext, token, nil
}

func (t *TokenService) Validate(ctx context.Context, plaintext string) (userID int, err error) {
	if !strings.HasPrefix(plaintext, ftPrefix) {
		return 0, model.ErrInvalidToken
	}
	hash := sha256.Sum256([]byte(plaintext))
	token, err := t.repo.GetByHash(ctx, hash[:])
	if errors.Is(err, model.ErrNotFound) {
		return 0, fmt.Errorf("validate token: %w: %w", model.ErrInvalidToken, err)
	}
	if err != nil {
		return 0, err
	}
	if err := t.repo.TouchLastUsed(ctx, token.TokenID); err != nil {
		slog.Warn("touch last_used_at", "error", err, "token_id", token.TokenID)
	}

	return token.UserID, nil
}

func (t *TokenService) List(ctx context.Context, userID int) ([]model.Token, error) {
	return t.repo.ListByUser(ctx, userID)
}

func (t *TokenService) Revoke(ctx context.Context, userID int, tokenID int) error {
	tokenID, err := ValidateID(tokenID)
	if err != nil {
		return err
	}
	return t.repo.Revoke(ctx, userID, tokenID)
}
