package service

import (
	"FinanceTracker/internal/model"
	"context"
	"time"
)

type MockRepo struct {
	DailyRangeFunc       func(ctx context.Context, from, to time.Time, userID int, tz string) ([]model.DailyAggregate, error)
	AnalyticsFunc        func(ctx context.Context, month, year, userID int, tz string) (model.Analytics, error)
	FilteredExpensesFunc func(ctx context.Context, userID, limit int, cursor *model.Cursor, filter model.ExpenseFilter) (model.ResultPaginate, error)
	expenses             []model.Expense
}

func (m *MockRepo) Add(ctx context.Context, amount int, title string, userID int, spentAt *time.Time) (model.Expense, error) {

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

func (m *MockRepo) Update(ctx context.Context, id int, amount *int, title *string, userID int, spentAt *time.Time) (model.Expense, error) {
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

func (m *MockRepo) Summary(ctx context.Context, from, to time.Time, userID int) (int, error) {
	var sum int
	for _, exp := range m.expenses {
		if exp.UserID != nil && *exp.UserID == userID && !exp.SpentAt.Before(from) && exp.SpentAt.Before(to) {
			sum += exp.Amount
		}
	}
	return sum, nil
}

func (m *MockRepo) DailyTotal(ctx context.Context, mo int, y int, userID int, tz string) ([]model.DailyExpense, error) {
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

func (m *MockRepo) TopExpenses(ctx context.Context, mo, y int, limit int, userID int, tz string) ([]model.Expense, error) {
	return nil, nil
}

func (m *MockRepo) Paginate(ctx context.Context, userID int, limit int, cursor *model.Cursor) (res model.ResultPaginate, err error) {
	return model.ResultPaginate{}, nil
}

func (m *MockRepo) Analytics(ctx context.Context, month, year, userID int, tz string) (model.Analytics, error) {
	return m.AnalyticsFunc(ctx, month, year, userID, tz)
}
func (m *MockRepo) FilteredExpenses(ctx context.Context, userID, limit int, cursor *model.Cursor, filter model.ExpenseFilter) (model.ResultPaginate, error) {
	return m.FilteredExpensesFunc(ctx, userID, limit, cursor, filter)
}

func (m *MockRepo) DailyRange(ctx context.Context, from, to time.Time, userID int, tz string) ([]model.DailyAggregate, error) {
	return m.DailyRangeFunc(ctx, from, to, userID, tz)
}
