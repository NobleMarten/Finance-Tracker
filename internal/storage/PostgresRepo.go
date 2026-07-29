package storage

import (
	"FinanceTracker/internal/model"
	"context"
	"database/sql"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// type PostgresRepo struct {
// 	DB *sql.DB // указатель нужен для возможности изменять состояние базы данных внутри методов
// }

// monthRange отбирает траты за месяц $1 года $2 в часовом поясе $4.
//
// Границы, а не EXTRACT(MONTH FROM spent_at ...): обёрнутая в функцию колонка
// не совпадает со значениями в индексе, поэтому диапазон дат уходил в постфильтр,
// а индекс сужал выборку только по user_id. С голой колонкой слева планировщик
// кладёт обе границы в Index Cond по (user_id, spent_at).
//
// Верхняя граница строгая и считается прибавлением месяца к нижней — так
// автоматически учитываются разная длина месяцев и переход через год.
const monthRange = `spent_at >= (make_timestamp($2, $1, 1, 0, 0, 0) AT TIME ZONE $4)
	AND spent_at < ((make_timestamp($2, $1, 1, 0, 0, 0) + interval '1 month') AT TIME ZONE $4)`

func (p *PostgresRepo) Add(ctx context.Context, amount int, title string, userID int, spentAt *time.Time) (model.Expense, error) {
	row := p.DB.QueryRowContext(ctx, "INSERT INTO expenses (title, amount, user_id, spent_at) VALUES ($1, $2, $3, COALESCE($4, now())) RETURNING id, amount, title, created_at, user_id, spent_at", title, amount, userID, spentAt)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt, &expense.UserID, &expense.SpentAt); err != nil {
		return model.Expense{}, err
	}
	return expense, nil
}

func (p *PostgresRepo) List(ctx context.Context, userID int) ([]model.Expense, error) {
	rows, err := p.DB.QueryContext(ctx, "SELECT id, amount, title, created_at, user_id, spent_at From expenses where user_id = $1 Order by spent_at DESC, id", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close() // закроем результат запроса (rows) и освободим connection

	var expenses []model.Expense
	for rows.Next() { // rows.Next() возвращает true, если есть следующая строка, и false, если строк больше нет или произошла ошибка
		var expense model.Expense
		if err := rows.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt, &expense.UserID, &expense.SpentAt); err != nil {
			return nil, err
		}
		expenses = append(expenses, expense)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return expenses, nil
}

func (p *PostgresRepo) Delete(ctx context.Context, id int, userID int) (model.Expense, error) {
	row := p.DB.QueryRowContext(ctx, "DELETE From expenses where id = $1 AND user_id = $2 RETURNING id, amount, title, created_at, user_id, spent_at", id, userID)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt, &expense.UserID, &expense.SpentAt); err != nil {
		if err == sql.ErrNoRows {
			return model.Expense{}, model.ErrNotFound
		} else {
			return model.Expense{}, err
		}
	}
	return expense, nil
}

func (p *PostgresRepo) Update(ctx context.Context, id int, newamount *int, newtitle *string, userID int, spentAt *time.Time) (model.Expense, error) {
	query := `UPDATE expenses SET
		 amount = COALESCE($1, amount), 
		 title = COALESCE($2, title),
		 spent_at = COALESCE($5, spent_at)
		 WHERE id = $3 AND user_id = $4
		 RETURNING id, amount, title, created_at, user_id, spent_at`

	row := p.DB.QueryRowContext(ctx, query, newamount, newtitle, id, userID, spentAt)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt, &expense.UserID, &expense.SpentAt); err != nil {
		if err == sql.ErrNoRows {
			return model.Expense{}, model.ErrNotFound
		} else {
			return model.Expense{}, err
		}
	}
	return expense, nil
}

func (p *PostgresRepo) Clear(ctx context.Context, userID int) error {
	_, err := p.DB.ExecContext(ctx, "DELETE FROM expenses where user_id = $1", userID)
	if err != nil {
		return err
	}
	return nil
}

func (p *PostgresRepo) Summary(ctx context.Context, m, y int, userID int, tz string) (int, error) {
	var summary int

	if m == 0 {
		row := p.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM expenses where user_id = $1", userID)
		if err := row.Scan(&summary); err != nil {
			return 0, err
		}
	} else {
		row := p.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = $3 AND "+monthRange, m, y, userID, tz)
		if err := row.Scan(&summary); err != nil {
			return 0, err
		}
	}
	return summary, nil
}

func (p *PostgresRepo) DailyTotal(ctx context.Context, m int, y int, userID int, tz string) ([]model.DailyExpense, error) {
	rows, err := p.DB.QueryContext(ctx, "SELECT date(spent_at AT TIME ZONE $4)::text, SUM(amount) from expenses WHERE user_id = $3 AND "+monthRange+" GROUP BY date(spent_at AT TIME ZONE $4)", m, y, userID, tz)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var dailyExpenses []model.DailyExpense
	for rows.Next() {
		var DailyExpense model.DailyExpense
		if err := rows.Scan(&DailyExpense.Date, &DailyExpense.Amount); err != nil {
			return nil, err
		}
		dailyExpenses = append(dailyExpenses, DailyExpense)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return dailyExpenses, nil
}

func (p *PostgresRepo) TopExpenses(ctx context.Context, m, y int, limit int, userID int, tz string) ([]model.Expense, error) {
	rows, err := p.DB.QueryContext(ctx, "SELECT id, amount, title, created_at, user_id, spent_at from expenses WHERE user_id = $3 AND "+monthRange+" ORDER BY amount DESC LIMIT $5", m, y, userID, tz, limit)
	if err != nil {
		return nil, err
	}
	var expenses []model.Expense
	defer rows.Close()
	for rows.Next() {
		var expense model.Expense
		if err := rows.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt, &expense.UserID, &expense.SpentAt); err != nil {
			return nil, err
		}
		expenses = append(expenses, expense)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return expenses, nil
}
