package transport

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
)

type UserService interface {
	CreateUser(ctx context.Context, login, email, password string) (string, error)
	Login(ctx context.Context, email, password string) (string, error)
}

type UserHandler struct {
	usvc UserService
}

func NewUserHandler(usvc UserService) *UserHandler {
	return &UserHandler{usvc: usvc}
}

func (u *UserHandler) RegisterHandler(r *chi.Mux) {
	r.Post("/register", u.Register)
	r.Post("/login", u.Login)
}

type RegisterRequest struct {
	Login    string `json:"login"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (u *UserHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	ctx := r.Context()

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, err)
		return
	}

	token, err := u.usvc.CreateUser(ctx, req.Login, req.Email, req.Password)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(token); err != nil {
		WriteError(w, err)
		return
	}
}

const authPrefix = "Bearer "

type contextKey struct{}

var UsrContext = contextKey{}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, authPrefix) {
			http.Error(w, "Missing or invalid Authorization header", http.StatusUnauthorized)
			return
		}

		secretKey := os.Getenv("JWT_SECRET")

		tokenStr := strings.TrimPrefix(authHeader, authPrefix)

		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return secretKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		cl := token.Claims.(jwt.MapClaims)["user_id"]

		ctx := context.WithValue(r.Context(), UsrContext, cl)
		next.ServeHTTP(w, r.WithContext(ctx))

	})
}

func (u *UserHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	ctx := r.Context()

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, err)
		return
	}

	token, err := u.usvc.Login(ctx, req.Email, req.Password)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(token); err != nil {
		http.Error(w, "Failed to encode token", http.StatusInternalServerError)
		return
	}
}
