package storage

import (
	"FinanceTracker/internal/model"
	"context"
	"database/sql"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// type PostgresRepo struct {
// 	DB *sql.DB // указатель нужен для возможности изменять состояние базы данных внутри методов
// }

func (p *PostgresRepo) Add(ctx context.Context, amount int, title string, userID int) (model.Expense, error) {
	row := p.DB.QueryRowContext(ctx, "INSERT INTO expenses (title, amount, user_id) VALUES ($1, $2, $3) RETURNING id, amount, title, created_at, user_id", title, amount, userID)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt, &expense.UserID); err != nil {
		return model.Expense{}, err
	}
	return expense, nil
}

func (p *PostgresRepo) List(ctx context.Context, userID int) ([]model.Expense, error) {
	rows, err := p.DB.QueryContext(ctx, "SELECT id, amount, title, created_at, user_id From expenses where user_id = $1 Order by id", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var expenses []model.Expense
	for rows.Next() { // rows.Next() возвращает true, если есть следующая строка, и false, если строк больше нет или произошла ошибка
		var expense model.Expense
		if err := rows.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt, &expense.UserID); err != nil {
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
	row := p.DB.QueryRowContext(ctx, "DELETE From expenses where id = $1 AND user_id = $2 RETURNING id, amount, title, created_at, user_id", id, userID)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt, &expense.UserID); err != nil {
		if err == sql.ErrNoRows {
			return model.Expense{}, model.ErrNotFound
		} else {
			return model.Expense{}, err
		}
	}
	return expense, nil
}

func (p *PostgresRepo) Update(ctx context.Context, id int, newamount *int, newtitle *string, userID int) (model.Expense, error) {
	query := `UPDATE expenses SET
		 amount = COALESCE($1, amount), 
		 title = COALESCE($2, title)
		 WHERE id = $3 AND user_id = $4
		 RETURNING id, amount, title, created_at, user_id`

	row := p.DB.QueryRowContext(ctx, query, newamount, newtitle, id, userID)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt, &expense.UserID); err != nil {
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

func (p *PostgresRepo) Summary(ctx context.Context, m int, userID int) (int, error) {
	var summary int

	if m == 0 {
		row := p.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM expenses where user_id = $1", userID)
		if err := row.Scan(&summary); err != nil {
			return 0, err
		}
	} else {
		row := p.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE EXTRACT(MONTH FROM created_at) = $1 AND user_id = $2", m, userID)
		if err := row.Scan(&summary); err != nil {
			return 0, err
		}
	}
	return summary, nil
}
