package model

import "time"

type Expense struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Amount    int       `json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}
