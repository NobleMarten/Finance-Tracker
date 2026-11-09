-- Персональные API-токены для машинных клиентов (iOS Shortcuts и подобное).
-- Браузер ходит по httpOnly-куке с JWT, эти токены — второй способ входа,
-- долгоживущий и без сессии.

-- +goose Up

CREATE TABLE api_tokens (
    -- token_hash хранит SHA-256 от plaintext, сам токен нигде не сохраняется.
    -- UNIQUE нужен не только против дублей: он даёт индекс, по которому
    -- GetByHash находит строку за log(n) вместо перебора таблицы.
    -- Это и есть причина выбрать SHA-256, а не bcrypt: детерминированный
    -- хеш можно искать сравнением, солёный — нельзя.
    id           serial PRIMARY KEY,
    user_id      integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   bytea NOT NULL UNIQUE,
    name         varchar(100) NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),

    -- Обе даты nullable, и NULL здесь осмыслен:
    --   last_used_at IS NULL — токеном ещё ни разу не воспользовались
    --   revoked_at   IS NULL — токен живой
    -- Отзыв не удаляет строку: после инцидента важно видеть, когда токен
    -- отозвали и когда им пользовались в последний раз.
    last_used_at timestamptz,
    revoked_at   timestamptz
);

-- Список токенов пользователя, свежие сверху. Отозванные тоже показываем,
-- поэтому индекс не частичный.
CREATE INDEX idx_api_tokens_user_id_created_at ON api_tokens (user_id, created_at);

-- +goose Down

DROP TABLE IF EXISTS api_tokens;
