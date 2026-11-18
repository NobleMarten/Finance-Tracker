package model

import "time"

type Cursor struct {
	ID      int       `json:"id"`
	SpentAt time.Time `json:"spent_at"`
}

type ResultPaginate struct {
	Exp        []Expense `json:"expense"`
	NextCursor *Cursor   `json:"next_cursor"`
}
