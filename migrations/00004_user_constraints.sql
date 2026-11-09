-- +goose Up

-- Пользователь без логина, почты или пароля не имеет смысла.
ALTER TABLE users ALTER COLUMN login SET NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Уникальность проверяет база, атомарно: проверка в коде
-- пропустила бы два одновременных запроса на регистрацию.
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT users_login_key UNIQUE (login);

-- Трата без владельца не имеет смысла.
ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;

-- RLS был включён без политик и ни на что не влиял:
-- владелец таблицы его обходит.
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- +goose Down

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_login_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN login DROP NOT NULL;