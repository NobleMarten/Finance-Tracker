package model

import "errors"

var (
	ErrEmptyTitle      = errors.New("Title is empty")
	ErrNegativeAmount  = errors.New("Amount is negative")
	ErrInvalidID       = errors.New("Invalid id")
	ErrNotFoundExpense = errors.New("Not found id")
	ErrTooLongTitle    = errors.New("Title is to long")
	ErrInvalidMonth    = errors.New("Invalid month")
	ErrEmptyDBURL      = errors.New("DB_URL is empty")
	ErrNotFound        = errors.New("Not found")
	ErrInvalidCurrency = errors.New("Invalid currency")
	ErrInvalidAPIURL   = errors.New("Invalid API URL")
	ErrEmptyAPIKey     = errors.New("API Key is empty")
	ErrZeroAmount      = errors.New("Zero amount")
)
