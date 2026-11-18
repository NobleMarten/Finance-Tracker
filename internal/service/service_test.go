package service

import (
	"FinanceTracker/internal/model"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestAdd(t *testing.T) {
	tests := []struct {
		name    string
		amount  int
		title   string
		wantErr error
	}{
		{"succes", 100, "Test", nil},
		{"negative", -100, "", model.ErrNegativeAmount},
		{"zero", 0, "Test", model.ErrZeroAmount},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			userID := 1
			repo := ItemService{
				repo: &MockRepo{
					expenses: []model.Expense{
						{
							ID:        1,
							Amount:    100,
							Title:     "Test1",
							CreatedAt: time.Date(2026, 4, 27, 0, 0, 0, 0, time.UTC),
							UserID:    nil,
						},
					},
				},
			}
			var spentAt *time.Time
			expense, err := repo.Add(ctx, tt.amount, tt.title, userID, spentAt)
			assert.ErrorIs(t, err, tt.wantErr)
			if tt.wantErr == nil {
				assert.Equal(t, tt.amount, expense.Amount)
				assert.Equal(t, tt.title, expense.Title)
			}
		})
	}
}

func TestDelete(t *testing.T) {
	tests := []struct {
		name     string
		title    string
		amount   int
		id       int
		wantErr  error
		mockdata []model.Expense
	}{
		{"succes", "Test1", 1000, 1, nil,
			[]model.Expense{
				{
					ID:        1,
					Amount:    1000,
					Title:     "Test1",
					CreatedAt: time.Now(),
				},
			},
		},

		{"invalid id", "Test2", 200, -2, model.ErrInvalidID,
			[]model.Expense{
				{
					ID:        2,
					Amount:    100,
					Title:     "Test2",
					CreatedAt: time.Now(),
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			userID := 1
			repo := ItemService{
				repo: &MockRepo{
					expenses: tt.mockdata,
				},
			}

			expense, err := repo.Delete(ctx, tt.id, userID)
			assert.ErrorIs(t, err, tt.wantErr)
			if tt.wantErr == nil {
				assert.Equal(t, tt.title, expense.Title)
				assert.Equal(t, tt.amount, expense.Amount)
				assert.Equal(t, tt.id, expense.ID)
			}

		})
	}

}

func ptr[T any](v T) *T {
	return &v
}

func TestUpdate(t *testing.T) {
	tests := []struct {
		name    string
		id      int
		amount  *int
		title   *string
		wantErr error
	}{
		{"succes", 1, ptr(100), ptr("Test"), nil},
		{"invalid id", -1, ptr(100), ptr("Test"), model.ErrInvalidID},
		{"negative amount", 2, ptr(-100), ptr("Test"), model.ErrNegativeAmount},
		{"too long title", 1, ptr(100), ptr("TestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTesttttttttrddfg"), model.ErrTooLongTitle},
		{"zero amount", 1, ptr(0), ptr("Test"), model.ErrZeroAmount},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			repo := ItemService{
				repo: &MockRepo{
					expenses: []model.Expense{
						{
							ID:        1,
							Amount:    100,
							Title:     "Test1",
							CreatedAt: time.Now(),
							UserID:    nil,
						},
					},
				},
			}
			userID := 1
			var spentAt *time.Time

			expense, err := repo.Update(ctx, tt.id, tt.amount, tt.title, userID, spentAt)
			assert.ErrorIs(t, err, tt.wantErr)
			if tt.wantErr == nil {
				assert.Equal(t, *tt.title, expense.Title)
				assert.Equal(t, *tt.amount, expense.Amount)
				assert.Equal(t, tt.id, expense.ID)
			}
		})
	}
}

func TestSummary(t *testing.T) {
	from := time.Date(2026, 1, 1, 0, 0, 0, 0, time.FixedZone("MSK", 3*60*60))
	to := from.AddDate(1, 0, 0)
	userID, otherID := 1, 2
	expenses := []model.Expense{
		{Amount: 100, UserID: &userID, SpentAt: from},
		{Amount: 200, UserID: &userID, SpentAt: to.Add(-time.Microsecond)},
		{Amount: 400, UserID: &userID, SpentAt: from.Add(-time.Microsecond)},
		{Amount: 800, UserID: &userID, SpentAt: to},
		{Amount: 1600, UserID: &otherID, SpentAt: from},
	}
	tests := []struct {
		name     string
		from, to time.Time
		wantSum  int
		wantErr  error
	}{
		{"year boundaries and user isolation", from, to, 300, nil},
		{"following year", to, to.AddDate(1, 0, 0), 800, nil},
		{"no expenses", to.AddDate(1, 0, 0), to.AddDate(2, 0, 0), 0, nil},
		{"equal boundaries", from, from, 0, model.ErrInvalidDateRange},
		{"reversed boundaries", to, from, 0, model.ErrInvalidDateRange},
		{"missing boundary", time.Time{}, to, 0, model.ErrInvalidDateRange},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewItemService(&MockRepo{expenses: expenses})
			got, err := svc.Summary(context.Background(), tt.from, tt.to, userID)
			assert.ErrorIs(t, err, tt.wantErr)
			assert.Equal(t, tt.wantSum, got)
		})
	}
}
