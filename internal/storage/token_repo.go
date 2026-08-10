package storage

import (
	"FinanceTracker/internal/model"
	"context"
	"database/sql"
)

// Один список колонок на все запросы: порядок в Scan обязан совпадать с
// порядком в SELECT/RETURNING, а компилятор этого не проверяет. Держать
// строку в одном месте дешевле, чем ловить разъехавшийся Scan в рантайме.
const tokenColumns = "id, user_id, token_hash, name, created_at, last_used_at, revoked_at"

// rowScanner покрывает и *sql.Row, и *sql.Rows — так одна функция разбора
// годится и для запроса на одну строку, и для цикла по многим.
type rowScanner interface {
	Scan(dest ...any) error
}

func scanToken(row rowScanner) (model.Token, error) {
	var t model.Token
	if err := row.Scan(
		&t.TokenID, &t.UserID, &t.TokenHash, &t.Name,
		&t.CreatedAt, &t.LastUsedAt, &t.RevokedAt,
	); err != nil {
		return model.Token{}, err
	}
	return t, nil
}

// Create записывает уже посчитанный хеш. Что это SHA-256 от строки с префиксом
// ft_, хранилище не знает и знать не должно — для него это просто байты.
func (p *PostgresRepo) Create(ctx context.Context, userID int, tokenHash []byte, name string) (model.Token, error) {
	row := p.DB.QueryRowContext(ctx,
		"INSERT INTO api_tokens (user_id, token_hash, name) VALUES ($1, $2, $3) RETURNING "+tokenColumns,
		userID, tokenHash, name)

	return scanToken(row)
}

// GetByHash отдаёт только живые токены: отозванные отсекаются здесь, в SQL,
// а не проверкой revoked_at в сервисе. Иначе про фильтр можно забыть в одном
// из вызовов, и отозванный токен продолжит пускать.
func (p *PostgresRepo) GetByHash(ctx context.Context, tokenHash []byte) (model.Token, error) {
	row := p.DB.QueryRowContext(ctx,
		"SELECT "+tokenColumns+" FROM api_tokens WHERE token_hash = $1 AND revoked_at IS NULL",
		tokenHash)

	token, err := scanToken(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return model.Token{}, model.ErrNotFound
		}
		return model.Token{}, err
	}
	return token, nil
}

// ListByUser возвращает и отозванные тоже — на странице управления нужен
// полный список со статусом, иначе пользователь не поймёт, что стало
// с токеном, который он отозвал вчера.
func (p *PostgresRepo) ListByUser(ctx context.Context, userID int) ([]model.Token, error) {
	rows, err := p.DB.QueryContext(ctx,
		"SELECT "+tokenColumns+" FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC, id DESC",
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []model.Token
	for rows.Next() {
		token, err := scanToken(rows)
		if err != nil {
			return nil, err
		}
		tokens = append(tokens, token)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return tokens, nil
}

// Revoke — мягкое удаление: строка остаётся, проставляется revoked_at.
//
// user_id в условии не для удобства, а для безопасности: без него достаточно
// подобрать чужой tokenID, чтобы отозвать чужой токен. Условие сводит проверку
// прав и сам апдейт в один запрос, поэтому «сначала проверил, потом изменил»
// с гонкой между шагами здесь невозможно.
//
// revoked_at IS NULL делает повторный отзыв безрезультатным — время первого
// отзыва не затирается.
func (p *PostgresRepo) Revoke(ctx context.Context, userID, tokenID int) error {
	res, err := p.DB.ExecContext(ctx,
		"UPDATE api_tokens SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL",
		tokenID, userID)
	if err != nil {
		return err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	// Ноль строк — токена нет, он чужой или уже отозван. Наружу все три случая
	// выглядят одинаково намеренно: иначе по коду ответа можно перебором
	// выяснять, какие id существуют.
	if affected == 0 {
		return model.ErrNotFound
	}
	return nil
}

// TouchLastUsed обновляет отметку не чаще раза в 10 минут — условие стоит
// в самом UPDATE.
//
// Validate дёргается на каждом запросе с токеном, и без ограничения любое
// чтение тянуло бы за собой запись. Порог в SQL, а не в Go, потому что так
// решение принимается по строке в базе: два параллельных запроса не смогут
// оба увидеть «давно не обновляли» и записать дважды.
//
// Ноль обновлённых строк — это успех, а не ошибка: значит отметку уже
// поставили недавно.
func (p *PostgresRepo) TouchLastUsed(ctx context.Context, tokenID int) error {
	_, err := p.DB.ExecContext(ctx,
		`UPDATE api_tokens SET last_used_at = now()
		 WHERE id = $1
		   AND (last_used_at IS NULL OR last_used_at < now() - interval '10 minutes')`,
		tokenID)

	return err
}
