package service

import (
	"FinanceTracker/internal/model"
	"context"
	"time"
)

type MockRepo struct {
	expenses []model.Expense
}

func (m *MockRepo) Add(ctx context.Context, amount int, title string) (model.Expense, error) {

	var maxID int

	for _, exp := range m.expenses {
		if exp.ID > maxID {
			maxID = exp.ID
		}
	}

	time_n := time.Now()

	expense := model.Expense{
		ID:        maxID + 1,
		Title:     title,
		Amount:    amount,
		CreatedAt: time_n,
	}

	m.expenses = append(m.expenses, expense)

	return expense, nil
}

func (m *MockRepo) List(ctx context.Context) ([]model.Expense, error) {
	return m.expenses, nil
}

func (m *MockRepo) Delete(ctx context.Context, id int) (model.Expense, error) {
	return model.Expense{}, nil
}

func (m *MockRepo) Clear(ctx context.Context) error {
	return nil
}

func (m *MockRepo) Update(ctx context.Context, id int, amount *int, title *string) (model.Expense, error) {
	return model.Expense{}, nil
}

func (m *MockRepo) Summary(ctx context.Context, mo int) (int, error) {
	return 0, nil
}
