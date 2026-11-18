package model

import "time"

// ExpenseFilter narrows a keyset traversal without changing its ordering.
// From is inclusive, To is exclusive; zero boundaries mean no date filter.
type ExpenseFilter struct {
	From      time.Time
	To        time.Time
	Title     *string
	MinAmount *int
}

type DailyAggregate struct {
	Date   string `json:"date"`
	Amount int    `json:"amount"`
	Count  int    `json:"count"`
}

type MonthlyAggregate struct {
	Year   int `json:"year"`
	Month  int `json:"month"`
	Amount int `json:"amount"`
}

type FrequentExpense struct {
	Key   string           `json:"key"`
	Title string           `json:"title"`
	Count int              `json:"count"`
	Sum   int              `json:"sum"`
	Days  int              `json:"days"`
	Daily []DailyAggregate `json:"daily"`
}

type LargeExpenses struct {
	Threshold int `json:"threshold"`
	Sum       int `json:"sum"`
	Count     int `json:"count"`
	Share     int `json:"share"`
}

type MonthInsights struct {
	Total    int               `json:"total"`
	Count    int               `json:"count"`
	AvgCheck int               `json:"avg_check"`
	Median   int               `json:"median"`
	Large    *LargeExpenses    `json:"large"`
	Frequent []FrequentExpense `json:"frequent"`
}

// Analytics contains bounded aggregates, never an unbounded expense list.
type Analytics struct {
	Daily        []DailyAggregate   `json:"daily"`
	TopExpenses  []Expense          `json:"topexp"`
	AvgDay       int                `json:"avgday"`
	CurrentMonth int                `json:"currentmonth"`
	PrevMonth    int                `json:"prevmonth"`
	Insights     MonthInsights      `json:"insights"`
	YearDaily    []DailyAggregate   `json:"year_daily"`
	Trend        []MonthlyAggregate `json:"trend"`
}
