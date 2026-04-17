package service

import (
	"FinanceTracker/internal/model"
	"context"
	"strings"
)

type ExpenseRepo interface {
	Add(ctx context.Context, amount int, title string) (model.Expense, error)
	List(ctx context.Context) ([]model.Expense, error)
	Delete(ctx context.Context, id int) (model.Expense, error)
	Clear(ctx context.Context) error
	Summary(ctx context.Context, m int) (int, error)
	Update(ctx context.Context, id int, newamount *int, newtile *string) (model.Expense, error)
}

type ItemService struct {
	repo ExpenseRepo
}

func NewItemService(repo ExpenseRepo) (*ItemService, error) {
	return &ItemService{repo: repo}, nil
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

func (s *ItemService) Add(ctx context.Context, amount int, title string) (model.Expense, error) {
	if amount < 0 {
		return model.Expense{}, model.ErrNegativeAmount
	}

	title, err := ValidateTitle(title)
	if err != nil {
		return model.Expense{}, err
	}

	return s.repo.Add(ctx, amount, title)
}

func (s *ItemService) List(ctx context.Context) ([]model.Expense, error) {
	return s.repo.List(ctx)
}

func (s *ItemService) Delete(ctx context.Context, id int) (model.Expense, error) {
	if id <= 0 {
		return model.Expense{}, model.ErrInvalidID
	}

	return s.repo.Delete(ctx, id)
}

func (s *ItemService) Update(ctx context.Context, id int, newamount *int, newtitle *string) (model.Expense, error) {

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

	return s.repo.Update(ctx, id, newamount, newtitle)
}

func (s *ItemService) Clear(ctx context.Context) error {
	return s.repo.Clear(ctx)
}

func (s *ItemService) Summary(ctx context.Context, m int) (int, error) {

	if 0 > m || m > 12 {
		return 0, model.ErrInvalidMonth
	}

	return s.repo.Summary(ctx, m)
}
