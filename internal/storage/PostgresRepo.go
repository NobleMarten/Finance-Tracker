package storage

import (
	"FinanceTracker/internal/model"
	"database/sql"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type RepoStorage interface {
	Add(amount int, title string) (model.Expense, error)
	List() ([]model.Expense, error)
	Delete(id int) error
	Clear() error
	Summary() (int, error)
	Update(id int, newamount *int, newtile *string) (model.Expense, error)
}

type PostgresRepo struct {
	DB *sql.DB // указатель нужен для возможности изменять состояние базы данных внутри методов
}

func (p *PostgresRepo) Add(amount int, title string) (model.Expense, error) {
	row := p.DB.QueryRow("INSERT INTO EXPENSES (title, amount) VALUES ($1, $2) RETURNING id, amount, title, created_at", title, amount)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt); err != nil {
		return model.Expense{}, err
	}
	return expense, nil
}

func (p *PostgresRepo) List() ([]model.Expense, error) {
	rows, err := p.DB.Query("SELECT * From EXPENSES Order by id")
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

func (p *PostgresRepo) Delete(id int) (model.Expense, error) {
	row := p.DB.QueryRow("DELETE From expenses where id = $1 RETURNING id, amount, title, created_at", id)
	var expense model.Expense
	if err := row.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt); err != nil {
		return model.Expense{}, err
	}
	return expense, nil
}

func (p *PostgresRepo) Update(id int, newamount *int, newtitle *string) (model.Expense, error) {
	query := `UPDATE expenses SET
		 amount = COALESCE($1, amount), 
		 title = COALESCE($2, title)
		 WHERE id = $3
		 RETURNING id, amount, title, created_at`

	row := p.DB.QueryRow(query, newamount, newtitle, id)
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

func (p *PostgresRepo) Clear() error {
	_, err := p.DB.Exec("Truncate expenses RESTART IDENTITY")
	if err != nil {
		return err
	}
	return nil
}

func (p *PostgresRepo) Summary() (int, error) {
	var summary int
	row := p.DB.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM expenses")
	if err := row.Scan(&summary); err != nil {
		return 0, err
	}

	return summary, nil
}
