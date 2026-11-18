package transport

import (
	"FinanceTracker/internal/model"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type ItemService interface {
	DailyRange(ctx context.Context, from, to time.Time, userID int, tz string) ([]model.DailyAggregate, error)
	Analytics(ctx context.Context, month, year, userID int, tz string) (model.Analytics, error)
	FilteredExpenses(ctx context.Context, userID, limit int, cursor *model.Cursor, filter model.ExpenseFilter) (model.ResultPaginate, error)

	List(ctx context.Context, userID int) ([]model.Expense, error)
	Add(ctx context.Context, amount int, title string, userID int, spentAt *time.Time) (model.Expense, error)
	Delete(ctx context.Context, id, userID int) (model.Expense, error)
	Update(ctx context.Context, id int, amount *int, title *string, userID int, spent_at *time.Time) (model.Expense, error)
	Clear(ctx context.Context, userID int) error
	Summary(ctx context.Context, from, to time.Time, userID int) (int, error)
	DailyTotal(ctx context.Context, m int, y int, userID int, tz string) ([]model.DailyExpense, error)
	TopExpenses(ctx context.Context, m, y int, limit int, userID int, tz string) ([]model.Expense, error)
	AvgPerDay(sum int, lenDaily int) int
	Paginate(ctx context.Context, userID int, limit int, cursor *model.Cursor) (res model.ResultPaginate, err error)
}

type ExchangeService interface {
	GetRate(ctx context.Context, from, to string) (float64, error)
}

type TokenValidator interface {
	Validate(ctx context.Context, plaintext string) (int, error)
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
	Amount  int        `json:"amount"`
	Title   string     `json:"title"`
	SpentAt *time.Time `json:"spent_at"`
}

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type PatchResponse struct {
	Amount  *int       `json:"amount"`
	Title   *string    `json:"title"`
	SpentAt *time.Time `json:"spent_at"`
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

func NewHandler(svc ItemService, cache ExchangeService) *Handler {
	return &Handler{svc: svc, exchangeService: cache}
}

func (h *Handler) RegisterRouteres(r *chi.Mux, secret []byte, tokens TokenValidator) { //*chi.Mux
	r.Group(func(r chi.Router) {
		r.Use(AuthMiddleware(secret, tokens))
		r.Use(CSRFMiddleware)
		r.Get("/api/expenses", h.Paginate)
		r.Get("/api/expenses/daily", h.DailyTotal)
		r.Get("/api/expenses/top", h.TopExpenses)
		r.Get("/api/stats", h.Stats)
		r.Get("/api/analytics", h.Analytics)
		r.Get("/api/rate", h.Rate)
		r.Post("/api/expenses", h.PostExpense)
		r.Get("/api/expenses/summary", h.Summary)
		r.Post("/api/expenses/clear", h.Clear)
		r.Delete("/api/expenses/{id}", h.DeleteExpenses)
		r.Patch("/api/expenses/{id}", h.PatchExpenses)

		// Принимает и Bearer, и куку — в отличие от /api/v1/tokens,
		// которые закрыты от токенов через RejectBearerAuth.
		r.Post("/api/v1/quick-add", h.QuickAdd)
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
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	userID := ctx.Value(UsrContext).(int)
	expense, err := h.svc.Add(ctx, NewExp.Amount, NewExp.Title, userID, NewExp.SpentAt)
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

	expense, err := h.svc.Update(ctx, id, PatchReq.Amount, PatchReq.Title, userID, PatchReq.SpentAt) // здесь без ссылки потому что
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
	from, err := time.Parse(time.RFC3339Nano, r.URL.Query().Get("from"))
	if err != nil {
		WriteError(w, model.ErrInvalidDateRange)
		return
	}
	to, err := time.Parse(time.RFC3339Nano, r.URL.Query().Get("to"))
	if err != nil || !from.Before(to) {
		WriteError(w, model.ErrInvalidDateRange)
		return
	}
	userID := ctx.Value(UsrContext).(int)
	sum, err := h.svc.Summary(ctx, from, to, userID)
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
	if r.URL.Query().Has("from") || r.URL.Query().Has("to") {
		from, err := time.Parse(time.RFC3339Nano, r.URL.Query().Get("from"))
		if err != nil {
			WriteError(w, model.ErrInvalidDateRange)
			return
		}
		to, err := time.Parse(time.RFC3339Nano, r.URL.Query().Get("to"))
		if err != nil {
			WriteError(w, model.ErrInvalidDateRange)
			return
		}
		userID := ctx.Value(UsrContext).(int)
		days, err := h.svc.DailyRange(ctx, from, to, userID, tz)
		if err != nil {
			WriteError(w, err)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(days); err != nil {
			log.Printf("encode daily aggregates: %v", err)
		}
		return
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

	topExpenses, err := h.svc.TopExpenses(ctx, monthInt, yearInt, limitInt, userID, tz)
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

	if monthInt < 1 || monthInt > 12 {
		WriteError(w, model.ErrInvalidMonth)
		return
	}
	if yearInt < 1 || yearInt > 9999 {
		WriteError(w, model.ErrInvalidYear)
		return
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		WriteError(w, model.ErrInvalidTimezone)
		return
	}
	from := time.Date(yearInt, time.Month(monthInt), 1, 0, 0, 0, 0, loc)
	to := from.AddDate(0, 1, 0)
	previousFrom := from.AddDate(0, -1, 0)

	dailyExp, err := h.svc.DailyTotal(ctx, monthInt, yearInt, userID, tz)
	if err != nil {
		WriteError(w, err)
		return
	}
	topExp, err := h.svc.TopExpenses(ctx, monthInt, yearInt, limitInt, userID, tz)
	if err != nil {
		WriteError(w, err)
		return
	}

	sumExp, err := h.svc.Summary(ctx, from, to, userID)
	if err != nil {
		WriteError(w, err)
		return
	}

	prevsum, err := h.svc.Summary(ctx, previousFrom, from, userID)
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

func (h *Handler) Paginate(w http.ResponseWriter, r *http.Request) {
	var res model.ResultPaginate
	var limit, cursorIDInt int
	var cursorSpentAtTime time.Time
	var cursor *model.Cursor
	ctx := r.Context()
	userID := ctx.Value(UsrContext).(int)

	if rawlimit := r.URL.Query().Get("limit"); rawlimit != "" {
		parsed, err := strconv.Atoi(rawlimit)
		if err != nil {
			WriteError(w, model.ErrInvalidLimit)
			return
		}
		limit = parsed
	}

	cursorID := r.URL.Query().Get("cursor_id")
	cursorSpentAt := r.URL.Query().Get("cursor_spent_at")

	if cursorID == "" && cursorSpentAt == "" {
		cursor = nil
	} else {
		if cursorID == "" || cursorSpentAt == "" {
			WriteError(w, model.ErrInvalidCursor)
			return
		}
		if cursorID != "" {
			parsedCursor, err := strconv.Atoi(cursorID)
			if err != nil || parsedCursor <= 0 {
				WriteError(w, model.ErrInvalidID)
				return
			}
			cursorIDInt = parsedCursor
		}

		if cursorSpentAt := r.URL.Query().Get("cursor_spent_at"); cursorSpentAt != "" {
			parsed, err := time.Parse(time.RFC3339Nano, cursorSpentAt)
			if err != nil {
				WriteError(w, model.ErrInvalidSpentAt)
				return
			}
			cursorSpentAtTime = parsed
		}

		cursor = &model.Cursor{
			ID:      cursorIDInt,
			SpentAt: cursorSpentAtTime,
		}
	}

	query := r.URL.Query()
	var filter model.ExpenseFilter
	if query.Has("from") || query.Has("to") {
		from, err := time.Parse(time.RFC3339Nano, query.Get("from"))
		if err != nil {
			WriteError(w, model.ErrInvalidDateRange)
			return
		}
		to, err := time.Parse(time.RFC3339Nano, query.Get("to"))
		if err != nil || !from.Before(to) {
			WriteError(w, model.ErrInvalidDateRange)
			return
		}
		filter.From, filter.To = from, to
	}
	if query.Has("title") {
		title := query.Get("title")
		filter.Title = &title
	}
	if query.Has("min_amount") {
		amount, err := strconv.Atoi(query.Get("min_amount"))
		if err != nil || amount < 0 {
			WriteError(w, model.ErrInvalidAmountFilter)
			return
		}
		filter.MinAmount = &amount
	}
	var err error
	if !filter.From.IsZero() || filter.Title != nil || filter.MinAmount != nil {
		res, err = h.svc.FilteredExpenses(ctx, userID, limit, cursor, filter)
	} else {
		res, err = h.svc.Paginate(ctx, userID, limit, cursor)
	}
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(res); err != nil {
		http.Error(w, "Failed to encode expenses", http.StatusInternalServerError)
		return
	}
}

// Analytics returns bounded, complete aggregates independently of expense pages.
func (h *Handler) Analytics(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	month, err := strconv.Atoi(query.Get("month"))
	if err != nil {
		WriteError(w, model.ErrInvalidMonth)
		return
	}
	year, err := strconv.Atoi(query.Get("year"))
	if err != nil {
		WriteError(w, model.ErrInvalidYear)
		return
	}
	tz := query.Get("tz")
	if tz == "" {
		tz = "UTC"
	}
	userID := r.Context().Value(UsrContext).(int)
	result, err := h.svc.Analytics(r.Context(), month, year, userID, tz)
	if err != nil {
		WriteError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		log.Printf("encode analytics: %v", err)
	}
}
