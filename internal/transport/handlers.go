package transport

import (
	"FinanceTracker/internal/model"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type ItemService interface {
	List() ([]model.Expense, error)
	Add(amount int, title string) (model.Expense, error)
	Delete(id int) (model.Expense, error)
	Update(id int, amount *int, title *string) (model.Expense, error)
}

type Handler struct {
	svc ItemService // добавляем поле для хранения ссылки на сервис, который будет использоваться для обработки запросов
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

func NewHandler(svc ItemService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRouteres(r *chi.Mux) {
	r.Get("/expenses", h.Expenses)
	r.Post("/expenses", h.PostExpense)
	r.Delete("/expenses/{id}", h.DeleteExpenses)
	r.Patch("/expenses/{id}", h.PatchExpenses)
}

func (h *Handler) Expenses(w http.ResponseWriter, r *http.Request) {
	expenses, err := h.svc.List()
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(expenses); err != nil {
		http.Error(w, "Failed to encode expenses", http.StatusInternalServerError) // error 500
		return
	}
}

func (h *Handler) PostExpense(w http.ResponseWriter, r *http.Request) {
	var NewExp NewExpenseRequest

	if err := json.NewDecoder(r.Body).Decode(&NewExp); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	expense, err := h.svc.Add(NewExp.Amount, NewExp.Title)
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
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, err)
		return
	}

	expense, err := h.svc.Delete(id)
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

	expense, err := h.svc.Update(id, PatchReq.Amount, PatchReq.Title) // здесь без ссылки потому что
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
