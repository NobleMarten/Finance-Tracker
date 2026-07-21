package service

import (
	"FinanceTracker/internal/model"
	"context"
	"log/slog"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type UserRepo interface {
	CreateUser(ctx context.Context, login, email, passwordHash string) (model.User, error)
	GetUserByEmail(ctx context.Context, email string) (model.User, error)
}

type UserService struct {
	repoUser  UserRepo
	jwtSecret []byte
}

func NewUserService(repoUser UserRepo, jwtSecret []byte) *UserService {
	return &UserService{repoUser: repoUser, jwtSecret: jwtSecret}
}

func (u *UserService) CreateUser(ctx context.Context, login, email, password string) (string, error) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	users, err := u.repoUser.CreateUser(ctx, login, email, string(passwordHash))
	if err != nil {
		return "", err
	}

	token, err := u.CreateJWT(ctx, users.ID)
	if err != nil {
		return "", err
	}

	return token, nil
}

func (u *UserService) GetUserByEmail(ctx context.Context, email string) (model.User, error) {
	user, err := u.repoUser.GetUserByEmail(ctx, email)
	if err != nil {
		return model.User{}, err
	}
	return user, nil
}

func (u *UserService) Login(ctx context.Context, email, password string) (string, error) {
	user, err := u.repoUser.GetUserByEmail(ctx, email)
	if err != nil {
		slog.Error("GetUserEmail failed", "error", err)
		return "", model.ErrNotFound
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", model.ErrIncorrectPassword
	}

	token, err := u.CreateJWT(ctx, user.ID)
	if err != nil {
		return "", model.ErrInternal
	}
	return token, nil
}

const SessionTime = 30 * 24 * 60 * 60

func (u *UserService) CreateJWT(ctx context.Context, userID int) (string, error) {
	claims := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(SessionTime * time.Second).Unix(),
	})

	token, err := claims.SignedString(u.jwtSecret)
	if err != nil {
		return "", err
	}

	return token, nil
}
