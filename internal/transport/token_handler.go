package transport

import (
	"FinanceTracker/internal/model"
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

// TokenService — то, что нужно этим хендлерам от сервиса, и ничего сверх.
// Validate сюда не попал намеренно: им пользуется middleware, а не CRUD.
type TokenService interface {
	Generate(ctx context.Context, userID int, name string) (string, model.Token, error)
	List(ctx context.Context, userID int) ([]model.Token, error)
	Revoke(ctx context.Context, userID, tokenID int) error
}

type TokenHandler struct {
	tsvc TokenService
}

func NewTokenHandler(tsvc TokenService) *TokenHandler {
	return &TokenHandler{tsvc: tsvc}
}

type CreateTokenRequest struct {
	Name string `json:"name"`
}

// CreateTokenResponse — единственное место во всём API, где plaintext покидает
// сервер. Повторно его взять неоткуда: в базе лежит только SHA-256.
type CreateTokenResponse struct {
	Token     string    `json:"token"`
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type ListTokens struct {
	Items []model.Token `json:"items"`
	Total int           `json:"total"`
}

// RejectBearerAuth закрывает управление токенами от самих токенов.
//
// Иначе утёкший токен позволял бы выпустить себе новый и отозвать настоящие —
// то есть один украденный ключ превращался бы в постоянный доступ, переживающий
// любую попытку его отозвать. Управлять ключами можно только из браузерной
// сессии, где есть пароль и CSRF-защита.
//
// Стоит первым в цепочке: смысла проверять токен, который всё равно не будет
// принят, нет.
func RejectBearerAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isBearer(r) {
			WriteError(w, model.ErrTokenAuthNotAllowed)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (t *TokenHandler) RegisterHandler(r *chi.Mux, secret []byte, tokens TokenValidator) {
	r.Group(func(r chi.Router) {
		r.Use(RejectBearerAuth)
		r.Use(AuthMiddleware(secret, tokens))
		r.Use(CSRFMiddleware)

		r.Post("/api/v1/tokens", t.Create)
		r.Get("/api/v1/tokens", t.List)
		r.Delete("/api/v1/tokens/{id}", t.Revoke)
	})
}

func (t *TokenHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req CreateTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Обязательность поля — вопрос формы запроса, поэтому проверяется здесь.
	// Ограничение длины живёт в сервисе, рядом с остальными правилами.
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		http.Error(w, "field name is required", http.StatusBadRequest)
		return
	}

	userID := ctx.Value(UsrContext).(int)
	plaintext, token, err := t.tsvc.Generate(ctx, userID, req.Name)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(CreateTokenResponse{
		Token:     plaintext,
		ID:        token.TokenID,
		Name:      token.Name,
		CreatedAt: token.CreatedAt,
	}); err != nil {
		http.Error(w, "Failed to encode token", http.StatusInternalServerError)
		return
	}
}

func (t *TokenHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value(UsrContext).(int)

	tokens, err := t.tsvc.List(ctx, userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	list := ListTokens{
		Items: tokens,
		Total: len(tokens),
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(list); err != nil {
		http.Error(w, "Failed to encode tokens", http.StatusInternalServerError)
		return
	}
}

func (t *TokenHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, model.ErrInvalidID)
		return
	}

	userID := ctx.Value(UsrContext).(int)
	if err := t.tsvc.Revoke(ctx, userID, id); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent) //204
}
