package service

import (
	"FinanceTracker/internal/model"
	"context"
	"errors"
	"testing"
	"time"
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
			repo := ItemService{
				repo: &MockRepo{
					expenses: []model.Expense{
						{
							ID:        1,
							Amount:    100,
							Title:     "Test1",
							CreatedAt: time.Now(),
						},
					},
				},
			}
			expenses, err := repo.Add(ctx, tt.amount, tt.title)
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("Expected error %v, got %v", tt.wantErr, err)
			}
			if tt.wantErr == nil {
				if expenses.Amount != 100 || expenses.Title != "Test" {
					t.Errorf("Expected amount %v, got %v", 100, expenses.Amount)
					t.Errorf("Expected title %v, got %v", "Test", expenses.Title)
				}
			}
		})
	}
}

func TestDelete(t *testing.T) {
	tests := []struct {
		name    string
		title   string
		amount  int
		id      int
		wantErr error
	}{
		{"succes", "Test1", 1000, 1, nil},
		{"invalid id", "Test2", 200, -2, model.ErrInvalidID},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			repo := ItemService{
				repo: &MockRepo{
					expenses: []model.Expense{
						{
							ID:        1,
							Amount:    1000,
							Title:     "Test1",
							CreatedAt: time.Now(),
						}, {
							ID:        2,
							Amount:    100,
							Title:     "Test2",
							CreatedAt: time.Now(),
						},
					},
				},
			}

			expense, err := repo.Delete(ctx, tt.id)
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("expected id %d, got %d", expense.ID, tt.id)
			}
			if tt.wantErr == nil {
				if tt.title != expense.Title || tt.amount != expense.Amount || tt.id != expense.ID {
					t.Errorf("Expected amount %d, got %d", tt.amount, expense.Amount)
					t.Errorf("Expected title %q, got %q", tt.title, expense.Title)
					t.Errorf("expected id %d, got %d", tt.id, expense.ID)
				}
			}

		})
	}

}

func TestUpdate(t *testing.T) {
	tests := []struct {
		name    string
		id      int
		amount  int
		title   string
		wantErr error
	}{
		{"succes", 1, 100, "Test", nil},
		{"invalid id", -1, 100, "Test", model.ErrInvalidID},
		{"negative amount", 2, -100, "Test", model.ErrNegativeAmount},
		{"too long title", 1, 100, "TestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTestttttttTesttttttttrddfg", model.ErrTooLongTitle},
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
						},
					},
				},
			}

			expense, err := repo.Update(ctx, tt.id, &tt.amount, &tt.title)
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("Expected error %v, got %v", tt.wantErr, err)
			}
			if tt.wantErr == nil {
				if tt.title != expense.Title || tt.amount != expense.Amount || tt.id != expense.ID {
					t.Errorf("Expected amount %d, got %d", tt.amount, expense.Amount)
					t.Errorf("Expected title %q, got %q", tt.title, expense.Title)
					t.Errorf("Expected id %d, got %d", tt.id, expense.ID)
				}
			}
		})
	}
}
