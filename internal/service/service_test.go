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
			expense, err := repo.Add(ctx, tt.amount, tt.title, userID)
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

			expense, err := repo.Update(ctx, tt.id, tt.amount, tt.title, userID)
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
	tests := []struct {
		name     string
		month    int
		wantErr  error
		wantSum  int
		mockdata []model.Expense
	}{
		{"succes", 4, nil, 300,
			[]model.Expense{
				{
					ID:        1,
					Amount:    100,
					Title:     "Test1",
					CreatedAt: time.Date(2026, 4, 27, 0, 0, 0, 0, time.UTC),
				},
				{
					ID:        3,
					Amount:    200,
					Title:     "Test2",
					CreatedAt: time.Date(2026, 4, 27, 0, 0, 0, 0, time.UTC),
				},
			},
		},
		{"invalid month", 13, model.ErrInvalidMonth, 0, nil},
		{"zero month", 0, nil, 100,
			[]model.Expense{
				{
					ID:        3,
					Amount:    100,
					Title:     "Test3",
					CreatedAt: time.Date(2026, 4, 27, 0, 0, 0, 0, time.UTC),
				},
			},
		},
		{"negative month", -1, model.ErrInvalidMonth, 0, nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			repo := ItemService{
				repo: &MockRepo{
					expenses: tt.mockdata,
				},
			}
			userID := 1
			y := 2026
			tz := ""

			sum, err := repo.Summary(ctx, tt.month, y, userID, tz)
			assert.ErrorIs(t, err, tt.wantErr)
			if tt.wantErr == nil {
				assert.Equal(t, tt.wantSum, sum)
			}
		})
	}
}
