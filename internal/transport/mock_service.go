package transport

import (
	"FinanceTracker/internal/model"
	"context"
	"time"
)

type MockService struct {
	DailyRangeFunc       func(ctx context.Context, from, to time.Time, userID int, tz string) ([]model.DailyAggregate, error)
	AnalyticsFunc        func(ctx context.Context, month, year, userID int, tz string) (model.Analytics, error)
	FilteredExpensesFunc func(ctx context.Context, userID, limit int, cursor *model.Cursor, filter model.ExpenseFilter) (model.ResultPaginate, error)
	ListFunc             func(ctx context.Context, userID int) ([]model.Expense, error)
	AddFunc              func(ctx context.Context, amount int, title string, userID int, spentAt *time.Time) (model.Expense, error)
	DeleteFunc           func(ctx context.Context, id, userID int) (model.Expense, error)
	UpdateFunc           func(ctx context.Context, id int, amount *int, title *string, userID int, spentAt *time.Time) (model.Expense, error)
	ClearFunc            func(ctx context.Context, userID int) error
	SummaryFunc          func(ctx context.Context, from, to time.Time, userID int) (int, error)
	DailyTotalFunc       func(ctx context.Context, m int, y int, userID int, tz string) ([]model.DailyExpense, error)
	TopExpensesFunc      func(ctx context.Context, m, y int, limit int, userID int, tz string) ([]model.Expense, error)
	AvgPerDayFunc        func(sum int, lenDaily int) int
	PaginateFunc         func(ctx context.Context, userID int, limit int, cursor *model.Cursor) (res model.ResultPaginate, err error)
}

// var _ ItemService = (*MockService)(nil)

func (m *MockService) List(ctx context.Context, userID int) ([]model.Expense, error) {
	return m.ListFunc(ctx, userID)
}

func (m *MockService) Add(ctx context.Context, amount int, title string, userID int, spentAt *time.Time) (model.Expense, error) {
	return m.AddFunc(ctx, amount, title, userID, spentAt)
}

func (m *MockService) Delete(ctx context.Context, id, userID int) (model.Expense, error) {
	return m.DeleteFunc(ctx, id, userID)
}

func (m *MockService) Update(ctx context.Context, id int, amount *int, title *string, userID int, spentAt *time.Time) (model.Expense, error) {
	return m.UpdateFunc(ctx, id, amount, title, userID, spentAt)
}

func (m *MockService) Clear(ctx context.Context, userID int) error {
	return m.ClearFunc(ctx, userID)
}

func (m *MockService) Summary(ctx context.Context, from, to time.Time, userID int) (int, error) {
	return m.SummaryFunc(ctx, from, to, userID)
}

func (m *MockService) DailyTotal(ctx context.Context, mo int, y int, userID int, tz string) ([]model.DailyExpense, error) {
	return m.DailyTotalFunc(ctx, mo, y, userID, tz)
}

func (m *MockService) TopExpenses(ctx context.Context, mo, y int, limit int, userID int, tz string) ([]model.Expense, error) {
	return m.TopExpensesFunc(ctx, mo, y, limit, userID, tz)
}

func (m *MockService) AvgPerDay(sum int, lenDaily int) int {
	return m.AvgPerDayFunc(sum, lenDaily)
}

func (m *MockService) Paginate(ctx context.Context, userID int, limit int, cursor *model.Cursor) (res model.ResultPaginate, err error) {
	return m.PaginateFunc(ctx, userID, limit, cursor)
}

func (m *MockService) Analytics(ctx context.Context, month, year, userID int, tz string) (model.Analytics, error) {
	return m.AnalyticsFunc(ctx, month, year, userID, tz)
}
func (m *MockService) FilteredExpenses(ctx context.Context, userID, limit int, cursor *model.Cursor, filter model.ExpenseFilter) (model.ResultPaginate, error) {
	return m.FilteredExpensesFunc(ctx, userID, limit, cursor, filter)
}

func (m *MockService) DailyRange(ctx context.Context, from, to time.Time, userID int, tz string) ([]model.DailyAggregate, error) {
	return m.DailyRangeFunc(ctx, from, to, userID, tz)
}
