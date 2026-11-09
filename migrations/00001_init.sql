-- Базовая схема: состояние таблиц до первой «настоящей» миграции.
-- На VPS эти таблицы создавались вручную, поэтому эта миграция там
-- помечается как применённая и не выполняется. Нужна для чистой базы.

-- +goose Up

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    login         VARCHAR(25),
    email         VARCHAR(255),
    password_hash VARCHAR(70),
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- created_at здесь намеренно naive timestamp: в timestamptz его
-- переводит следующая миграция 00002_add_spent_at.sql.
CREATE TABLE expenses (
    id         SERIAL PRIMARY KEY,
    amount     INTEGER NOT NULL,
    title      VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    user_id    INTEGER REFERENCES users(id)
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- +goose Down

-- Сначала expenses: она ссылается на users через внешний ключ.
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS users;