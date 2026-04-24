package service

import (
	"FinanceTracker/internal/model"
	"context"
	"errors"
	"testing"
	"time"
)

// func TestNegativeAmount(t *testing.T) {
// 	ctx := context.Background()
// 	repo := ItemService{
// 		repo: &MockRepo{
// 			expenses: []model.Expense{
// 				{
// 					ID:        1,
// 					Amount:    100,
// 					Title:     "Test1",
// 					CreatedAt: time.Now(),
// 				},
// 			},
// 		},
// 	}

// 	_, err := repo.Add(ctx, -100, "Test2")
// 	if !errors.Is(err, model.ErrNegativeAmount) {
// 		t.Errorf("Expected error %v, got %v", model.ErrNegativeAmount, err)
// 	}

// }

// func TestAddSucces(t *testing.T) {
// 	ctx := context.Background()
// 	repo := ItemService{
// 		&MockRepo{
// 			[]model.Expense{},
// 		},
// 	}
// 	expenses, err := repo.Add(ctx, 100, "Test")
// 	if err != nil {
// 		t.Errorf("Expected error %v, got %v", nil, err)
// 	}
// 	if expenses.Amount != 100 {
// 		t.Errorf("Expected amount %v, got %v", 100, expenses.Amount)
// 	}
// 	if expenses.Title != "Test" {
// 		t.Errorf("Expected title %v, got %v", "Test", expenses.Title)
// 	}
// }

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
