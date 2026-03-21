package service

import (
	"FinanceTracker/internal/model"
	"FinanceTracker/internal/storage"
	"fmt"
	"strings"
	"time"
)

type ItemService struct {
	repo storage.FileStorage
}

func NewItemService(repo storage.FileStorage) (*ItemService, error) {
	return &ItemService{repo: repo}, nil
}

func (s *ItemService) Add(title string, amount int) (model.Expense, error) {
	expenses, err := s.repo.Load()
	if err != nil {
		return model.Expense{}, err
	}

	if amount < 0 {
		return model.Expense{}, model.ErrNegativeAmount
	}

	title = strings.TrimSpace(title)
	if title == "" {
		return model.Expense{}, model.ErrEmptyTitle
	}

	nextID := 1
	for _, it := range expenses {
		if it.ID >= nextID {
			nextID = it.ID + 1
		}
	}

	tm := time.Now()

	newItem := model.Expense{
		ID:        nextID,
		Title:     title,
		Amount:    amount,
		CreatedAt: tm,
	}

	expenses = append(expenses, newItem)
	if err := s.repo.Save(expenses); err != nil {
		return model.Expense{}, err
	}
	return newItem, nil
}

func (s *ItemService) List() ([]model.Expense, error) {
	return s.repo.Load()
}

func (s *ItemService) Delete(id int) (string, error) {
	expenses, err := s.repo.Load()
	if err != nil {
		return "", err
	}

	if id <= 0 {
		return "", model.ErrInvalidID
	}

	found := false

	for i, v := range expenses {
		if v.ID == id {
			found = true
			expenses = append(expenses[:i], expenses[i+1:]...)
			if err := s.repo.Save(expenses); err != nil {
				return "", err
			}
		}
	}

	if found == false {
		return "", model.ErrNotFoundExpense
	}

	return fmt.Sprintf("delete expense with id: %d", id), nil
}

func (s *ItemService) Update(id int, newtitle string) (model.Expense, error) {
	if newtitle == "" {
		return model.Expense{}, model.ErrEmptyTitle
	}

	if id <= 0 {
		return model.Expense{}, model.ErrInvalidID
	}

	expenses, err := s.repo.Load()
	if err != nil {
		return model.Expense{}, err
	}

	found := false
	var updexp model.Expense

	for i, v := range expenses {
		if v.ID == id {
			found = true
			expenses[i].Title = newtitle
			updexp = model.Expense{
				ID:     v.ID,
				Title:  newtitle,
				Amount: v.Amount,
			}
		}
	}

	if found == false {
		return model.Expense{}, model.ErrNotFoundExpense
	}

	if err := s.repo.Save(expenses); err != nil {
		return model.Expense{}, err
	}

	return updexp, nil
}

func (s *ItemService) Clear() (string, error) {
	return "clear all expenses", s.repo.Save([]model.Expense{})
}

func (s *ItemService) Summary() (string, error) {
	return "", nil
}
