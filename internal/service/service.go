package service

import (
	"FinanceTracker/internal/model"
	"FinanceTracker/internal/storage"
	"strings"
)

type ItemService struct {
	repo storage.PostgresRepo
}

func NewItemService(repo storage.PostgresRepo) (*ItemService, error) {
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

func (s *ItemService) Add(amount int, title string) (model.Expense, error) {
	if amount < 0 {
		return model.Expense{}, model.ErrNegativeAmount
	}

	title, err := ValidateTitle(title)
	if err != nil {
		return model.Expense{}, err
	}

	return s.repo.Add(amount, title)
}

func (s *ItemService) List() ([]model.Expense, error) {
	return s.repo.List()
}

func (s *ItemService) Delete(id int) (model.Expense, error) {
	if id <= 0 {
		return model.Expense{}, model.ErrInvalidID
	}

	return s.repo.Delete(id)
}

func (s *ItemService) Update(id int, newamount *int, newtitle *string) (model.Expense, error) {

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

	return s.repo.Update(id, newamount, newtitle)
}

func (s *ItemService) Clear() error {
	return s.repo.Clear()
}

func (s *ItemService) Summary(m int) (int, error) {
	return s.repo.Summary()
}
