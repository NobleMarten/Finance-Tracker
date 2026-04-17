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
	List(ctx context.Context) ([]model.Expense, error)
	Add(ctx context.Context, amount int, title string) (model.Expense, error)
	Delete(ctx context.Context, id int) (model.Expense, error)
	Update(ctx context.Context, id int, amount *int, title *string) (model.Expense, error)
	Clear(ctx context.Context) error
	Summary(ctx context.Context, m int) (int, error)
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
	r.Get("/expenses", h.Expenses)
	r.Post("/expenses", h.PostExpense)
	r.Get("/expenses/summary", h.Summary)
	r.Post("/expenses/clear", h.Clear)
	r.Delete("/expenses/{id}", h.DeleteExpenses)
	r.Patch("/expenses/{id}", h.PatchExpenses)
	r.Get("/rate", h.Rate)
}

func MyCors(next http.Handler) http.Handler { // middleware для CORS чтобы фронтенд мог обращаться к бэкенду
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) Expenses(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context() // берем контекст для передачи в сервис

	expenses, err := h.svc.List(ctx)
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

	expense, err := h.svc.Add(ctx, NewExp.Amount, NewExp.Title)
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

	expense, err := h.svc.Delete(ctx, id)
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

	expense, err := h.svc.Update(ctx, id, PatchReq.Amount, PatchReq.Title) // здесь без ссылки потому что
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
	err := h.svc.Clear(ctx)
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

	sum, err := h.svc.Summary(ctx, SumReq.Month)
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
