# Finance-Tracker

# 💸 Finance Tracker

Веб-приложение для учёта личных финансов с поддержкой нескольких валют, фильтрацией по месяцам и сводной статистикой расходов.

## Стек технологий

**Backend**
- [Go](https://golang.org/) — основной язык
- [Chi](https://github.com/go-chi/chi) — HTTP-роутер
- [pgx](https://github.com/jackc/pgx) — драйвер PostgreSQL
- [PostgreSQL](https://www.postgresql.org/) (Supabase) — база данных
- [open.er-api.com](https://www.exchangerate-api.com/) — API курсов валют

**Frontend**
- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- Fetch API для взаимодействия с бэкендом

---

## Структура проекта

```
finance-tracker/
├── cmd/
│   └── main.go               # Точка входа
├── internal/
│   ├── db/
│   │   └── db.go             # Работа с БД (CRUD)
│   ├── service/
│   │   └── service.go        # Бизнес-логика, конвертация валют
│   └── transport/
│       ├── handler.go        # HTTP-обработчики
│       ├── middleware.go     # CORS и прочие middleware
│       └── router.go         # Регистрация маршрутов
├── frontend/
│   ├── src/
│   │   ├── components/       # UI-компоненты (Dashboard, History, AddExpense)
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── .env                      # Переменные окружения (не коммитить)
├── .env.example
└── go.mod
```

---

## Переменные окружения

Создай файл `.env` в корне проекта на основе `.env.example`:

```env
DATABASE_URL=postgres://user:password@host:port/dbname
PORT=8080
```

---

## Запуск локально

### Backend

```bash
# Установить зависимости
go mod tidy

# Запустить сервер
go run ./cmd/main.go
```

Сервер запустится на `http://localhost:8080`.

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Фронтенд запустится на `http://localhost:5173`.

---

## API

Базовый URL: `http://localhost:8080`

### Расходы

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/expenses` | Получить все расходы |
| `GET` | `/expenses/{id}` | Получить расход по ID |
| `POST` | `/expenses` | Создать новый расход |
| `DELETE` | `/expenses/{id}` | Удалить расход |

### Сводка

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/summary` | Общая сводка расходов |
| `GET` | `/summary?month=3` | Сводка за конкретный месяц |

---

### Примеры запросов

**Создать расход**

```http
POST /expenses
Content-Type: application/json

{
  "amount": 1500,
  "currency": "RUB",
  "category": "Food",
  "description": "Продукты"
}
```

**Ответ**

```json
{
  "id": 1,
  "amount": 1500,
  "created_at": "2026-04-19T12:00:00Z"
}
```

**Получить сводку за март**

```http
GET /summary?month=3
```

**Ответ**

```json
{
  "total": 142.50,
}
```

---

## Автор

Kirill — [GitHub](https://github.com/)