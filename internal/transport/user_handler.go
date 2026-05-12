package transport

import (
	"context"
	"encoding/json"

	"net/http"

	"github.com/go-chi/chi/v5"
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
