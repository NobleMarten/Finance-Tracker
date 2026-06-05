package model

type DailyExpense struct {
	Date   string `json:"date"`
	Amount int    `json:"amount"`
}
