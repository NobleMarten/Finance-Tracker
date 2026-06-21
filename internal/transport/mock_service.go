package transport

import (
	"FinanceTracker/internal/model"
	"context"
)

type MockService struct {
	ListFunc        func(ctx context.Context, userID int) ([]model.Expense, error)
	AddFunc         func(ctx context.Context, amount int, title string, userID int) (model.Expense, error)
	DeleteFunc      func(ctx context.Context, id, userID int) (model.Expense, error)
	UpdateFunc      func(ctx context.Context, id int, amount *int, title *string, userID int) (model.Expense, error)
	ClearFunc       func(ctx context.Context, userID int) error
	SummaryFunc     func(ctx context.Context, m, y int, userID int) (int, error)
	DailyTotalFunc  func(ctx context.Context, m int, y int, userID int) ([]model.DailyExpense, error)
	TopExpensesFunc func(ctx context.Context, m, y int, limit int, userID int) ([]model.Expense, error)
	AvgPerDayFunc   func(sum int, lenDaily int) int
}

// var _ ItemService = (*MockService)(nil)

func (m *MockService) List(ctx context.Context, userID int) ([]model.Expense, error) {
	return m.ListFunc(ctx, userID)
}

func (m *MockService) Add(ctx context.Context, amount int, title string, userID int) (model.Expense, error) {
	return m.AddFunc(ctx, amount, title, userID)
}

func (m *MockService) Delete(ctx context.Context, id, userID int) (model.Expense, error) {
	return m.DeleteFunc(ctx, id, userID)
}

func (m *MockService) Update(ctx context.Context, id int, amount *int, title *string, userID int) (model.Expense, error) {
	return m.UpdateFunc(ctx, id, amount, title, userID)
}

func (m *MockService) Clear(ctx context.Context, userID int) error {
	return m.ClearFunc(ctx, userID)
}

func (m *MockService) Summary(ctx context.Context, mo, y int, userID int) (int, error) {
	return m.SummaryFunc(ctx, mo, y, userID)
}

func (m *MockService) DailyTotal(ctx context.Context, mo int, y int, userID int) ([]model.DailyExpense, error) {
	return m.DailyTotalFunc(ctx, mo, y, userID)
}

func (m *MockService) TopExpenses(ctx context.Context, mo, y int, limit int, userID int) ([]model.Expense, error) {
	return m.TopExpensesFunc(ctx, mo, y, limit, userID)
}

func (m *MockService) AvgPerDay(sum int, lenDaily int) int {
	return m.AvgPerDayFunc(sum, lenDaily)
}
