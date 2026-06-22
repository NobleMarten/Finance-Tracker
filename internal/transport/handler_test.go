package transport

import (
	"FinanceTracker/internal/model"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

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
