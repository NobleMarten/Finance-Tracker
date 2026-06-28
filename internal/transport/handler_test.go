package transport

import (
	"FinanceTracker/internal/model"
	"bytes"
	"context"
	"encoding/json"
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
				req = httptest.NewRequest("POST", "api/expenses", body)
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
			assert.Equal(t, 2, id)
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
