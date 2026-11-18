-- Add index to the user_id, spent_at, id column of the expenses table

-- +goose Up

CREATE INDEX idx_expenses_user_id_spent_at_id ON expenses (user_id, spent_at, id);
DROP INDEX IF EXISTS idx_expenses_user_id_spent_at;

-- +goose Down

CREATE INDEX idx_expenses_user_id_spent_at ON expenses (user_id, spent_at);
DROP INDEX IF EXISTS idx_expenses_user_id_spent_at_id;