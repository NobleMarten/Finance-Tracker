package model

import "errors"

var (
	ErrEmptyTitle        = errors.New("title is empty")
	ErrNegativeAmount    = errors.New("amount is negative")
	ErrInvalidID         = errors.New("invalid id")
	ErrNotFoundExpense   = errors.New("not found id")
	ErrTooLongTitle      = errors.New("title is to long")
	ErrInvalidMonth      = errors.New("invalid month")
	ErrEmptyDBURL        = errors.New("DB_URL is empty")
	ErrNotFound          = errors.New("not found")
	ErrInvalidCurrency   = errors.New("invalid currency")
	ErrInvalidAPIURL     = errors.New("invalid API URL")
	ErrEmptyAPIKey       = errors.New("API Key is empty")
	ErrZeroAmount        = errors.New("zero amount")
	ErrUserExists        = errors.New("user already exists")
	ErrIncorrectPassword = errors.New("incorrect password")
	ErrEmptyJWTSecret    = errors.New("JWT Secret is empty")
	ErrInternal          = errors.New("internal error")
	ErrInvalidToken      = errors.New("invalid token")
	ErrInvalidLimit      = errors.New("invalid limit")
)
