package transport

import (
	"FinanceTracker/internal/model"
	"FinanceTracker/internal/service"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type ItemService interface {
	List(ctx context.Context, userID int) ([]model.Expense, error)
	Add(ctx context.Context, amount int, title string, userID int) (model.Expense, error)
	Delete(ctx context.Context, id, userID int) (model.Expense, error)
	Update(ctx context.Context, id int, amount *int, title *string, userID int) (model.Expense, error)
	Clear(ctx context.Context, userID int) error
	Summary(ctx context.Context, m int, userID int) (int, error)
}

type ExchangeService interface {
	GetRate(ctx context.Context, from, to string) (float64, error)
}

type Handler struct {
	svc             ItemService
	exchangeService ExchangeService
}

type ListExpense struct {
	Items []model.Expense `json:"items"`
	Total int             `json:"total"`
}

type NewExpenseRequest struct {
	Amount int    `json:"amount"`
	Title  string `json:"title"`
}

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type PatchResponse struct {
	Amount *int    `json:"amount"`
	Title  *string `json:"title"`
}

type SummaryRequest struct {
	Month int `json:"month"`
}

func NewHandler(svc ItemService, exsvc *service.ExchangeService) *Handler {
	return &Handler{svc: svc, exchangeService: exsvc}
}

func (h *Handler) RegisterRouteres(r *chi.Mux) { //*chi.Mux
	r.Group(func(r chi.Router) {
		r.Use(AuthMiddleware)
		r.Get("/api/expenses", h.Expenses)
		r.Post("/api/expenses", h.PostExpense)
		r.Get("/api/expenses/summary", h.Summary)
		r.Post("/api/expenses/clear", h.Clear)
		r.Delete("/api/expenses/{id}", h.DeleteExpenses)
		r.Patch("/api/expenses/{id}", h.PatchExpenses)
	})

	r.Get("/api/rate", h.Rate)
}

func (h *Handler) Expenses(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context() // берем контекст для передачи в сервис
	userID := ctx.Value(UsrContext).(int)

	expenses, err := h.svc.List(ctx, userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	list := ListExpense{
		Items: expenses,
		Total: len(expenses),
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(list); err != nil {
		http.Error(w, "Failed to encode expenses", http.StatusInternalServerError) // error 500
		return
	}
}

func (h *Handler) PostExpense(w http.ResponseWriter, r *http.Request) {
	var NewExp NewExpenseRequest
	ctx := r.Context()

	if err := json.NewDecoder(r.Body).Decode(&NewExp); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	userID := ctx.Value(UsrContext).(int)
	expense, err := h.svc.Add(ctx, NewExp.Amount, NewExp.Title, userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(expense); err != nil {
		http.Error(w, "Failed to encode expenses", http.StatusInternalServerError) // error 500
		return
	}

}

func (h *Handler) DeleteExpenses(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, err)
		return
	}

	userID := ctx.Value(UsrContext).(int)
	expense, err := h.svc.Delete(ctx, id, userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(expense); err != nil {
		http.Error(w, "Failed to encode expenses", http.StatusInternalServerError) // error 500
		return
	}
}

func (h *Handler) PatchExpenses(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, err)
		return
	}

	var PatchReq PatchResponse

	if err := json.NewDecoder(r.Body).Decode(&PatchReq); err != nil {
		WriteError(w, err)
		return
	}

	userID := ctx.Value(UsrContext).(int)

	expense, err := h.svc.Update(ctx, id, PatchReq.Amount, PatchReq.Title, userID) // здесь без ссылки потому что
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(expense); err != nil {
		http.Error(w, "Failed to encode expenses", http.StatusInternalServerError)
		return
	}
}

func (h *Handler) Clear(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := ctx.Value(UsrContext).(int)
	err := h.svc.Clear(ctx, userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(nil); err != nil {
		http.Error(w, "Failed to encode expenses", http.StatusInternalServerError)
		return
	}
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var SumReq SummaryRequest

	if err := json.NewDecoder(r.Body).Decode(&SumReq); err != nil {
		log.Println(err)
		WriteError(w, err)
		return
	}

	userID := ctx.Value(UsrContext).(int)

	sum, err := h.svc.Summary(ctx, SumReq.Month, userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	rate, err := h.exchangeService.GetRate(ctx, "RUB", "USD")
	if err != nil {
		log.Println(err)
		WriteError(w, err)
		return
	}

	res := struct {
		Sum    int     `json:"sum"`
		SumUSD float64 `json:"sum_usd"`
	}{
		Sum:    sum,
		SumUSD: rate * float64(sum),
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(res); err != nil {
		log.Println(err)
		http.Error(w, "Failed to encode expenses", http.StatusInternalServerError)
		return
	}
}

func (h *Handler) Rate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	from := r.URL.Query().Get("from")
	if from == "" {
		from = "RUB"
	}
	to := r.URL.Query().Get("to")
	if to == "" {
		to = "USD"
	}

	rate, err := h.exchangeService.GetRate(ctx, from, to)
	if err != nil {
		log.Println("exchange rate error:", err)
		WriteError(w, err)
		return
	}

	res := struct {
		From string  `json:"from"`
		To   string  `json:"to"`
		Rate float64 `json:"rate"`
	}{
		From: from,
		To:   to,
		Rate: rate,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(res); err != nil {
		http.Error(w, "Failed to encode rate", http.StatusInternalServerError)
	}
}
