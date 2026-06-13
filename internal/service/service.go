package service

import (
	"FinanceTracker/internal/model"
	"context"
	"strings"
)

type ExpenseRepo interface {
	Add(ctx context.Context, amount int, title string, userID int) (model.Expense, error)
	List(ctx context.Context, userID int) ([]model.Expense, error)
	Delete(ctx context.Context, id int, userID int) (model.Expense, error)
	Clear(ctx context.Context, userID int) error
	Summary(ctx context.Context, m, y int, userID int) (int, error)
	Update(ctx context.Context, id int, newamount *int, newtile *string, userID int) (model.Expense, error)
	DailyTotal(ctx context.Context, m int, y int, userID int) ([]model.DailyExpense, error)
	TopExpenses(ctx context.Context, m, y int, limit int, userID int) ([]model.Expense, error)
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

func (s *ItemService) Add(ctx context.Context, amount int, title string, userID int) (model.Expense, error) {
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

	return s.repo.Add(ctx, amount, title, userID)
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

func (s *ItemService) Update(ctx context.Context, id int, newamount *int, newtitle *string, userID int) (model.Expense, error) {

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

	return s.repo.Update(ctx, id, newamount, newtitle, userID)
}

func (s *ItemService) Clear(ctx context.Context, userID int) error {
	return s.repo.Clear(ctx, userID)
}

func (s *ItemService) Summary(ctx context.Context, m, y int, userID int) (int, error) {

	if 0 > m || m > 12 {
		return 0, model.ErrInvalidMonth
	}

	return s.repo.Summary(ctx, m, y, userID)
}

func (s *ItemService) DailyTotal(ctx context.Context, m int, y int, userID int) ([]model.DailyExpense, error) {
	if 0 > m || m > 12 {
		return nil, model.ErrInvalidMonth
	}

	return s.repo.DailyTotal(ctx, m, y, userID)
}

func (s *ItemService) TopExpenses(ctx context.Context, m, y int, limit int, userID int) ([]model.Expense, error) {
	if 0 > m || m > 12 {
		return nil, model.ErrInvalidMonth
	}

	if limit <= 0 {
		return nil, model.ErrInvalidLimit
	}

	return s.repo.TopExpenses(ctx, m, y, limit, userID)
}
