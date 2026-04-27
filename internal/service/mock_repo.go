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
	for i, exp := range m.expenses {
		if exp.ID == id {
			m.expenses = append(m.expenses[:i], m.expenses[i+1:]...)
			return exp, nil
		}
	}
	return model.Expense{}, model.ErrNotFound
}

func (m *MockRepo) Clear(ctx context.Context) error {
	m.expenses = []model.Expense{}
	return nil
}

func (m *MockRepo) Update(ctx context.Context, id int, amount *int, title *string) (model.Expense, error) {
	for i, exp := range m.expenses {
		if exp.ID == id {
			if amount != nil {
				if *amount == 0 {
					return model.Expense{}, model.ErrZeroAmount
				}
				if *amount < 0 {
					return model.Expense{}, model.ErrNegativeAmount
				}
				exp.Amount = *amount
			}
			if title != nil {
				exp.Title = *title
			}
			m.expenses[i] = exp
			return exp, nil
		}
	}
	return model.Expense{}, model.ErrNotFound
}

func (m *MockRepo) Summary(ctx context.Context, mo int) (int, error) {
	if mo == 0 {
		var sum int
		for _, exp := range m.expenses {
			sum += exp.Amount
		}
		return sum, nil
	} else {
		var sum int
		for _, exp := range m.expenses {
			if exp.CreatedAt.Month() == time.Month(mo) {
				sum += exp.Amount
			}
		}
		return sum, nil
	}
}
