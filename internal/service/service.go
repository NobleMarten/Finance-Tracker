package service

import (
	"FinanceTracker/internal/model"
	"context"
	"strings"
	"time"
)

type ExpenseRepo interface {
	DailyRange(ctx context.Context, from, to time.Time, userID int, tz string) ([]model.DailyAggregate, error)
	Analytics(ctx context.Context, month, year, userID int, tz string) (model.Analytics, error)
	FilteredExpenses(ctx context.Context, userID, limit int, cursor *model.Cursor, filter model.ExpenseFilter) (model.ResultPaginate, error)

	Add(ctx context.Context, amount int, title string, userID int, spentAt *time.Time) (model.Expense, error)
	List(ctx context.Context, userID int) ([]model.Expense, error)
	Delete(ctx context.Context, id int, userID int) (model.Expense, error)
	Clear(ctx context.Context, userID int) error
	Summary(ctx context.Context, from, to time.Time, userID int) (int, error)
	Update(ctx context.Context, id int, newamount *int, newtile *string, userID int, spentAt *time.Time) (model.Expense, error)
	DailyTotal(ctx context.Context, m int, y int, userID int, tz string) ([]model.DailyExpense, error)
	TopExpenses(ctx context.Context, m, y int, limit int, userID int, tz string) ([]model.Expense, error)
	Paginate(ctx context.Context, userID int, limit int, cursor *model.Cursor) (res model.ResultPaginate, err error)
}

type ItemService struct {
	repo ExpenseRepo
}

func NewItemService(repo ExpenseRepo) *ItemService {
	return &ItemService{repo: repo}
}

func ValidateTitle(title string) (string, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return "Untitled", nil
	}

	if len([]rune(title)) > 100 {
		return "", model.ErrTooLongTitle
	}
	return title, nil
}

func ValidateID(id int) (int, error) {
	if id <= 0 {
		return 0, model.ErrInvalidID
	}
	return id, nil
}

func ValidateAmount(amount int) (int, error) {
	if amount < 0 {
		return 0, model.ErrNegativeAmount
	}
	return amount, nil
}

func ValidateDate(spentAt *time.Time) (*time.Time, error) {
	if spentAt == nil {
		return spentAt, nil
	}
	if spentAt.After(time.Now().Add(24*time.Hour)) || spentAt.Before(time.Date(2020, time.January, 1, 0, 0, 0, 0, time.UTC)) {
		return nil, model.ErrFutureDate
	}
	return spentAt, nil
}

func (s *ItemService) Add(ctx context.Context, amount int, title string, userID int, spentAt *time.Time) (model.Expense, error) {
	if amount < 0 {
		return model.Expense{}, model.ErrNegativeAmount
	}
	if amount == 0 {
		return model.Expense{}, model.ErrZeroAmount
	}

	title, err := ValidateTitle(title)
	if err != nil {
		return model.Expense{}, err
	}

	spentAt, err = ValidateDate(spentAt)
	if err != nil {
		return model.Expense{}, err
	}

	return s.repo.Add(ctx, amount, title, userID, spentAt)
}

func (s *ItemService) List(ctx context.Context, userID int) ([]model.Expense, error) {
	return s.repo.List(ctx, userID)
}

func (s *ItemService) Delete(ctx context.Context, id, userID int) (model.Expense, error) {
	id, err := ValidateID(id)
	if err != nil {
		return model.Expense{}, err
	}

	return s.repo.Delete(ctx, id, userID)
}

func (s *ItemService) Update(ctx context.Context, id int, newamount *int, newtitle *string, userID int, spentAt *time.Time) (model.Expense, error) {

	id, err := ValidateID(id)
	if err != nil {
		return model.Expense{}, err
	}

	if newtitle != nil {
		*newtitle, err = ValidateTitle(*newtitle)
		if err != nil {
			return model.Expense{}, err
		}
	}

	if newamount != nil {
		if *newamount < 0 {
			return model.Expense{}, model.ErrNegativeAmount
		}
	}

	spentAt, err = ValidateDate(spentAt)
	if err != nil {
		return model.Expense{}, err
	}

	return s.repo.Update(ctx, id, newamount, newtitle, userID, spentAt)
}

func (s *ItemService) Clear(ctx context.Context, userID int) error {
	return s.repo.Clear(ctx, userID)
}

func (s *ItemService) Summary(ctx context.Context, from, to time.Time, userID int) (int, error) {
	if from.IsZero() || to.IsZero() || !from.Before(to) {
		return 0, model.ErrInvalidDateRange
	}
	return s.repo.Summary(ctx, from, to, userID)
}

func (s *ItemService) DailyTotal(ctx context.Context, m int, y int, userID int, tz string) ([]model.DailyExpense, error) {
	if 0 > m || m > 12 {
		return nil, model.ErrInvalidMonth
	}

	return s.repo.DailyTotal(ctx, m, y, userID, tz)
}

func (s *ItemService) TopExpenses(ctx context.Context, m, y int, limit int, userID int, tz string) ([]model.Expense, error) {
	if 0 > m || m > 12 {
		return nil, model.ErrInvalidMonth
	}

	if limit <= 0 {
		return nil, model.ErrInvalidLimit
	}

	return s.repo.TopExpenses(ctx, m, y, limit, userID, tz)
}

func (s *ItemService) AvgPerDay(sum int, lenDaily int) int {
	if lenDaily == 0 {
		return 0
	}
	return sum / lenDaily
}

func (s *ItemService) Paginate(ctx context.Context, userID int, limit int, cursor *model.Cursor) (res model.ResultPaginate, err error) {

	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	return s.repo.Paginate(ctx, userID, limit, cursor)
}

func (s *ItemService) Analytics(ctx context.Context, month, year, userID int, tz string) (model.Analytics, error) {
	if month < 1 || month > 12 {
		return model.Analytics{}, model.ErrInvalidMonth
	}
	if year < 1 || year > 9999 {
		return model.Analytics{}, model.ErrInvalidYear
	}
	if _, err := time.LoadLocation(tz); err != nil {
		return model.Analytics{}, model.ErrInvalidTimezone
	}
	return s.repo.Analytics(ctx, month, year, userID, tz)
}

func (s *ItemService) FilteredExpenses(ctx context.Context, userID, limit int, cursor *model.Cursor, filter model.ExpenseFilter) (model.ResultPaginate, error) {
	if filter.From.IsZero() != filter.To.IsZero() || (!filter.From.IsZero() && !filter.From.Before(filter.To)) {
		return model.ResultPaginate{}, model.ErrInvalidDateRange
	}
	if filter.MinAmount != nil && *filter.MinAmount < 0 {
		return model.ResultPaginate{}, model.ErrNegativeAmount
	}
	if cursor != nil && (cursor.ID <= 0 || cursor.SpentAt.IsZero()) {
		return model.ResultPaginate{}, model.ErrInvalidCursor
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return s.repo.FilteredExpenses(ctx, userID, limit, cursor, filter)
}

func (s *ItemService) DailyRange(ctx context.Context, from, to time.Time, userID int, tz string) ([]model.DailyAggregate, error) {
	if from.IsZero() || to.IsZero() || !from.Before(to) || to.Sub(from) > 367*24*time.Hour {
		return nil, model.ErrInvalidDateRange
	}
	if _, err := time.LoadLocation(tz); err != nil {
		return nil, model.ErrInvalidTimezone
	}
	return s.repo.DailyRange(ctx, from, to, userID, tz)
}
