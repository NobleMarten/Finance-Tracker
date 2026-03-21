package model

import "errors"

var (
	ErrEmptyTitle      = errors.New("Title is empty")
	ErrNegativeAmount  = errors.New("Amount is negative")
	ErrInvalidID       = errors.New("Invalid id")
	ErrNotFoundExpense = errors.New("Not found id")
)
