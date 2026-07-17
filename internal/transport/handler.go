package transport

import (
	"FinanceTracker/internal/model"
	"FinanceTracker/internal/service"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type ItemService interface {
	List(ctx context.Context, userID int) ([]model.Expense, error)
	Add(ctx context.Context, amount int, title string, userID int) (model.Expense, error)
	Delete(ctx context.Context, id, userID int) (model.Expense, error)
	Update(ctx context.Context, id int, amount *int, title *string, userID int) (model.Expense, error)
	Clear(ctx context.Context, userID int) error
	Summary(ctx context.Context, m, y int, userID int, tz string) (int, error)
	DailyTotal(ctx context.Context, m int, y int, userID int, tz string) ([]model.DailyExpense, error)
	TopExpenses(ctx context.Context, m, y int, limit int, userID int) ([]model.Expense, error)
	AvgPerDay(sum int, lenDaily int) int
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

type ListDailyExpenses struct {
	Items []model.DailyExpense `json:"items"`
	Total int                  `json:"total"`
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

type SummaryResponse struct {
	Sum    int     `json:"sum"`
	SumUSD float64 `json:"sum_usd"`
}

type StatsExpense struct {
	DailyTotals  []model.DailyExpense `json:"daily"`
	TopExp       []model.Expense      `json:"topexp"`
	AvgPerDay    int                  `json:"avgday"`
	CurrentMonth int                  `json:"currentmonth"`
	PrevMonth    int                  `json:"prevmonth"`
}

type RateExpense struct {
	From string  `json:"from"`
	To   string  `json:"to"`
	Rate float64 `json:"rate"`
}

func NewHandler(svc ItemService, exsvc *service.ExchangeService) *Handler {
	return &Handler{svc: svc, exchangeService: exsvc}
}

func (h *Handler) RegisterRouteres(r *chi.Mux, secret []byte) { //*chi.Mux
	r.Group(func(r chi.Router) {
		r.Use(AuthMiddleware(secret))
		r.Use(CSRFMiddleware)
		r.Get("/api/expenses", h.Expenses)
		r.Get("/api/expenses/daily", h.DailyTotal)
		r.Get("/api/expenses/top", h.TopExpenses)
		r.Get("/api/stats", h.Stats)
		r.Get("/api/rate", h.Rate)
		r.Post("/api/expenses", h.PostExpense)
		r.Get("/api/expenses/summary", h.Summary)
		r.Post("/api/expenses/clear", h.Clear)
		r.Delete("/api/expenses/{id}", h.DeleteExpenses)
		r.Patch("/api/expenses/{id}", h.PatchExpenses)
	})
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
		WriteError(w, model.ErrInvalidID)
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
	var monthInt int
	year := r.URL.Query().Get("year")
	month := r.URL.Query().Get("month")
	tz := r.URL.Query().Get("tz")
	if tz == "" {
		tz = "UTC"
	}
	if month != "" {
		var err error
		monthInt, err = strconv.Atoi(month)
		if err != nil {
			WriteError(w, model.ErrInvalidMonth)
			return
		}
	}

	if year == "" {
		year = strconv.Itoa(time.Now().Year())
	}

	yearInt, err := strconv.Atoi(year)
	if err != nil {
		WriteError(w, model.ErrInvalidYear)
		return
	}
	userID := ctx.Value(UsrContext).(int)

	sum, err := h.svc.Summary(ctx, monthInt, yearInt, userID, tz)
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

	res := SummaryResponse{
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

	res := RateExpense{
		From: from,
		To:   to,
		Rate: rate,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(res); err != nil {
		http.Error(w, "Failed to encode rate", http.StatusInternalServerError)
	}
}

func (h *Handler) DailyTotal(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	month := r.URL.Query().Get("month")
	year := r.URL.Query().Get("year")
	tz := r.URL.Query().Get("tz")
	if tz == "" {
		tz = "UTC"
	}
	if month == "" {
		WriteError(w, model.ErrInvalidMonth)
		return
	}
	if year == "" {
		year = strconv.Itoa(time.Now().Year())
	}

	monthInt, err := strconv.Atoi(month)
	if err != nil {
		WriteError(w, model.ErrInvalidMonth)
		return
	}

	yearInt, err := strconv.Atoi(year)
	if err != nil {
		WriteError(w, model.ErrInvalidYear)
		return
	}

	userID := ctx.Value(UsrContext).(int)

	dailyExpense, err := h.svc.DailyTotal(ctx, monthInt, yearInt, userID, tz)
	if err != nil {
		WriteError(w, err)
		return
	}

	listDaily := ListDailyExpenses{
		Items: dailyExpense,
		Total: len(dailyExpense),
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(listDaily); err != nil {
		http.Error(w, "Failed to encode daily total", http.StatusInternalServerError)
	}
}

func (h *Handler) TopExpenses(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	month := r.URL.Query().Get("month")
	year := r.URL.Query().Get("year")
	limit := r.URL.Query().Get("limit")

	userID := ctx.Value(UsrContext).(int)

	if month == "" {
		WriteError(w, model.ErrInvalidMonth)
		return
	}
	if year == "" {
		year = strconv.Itoa(time.Now().Year())
	}
	if limit == "" {
		limit = "3"
	}

	monthInt, err := strconv.Atoi(month)
	if err != nil {
		WriteError(w, model.ErrInvalidMonth)
		return
	}

	yearInt, err := strconv.Atoi(year)
	if err != nil {
		WriteError(w, model.ErrInvalidYear)
		return
	}

	limitInt, err := strconv.Atoi(limit)
	if err != nil {
		WriteError(w, model.ErrInvalidLimit)
		return
	}

	topExpenses, err := h.svc.TopExpenses(ctx, monthInt, yearInt, limitInt, userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-type", "application/json")

	if err := json.NewEncoder(w).Encode(topExpenses); err != nil {
		http.Error(w, "failed to encode top expenses", http.StatusInternalServerError)
	}
}

func (h *Handler) Stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	month := r.URL.Query().Get("month")
	year := r.URL.Query().Get("year")
	limit := r.URL.Query().Get("limit")
	tz := r.URL.Query().Get("tz")

	if tz == "" {
		tz = "UTC"
	}

	userID := ctx.Value(UsrContext).(int)

	if month == "" {
		WriteError(w, model.ErrInvalidMonth)
		return
	}
	if year == "" {
		year = strconv.Itoa(time.Now().Year())
	}
	if limit == "" {
		limit = "3"
	}

	monthInt, err := strconv.Atoi(month)
	if err != nil {
		WriteError(w, model.ErrInvalidMonth)
		return
	}

	yearInt, err := strconv.Atoi(year)
	if err != nil {
		WriteError(w, model.ErrInvalidYear)
		return
	}

	limitInt, err := strconv.Atoi(limit)
	if err != nil {
		WriteError(w, model.ErrInvalidLimit)
		return
	}

	var prevMonthInt, prevYear int
	if monthInt == 1 {
		prevMonthInt = 12
		prevYear = yearInt - 1
	} else {
		prevMonthInt = monthInt - 1
		prevYear = yearInt
	}

	dailyExp, err := h.svc.DailyTotal(ctx, monthInt, yearInt, userID, tz)
	if err != nil {
		WriteError(w, err)
		return
	}
	topExp, err := h.svc.TopExpenses(ctx, monthInt, yearInt, limitInt, userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	sumExp, err := h.svc.Summary(ctx, monthInt, yearInt, userID, tz)
	if err != nil {
		WriteError(w, err)
		return
	}

	prevsum, err := h.svc.Summary(ctx, prevMonthInt, prevYear, userID, tz)
	if err != nil {
		WriteError(w, err)
		return
	}

	avgExp := h.svc.AvgPerDay(sumExp, len(dailyExp))

	StatsResp := StatsExpense{
		DailyTotals:  dailyExp,
		TopExp:       topExp,
		AvgPerDay:    avgExp,
		CurrentMonth: sumExp,
		PrevMonth:    prevsum,
	}

	w.Header().Set("Content-type", "application/json")

	if err := json.NewEncoder(w).Encode(StatsResp); err != nil {
		http.Error(w, "failed to encode stats", http.StatusInternalServerError)
	}
}
