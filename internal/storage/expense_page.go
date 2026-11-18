package storage

import (
	"FinanceTracker/internal/model"
	"context"
	"fmt"
	"strings"
)

func (p *PostgresRepo) FilteredExpenses(ctx context.Context, userID, limit int, cursor *model.Cursor, filter model.ExpenseFilter) (model.ResultPaginate, error) {
	// Keep the repository safe for direct callers as well as the service.
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	args := []any{userID}
	conditions := []string{"user_id = $1"}
	add := func(condition string, value any) {
		args = append(args, value)
		conditions = append(conditions, fmt.Sprintf(condition, len(args)))
	}
	if !filter.From.IsZero() {
		add("spent_at >= $%d", filter.From)
	}
	if !filter.To.IsZero() {
		add("spent_at < $%d", filter.To)
	}
	if filter.Title != nil {
		add("lower(btrim(title)) = $%d", *filter.Title)
	}
	if filter.MinAmount != nil {
		add("amount >= $%d::bigint", *filter.MinAmount)
	}
	if cursor != nil {
		args = append(args, cursor.SpentAt, cursor.ID)
		conditions = append(conditions, fmt.Sprintf("(spent_at, id) < ($%d, $%d)", len(args)-1, len(args)))
	}
	args = append(args, limit+1)
	query := "SELECT id, amount, title, created_at, user_id, spent_at FROM expenses WHERE " +
		strings.Join(conditions, " AND ") + fmt.Sprintf(" ORDER BY spent_at DESC, id DESC LIMIT $%d", len(args))
	rows, err := p.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return model.ResultPaginate{}, err
	}
	defer rows.Close()
	result := model.ResultPaginate{Exp: make([]model.Expense, 0, limit)}
	for rows.Next() {
		var expense model.Expense
		if err := rows.Scan(&expense.ID, &expense.Amount, &expense.Title, &expense.CreatedAt, &expense.UserID, &expense.SpentAt); err != nil {
			return model.ResultPaginate{}, err
		}
		result.Exp = append(result.Exp, expense)
	}
	if err := rows.Err(); err != nil {
		return model.ResultPaginate{}, err
	}
	if len(result.Exp) > limit {
		last := result.Exp[limit-1]
		result.NextCursor = &model.Cursor{ID: last.ID, SpentAt: last.SpentAt}
		result.Exp = result.Exp[:limit]
	}
	return result, nil
}
