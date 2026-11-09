-- Разделяем два разных факта, которые до сих пор жили в одной колонке:
--   created_at — когда строка появилась в системе (аудит, менять нельзя)
--   spent_at   — когда деньги реально ушли (бизнес-факт, задаёт пользователь)

-- +goose Up

-- created_at хранился как naive timestamp, хотя запросы делают над ним
-- AT TIME ZONE — а эта конструкция на naive timestamp означает ровно обратное
-- тому, что задумано ("считай эти часы местными для зоны X" вместо "переведи
-- момент в часы зоны X"). Пока сервер и пользователь в одной зоне, ошибка
-- схлопывается; для пользователя из другой зоны даты уезжают на сдвиг.
--
-- Приведение опирается на текущий TimeZone сервера, и это верно: значения
-- писались через CURRENT_TIMESTAMP этим же сервером с той же настройкой.
-- Единственное место во всей миграции, где живёт это допущение.
ALTER TABLE expenses ALTER COLUMN created_at TYPE timestamptz;

-- Колонка рождается nullable и без DEFAULT: значения для уже существующих
-- строк придут из бэкфилла ниже, а не из now(). Иначе вся история схлопнулась
-- бы в день применения миграции.
ALTER TABLE expenses ADD COLUMN spent_at timestamptz;

-- До сих пор created_at означал и «когда записано», и «когда потрачено».
-- Разрезая колонку надвое, отдаём старое значение обеим половинам.
-- После конвертации выше это честное копирование timestamptz -> timestamptz,
-- без неявных приведений.
UPDATE expenses SET spent_at = created_at;

-- Ужесточаем только теперь: SET NOT NULL не встанет, пока в колонке есть NULL.
ALTER TABLE expenses ALTER COLUMN spent_at SET NOT NULL;

-- А вот для будущих вставок now() как раз верен: добавили трату без явной даты —
-- значит потратили сейчас.
ALTER TABLE expenses ALTER COLUMN spent_at SET DEFAULT now();

-- Все запросы к expenses — это «траты пользователя N за период»: по user_id
-- всегда равенство, по spent_at диапазон или сортировка. Поэтому user_id
-- первым: индекс работает слева направо, и обратный порядок заставил бы
-- перебирать даты всех пользователей сразу.
-- DESC не нужен — btree читается в обе стороны, ORDER BY spent_at DESC
-- использует этот же индекс, просто сканируя его с конца.
CREATE INDEX idx_expenses_user_id_spent_at ON expenses (user_id, spent_at);

-- +goose Down

-- Зеркально к Up. DROP COLUMN снёс бы индекс и сам, но явный DROP INDEX
-- избавляет читателя от необходимости это помнить.
DROP INDEX IF EXISTS idx_expenses_user_id_spent_at;
ALTER TABLE expenses DROP COLUMN IF EXISTS spent_at;
ALTER TABLE expenses ALTER COLUMN created_at TYPE timestamp;
