package service

import (
	"FinanceTracker/internal/model"
	"context"
	"time"
)

type MockRepo struct {
	expenses []model.Expense
}

func (m *MockRepo) Add(ctx context.Context, amount int, title string, userID int) (model.Expense, error) {

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

func (m *MockRepo) List(ctx context.Context, userID int) ([]model.Expense, error) {
	return m.expenses, nil
}

func (m *MockRepo) Delete(ctx context.Context, id int, userID int) (model.Expense, error) {
	for i, exp := range m.expenses {
		if exp.ID == id && (exp.UserID == nil || *exp.UserID == userID) {
			m.expenses = append(m.expenses[:i], m.expenses[i+1:]...)
			return exp, nil
		}
	}
	return model.Expense{}, model.ErrNotFound
}

func (m *MockRepo) Clear(ctx context.Context, userID int) error {
	filteredExpenses := []model.Expense{}
	for _, exp := range m.expenses {
		if exp.UserID == nil || *exp.UserID != userID {
			filteredExpenses = append(filteredExpenses, exp)
		}
	}
	m.expenses = filteredExpenses
	return nil
}

func (m *MockRepo) Update(ctx context.Context, id int, amount *int, title *string, userID int) (model.Expense, error) {
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

func (m *MockRepo) Summary(ctx context.Context, mo int, userID int) (int, error) {
	if mo == 0 {
		var sum int
		for _, exp := range m.expenses {
			if exp.UserID != nil && *exp.UserID != userID {
				continue
			}
			sum += exp.Amount
		}
		return sum, nil
	} else {
		var sum int
		for _, exp := range m.expenses {
			if exp.CreatedAt.Month() == time.Month(mo) && (exp.UserID == nil || *exp.UserID == userID) {
				sum += exp.Amount
			}
		}
		return sum, nil
	}
}

func (m *MockRepo) DailyTotal(ctx context.Context, mo int, y int, userID int) ([]model.DailyExpense, error) {
	var DailyExpenses []model.DailyExpense
	for _, exp := range m.expenses {
		if exp.CreatedAt.Month() == time.Month(mo) && (exp.UserID == nil || *exp.UserID == userID) {
			DailyExpenses = append(DailyExpenses, model.DailyExpense{
				Date:   "",
				Amount: exp.Amount,
			})
		}
	}
	return DailyExpenses, nil
}

func (m *MockRepo) TopExpenses(ctx context.Context, mo, y int, limit int, userID int) ([]model.Expense, error) {
	return nil, nil
}
