package transport

import (
	"FinanceTracker/internal/service"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"

	"net/http"
	"strings"

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
	r.Post("/api/register", u.Register)
	r.Post("/api/login", u.Login)
	r.Post("/api/logout", u.Logout)
	r.Post("/api/auth/forgot-password", u.ForgotPassword)
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

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

func generateCSRFToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func buildAuthCookie(value string, maxAge int) *http.Cookie {
	return &http.Cookie{
		Name:     "token",
		Value:    value,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   maxAge,
		Path:     "/",
	}
}

func buildCSRFCookie(value string, maxAge int) *http.Cookie {
	return &http.Cookie{
		Name:     "csrf_token",
		Value:    value,
		HttpOnly: false,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   maxAge,
		Path:     "/",
	}
}

func SetAuthCookie(w http.ResponseWriter, token string) error {
	tokenCSRF, err := generateCSRFToken()
	if err != nil {
		return err
	}

	cookie := buildAuthCookie(token, service.SessionTime)
	cookieCSRF := buildCSRFCookie(tokenCSRF, service.SessionTime)

	http.SetCookie(w, cookie)
	http.SetCookie(w, cookieCSRF)
	return nil
}

func (u *UserHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	email := strings.TrimSpace(req.Email)
	if email != "" {
		slog.Info("password reset requested (stub, mailer not configured)", "email", email)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(map[string]bool{"ok": true, "accepted": true}); err != nil {
		slog.Error("forgot-password encode", "error", err)
	}
}

func (u *UserHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	ctx := r.Context()

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, err)
		slog.Error("Failed to decode request body", "error", err)
		return
	}

	token, err := u.usvc.CreateUser(ctx, req.Login, req.Email, req.Password)
	if err != nil {
		WriteError(w, err)
		slog.Error("Failed to create user", "error", err)
		return
	}

	if err := SetAuthCookie(w, token); err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
}

type contextKey struct{}

var UsrContext = contextKey{}

func (u *UserHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	ctx := r.Context()

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, err)
		slog.Error("Failed to decode request", "error", err)
		return
	}

	token, err := u.usvc.Login(ctx, req.Email, req.Password)
	if err != nil {
		WriteError(w, err)
		slog.Error("Failed to login user", "error", err)
		return
	}

	if err := SetAuthCookie(w, token); err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
}

func (u *UserHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie := buildAuthCookie("", -1)
	cookieCSRF := buildCSRFCookie("", -1)

	http.SetCookie(w, cookie)
	http.SetCookie(w, cookieCSRF)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
}
