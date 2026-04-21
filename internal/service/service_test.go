package service

import (
	"FinanceTracker/internal/model"
	"context"
	"errors"
	"testing"
	"time"
)

func TestNegativeAmount(t *testing.T) {
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

	_, err := repo.Add(ctx, -100, "Test2")
	if !errors.Is(err, model.ErrNegativeAmount) {
		t.Errorf("Expected error %v, got %v", model.ErrNegativeAmount, err)
	}

}
