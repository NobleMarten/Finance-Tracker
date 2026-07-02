package transport

import (
	"FinanceTracker/internal/model"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
)

func TestExpenses(t *testing.T) {
	tests := []struct {
		name       string
		listFunc   func(ctx context.Context, userID int) ([]model.Expense, error)
		wantStatus int
		wantErr    bool
	}{
		{"succes", func(ctx context.Context, userID int) ([]model.Expense, error) {
			return []model.Expense{
				{ID: 1, Title: "Coffee", Amount: 150, CreatedAt: time.Date(2026, 6, 18, 0, 0, 0, 0, time.UTC), UserID: nil},
				{ID: 2, Title: "Lunch", Amount: 500, CreatedAt: time.Date(2026, 6, 18, 0, 0, 0, 0, time.UTC), UserID: nil}}, nil
		}, 200, false},
		{"failed list exp", func(ctx context.Context, userID int) ([]model.Expense, error) {
			return []model.Expense{
				{ID: 1, Title: "Coffee", Amount: -15, CreatedAt: time.Date(2026, 6, 18, 0, 0, 0, 0, time.UTC), UserID: nil}}, model.ErrNegativeAmount
		}, 400, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got ListExpense
			h := &Handler{svc: &MockService{ListFunc: tt.listFunc}}
			req := httptest.NewRequest("GET", "/api/expenses", nil)
			ctx := context.WithValue(req.Context(), UsrContext, 1)
			req = req.WithContext(ctx)
			rec := httptest.NewRecorder()
			h.Expenses(rec, req)
			if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
				t.Fatalf("failed to decode response body: %v", err)
			}
			if !tt.wantErr {
				assert.Equal(t, 2, got.Total)
				assert.Equal(t, "Coffee", got.Items[0].Title)
			}
			assert.Equal(t, tt.wantStatus, rec.Code)
		})
	}
}

func TestPostExp(t *testing.T) {
	tests := []struct {
		name       string
		body       NewExpenseRequest
		addfunc    func(ctx context.Context, amount int, title string, userID int) (model.Expense, error)
		wantStatus int
		wantErr    bool
		rawBody    string
	}{
		{"succes", NewExpenseRequest{Title: "Coffee", Amount: 150}, func(ctx context.Context, amount int, title string, userID int) (model.Expense, error) {
			return model.Expense{ID: 1, Title: "Coffee", Amount: 150, CreatedAt: time.Date(2026, 6, 18, 0, 0, 0, 0, time.UTC), UserID: nil}, nil
		},
			201, false, ""},
		{"TooLongTitle", NewExpenseRequest{Title: "TestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTesttttttttrddfg", Amount: 150}, func(ctx context.Context, amount int, title string, userID int) (model.Expense, error) {
			return model.Expense{}, model.ErrTooLongTitle
		},
			400, true, ""},
		{"failed to decode", NewExpenseRequest{Title: "Coffee", Amount: 150}, func(ctx context.Context, amount int, title string, userID int) (model.Expense, error) {
			return model.Expense{}, model.ErrTooLongTitle
		},
			500, true, "{не json"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got model.Expense
			var buf bytes.Buffer
			var req *http.Request
			if tt.rawBody != "" {
				body := bytes.NewBufferString(tt.rawBody)
				req = httptest.NewRequest("POST", "/api/expenses", body)
			} else {
				if err := json.NewEncoder(&buf).Encode(tt.body); err != nil {
					t.Fatal("failed to Encode", err)
				}
				req = httptest.NewRequest("POST", "/api/expenses", &buf)
			}
			h := &Handler{svc: &MockService{AddFunc: tt.addfunc}}
			rec := httptest.NewRecorder()
			ctx := context.WithValue(req.Context(), UsrContext, 1)
			req = req.WithContext(ctx)
			h.PostExpense(rec, req)

			if !tt.wantErr {
				if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
					t.Fatalf("failed to decode response body: %v", err)
				}
				assert.Equal(t, tt.body.Title, got.Title)
				assert.Equal(t, tt.body.Amount, got.Amount)
			}
			assert.Equal(t, tt.wantStatus, rec.Code)

		})
	}
}

func TestDeleteExp(t *testing.T) {
	tests := []struct {
		name       string
		deleteFunc func(ctx context.Context, id, userID int) (model.Expense, error)
		wantStatus int
		wantErr    bool
		id         string
	}{
		{"success", func(ctx context.Context, id, userID int) (model.Expense, error) {
			assert.Equal(t, 1, id)
			return model.Expense{
				ID: 1, Title: "Coffee", Amount: 150, CreatedAt: time.Date(2026, 6, 18, 0, 0, 0, 0, time.UTC), UserID: nil}, nil
		}, 200, false, "1"},
		{"failed to find id 999", func(ctx context.Context, id, userID int) (model.Expense, error) {
			assert.Equal(t, 999, id)
			return model.Expense{
				ID: 999, Title: "Coffee", Amount: 150, CreatedAt: time.Date(2026, 6, 18, 0, 0, 0, 0, time.UTC), UserID: nil}, model.ErrNotFound
		}, 404, true, "999"},
		{"failed to find id abc", func(ctx context.Context, id, userID int) (model.Expense, error) {
			return model.Expense{
				ID: 2, Title: "Coffee", Amount: 150, CreatedAt: time.Date(2026, 6, 18, 0, 0, 0, 0, time.UTC), UserID: nil}, nil
		}, 400, true, "abc"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got model.Expense
			h := &Handler{svc: &MockService{DeleteFunc: tt.deleteFunc}}
			req := httptest.NewRequest("DELETE", "/api/expenses/{id}", nil)
			rec := httptest.NewRecorder()
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", tt.id)
			ctx := context.WithValue(req.Context(), UsrContext, 1)
			req = req.WithContext(context.WithValue(ctx, chi.RouteCtxKey, rctx))
			h.DeleteExpenses(rec, req)

			if !tt.wantErr {
				if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
					t.Fatalf("failed to decode response body: %v", err)
				}
				assert.Equal(t, 1, got.ID)
			}
			assert.Equal(t, tt.wantStatus, rec.Code)
		})
	}
}

func ptr[T any](v T) *T {
	return &v
}

func TestPatchExp(t *testing.T) {
	tests := []struct {
		name       string
		body       PatchResponse
		wantStatus int
		wantErr    bool
		rawBody    string
		id         string
		wantExp    model.Expense
		wantErrVal error
	}{
		{"succes1", PatchResponse{Title: ptr("Coffee"), Amount: ptr(150)},
			200, false, "", "1", model.Expense{ID: 1, Title: "Coffee", Amount: 150, CreatedAt: time.Date(2026, 6, 18, 0, 0, 0, 0, time.UTC), UserID: nil}, nil},
		{"succes2", PatchResponse{Title: ptr("Coffee")},
			200, false, "", "1", model.Expense{ID: 1, Title: "Coffee", Amount: 0, CreatedAt: time.Date(2026, 6, 18, 0, 0, 0, 0, time.UTC), UserID: nil}, nil},
		{"TooLongTitle", PatchResponse{Title: ptr("TestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTesttttttttrddfg"), Amount: ptr(150)},
			400, true, "", "2", model.Expense{}, model.ErrTooLongTitle},
		{"failed to decode", PatchResponse{Title: ptr("Coffee"), Amount: ptr(150)},
			500, true, "{не json", "3", model.Expense{}, nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got model.Expense
			var req *http.Request
			var buf bytes.Buffer

			if tt.rawBody != "" {
				body := bytes.NewBufferString(tt.rawBody)
				req = httptest.NewRequest("PATCH", "/api/expenses/{id}", body)
			} else {
				if err := json.NewEncoder(&buf).Encode(tt.body); err != nil {
					t.Fatal("failed to Encode", err)
				}
				req = httptest.NewRequest("PATCH", "/api/expenses/{id}", &buf)
			}

			h := &Handler{svc: &MockService{UpdateFunc: func(ctx context.Context, id int, amount *int, title *string, userID int) (model.Expense, error) {
				return tt.wantExp, tt.wantErrVal
			}}}
			rec := httptest.NewRecorder()
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("id", tt.id)
			ctx := context.WithValue(req.Context(), UsrContext, 1)
			req = req.WithContext(context.WithValue(ctx, chi.RouteCtxKey, rctx))
			h.PatchExpenses(rec, req)

			if !tt.wantErr {
				if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
					t.Fatalf("failed to decode response body: %v", err)
				}
				assert.Equal(t, tt.wantExp.Title, got.Title)
				assert.Equal(t, tt.wantExp.Amount, got.Amount)

			}
			assert.Equal(t, tt.wantStatus, rec.Code)
		})
	}
}

func TestClearExp(t *testing.T) {
	tests := []struct {
		name       string
		clearFunc  func(ctx context.Context, userID int) error
		wantStatus int
		wantErr    bool
	}{
		{"succes", func(ctx context.Context, userID int) error { return nil }, 200, false},
		{"db error", func(ctx context.Context, userID int) error { return model.ErrDBDown }, 500, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := &Handler{svc: &MockService{ClearFunc: tt.clearFunc}}
			req := httptest.NewRequest("POST", "/api/expenses/clear", nil)
			rec := httptest.NewRecorder()
			ctx := context.WithValue(req.Context(), UsrContext, 1)
			req = req.WithContext(ctx)
			h.Clear(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code)
		})
	}
}

func TestSummary(t *testing.T) {
	tests := []struct {
		name        string
		query       string
		wantSum     int
		wantUSD     float64
		summaryFunc func(ctx context.Context, m, y int, userID int, tz string) (int, error)
		wantStatus  int
		wantErr     bool
		errValRate  error
		returnRate  float64
	}{
		{"succes", "?month=6&year=2026", 1000, 10, func(ctx context.Context, m, y int, userID int, tz string) (int, error) {
			return 1000, nil
		}, 200, false, nil, 0.01},
		{"invalid month", "?month=abc&year=2026", 0, 0, func(ctx context.Context, m, y int, userID int, tz string) (int, error) {
			return 1000, model.ErrInvalidMonth
		}, 400, true, nil, 0.01},
		{"api down", "?month=6&year=2026", 0, 0, func(ctx context.Context, m, y int, userID int, tz string) (int, error) {
			return 1000, nil
		}, 500, true, errors.New("api down"), 0.01},
		{"summary err", "?month=6&year=2026", 0, 0, func(ctx context.Context, m, y int, userID int, tz string) (int, error) {
			return 0, model.ErrSomething
		}, 500, true, nil, 0.01},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var res SummaryResponse
			var rateCalled bool
			h := &Handler{svc: &MockService{SummaryFunc: tt.summaryFunc}, exchangeService: &MockExchange{GetRateFunc: func(ctx context.Context, from, to string) (float64, error) {
				rateCalled = true
				return tt.returnRate, tt.errValRate
			}}}
			rec := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/api/summary"+tt.query, nil)
			ctx := context.WithValue(req.Context(), UsrContext, 1)
			req = req.WithContext(ctx)
			h.Summary(rec, req)

			if !tt.wantErr {
				if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
					t.Fatalf("failed to decode response body: %v", err)
				}
				assert.Equal(t, tt.wantSum, res.Sum)
				assert.InDelta(t, tt.wantUSD, res.SumUSD, 0.001)
			}
			assert.Equal(t, tt.wantStatus, rec.Code)
			if tt.name == "summary err" {
				assert.False(t, rateCalled)
			}
		})
	}
}
