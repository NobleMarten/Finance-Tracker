package storage

import (
	"FinanceTracker/internal/model"
	"context"
	"database/sql"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type PostgresRepo struct {
	DB *sql.DB // указатель нужен для возможности изменять состояние базы данных внутри методов
}

func (p *PostgresRepo) Add(ctx context.Context, amount int, title string) (model.Expense, error) {
	row := p.DB.QueryRowContext(ctx, "INSERT INTO EXPENSES (title, amount) VALUES ($1, $2) RETURNING id, amount, title, created_at", title, amount)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt); err != nil {
		return model.Expense{}, err
	}
	return expense, nil
}

func (p *PostgresRepo) List(ctx context.Context) ([]model.Expense, error) {
	rows, err := p.DB.QueryContext(ctx, "SELECT * From EXPENSES Order by id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var expenses []model.Expense
	for rows.Next() { // rows.Next() возвращает true, если есть следующая строка, и false, если строк больше нет или произошла ошибка
		var expense model.Expense
		if err := rows.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt); err != nil {
			return nil, err
		}
		expenses = append(expenses, expense)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return expenses, nil
}

func (p *PostgresRepo) Delete(ctx context.Context, id int) (model.Expense, error) {
	row := p.DB.QueryRowContext(ctx, "DELETE From expenses where id = $1 RETURNING id, amount, title, created_at", id)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt); err != nil {
		return model.Expense{}, err
	}
	return expense, nil
}

func (p *PostgresRepo) Update(ctx context.Context, id int, newamount *int, newtitle *string) (model.Expense, error) {
	query := `UPDATE expenses SET
		 amount = COALESCE($1, amount), 
		 title = COALESCE($2, title)
		 WHERE id = $3
		 RETURNING id, amount, title, created_at`

	row := p.DB.QueryRowContext(ctx, query, newamount, newtitle, id)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt); err != nil {
		if err == sql.ErrNoRows {
			return model.Expense{}, model.ErrNotFound
		} else {
			return model.Expense{}, err
		}
	}
	return expense, nil
}

func (p *PostgresRepo) Clear(ctx context.Context) error {
	_, err := p.DB.ExecContext(ctx, "Truncate expenses RESTART IDENTITY")
	if err != nil {
		return err
	}
	return nil
}

func (p *PostgresRepo) Summary(ctx context.Context, m int) (int, error) {
	var summary int

	if m == 0 {
		row := p.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM expenses")
		if err := row.Scan(&summary); err != nil {
			return 0, err
		}
	} else {
		row := p.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE EXTRACT(MONTH FROM created_at) = $1", m)
		if err := row.Scan(&summary); err != nil {
			return 0, err
		}
	}
	return summary, nil
}
