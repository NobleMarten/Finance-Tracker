# Finance-Tracker

# 💸 Finance Tracker

Веб-приложение для учёта личных финансов с JWT-авторизацией, поддержкой нескольких валют, фильтрацией по месяцам и сводной статистикой расходов.

## Стек технологий

**Backend**
- [Go](https://golang.org/) — основной язык
- [Chi](https://github.com/go-chi/chi) — HTTP-роутер
- [pgx](https://github.com/jackc/pgx) — драйвер PostgreSQL
- [PostgreSQL](https://www.postgresql.org/) (Supabase) — база данных
- [golang-jwt](https://github.com/golang-jwt/jwt) — JWT авторизация
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
│   ├── exp-api/
│   │   └── main.go               # Точка входа HTTP-сервера
│   └── exp-cli/
│       └── main.go               # CLI-клиент (add, list, delete, update, summary)
├── internal/
│   ├── config/
│   │   └── config.go             # Загрузка конфига из env
│   ├── model/
│   │   ├── expense.go            # Модель расхода
│   │   ├── User.go               # Модель пользователя
│   │   └── errors.go             # Доменные ошибки
│   ├── service/
│   │   ├── service.go            # Бизнес-логика расходов
│   │   ├── user_service.go       # Бизнес-логика пользователей, JWT
│   │   ├── exchange_service.go   # Получение курсов валют
│   │   ├── mock_repo.go          # Мок репозитория для тестов
│   │   └── service_test.go       # Юнит-тесты сервисного слоя
│   ├── storage/
│   │   ├── db.go                 # Подключение к БД, конструкторы репозиториев
│   │   ├── PostgresRepo.go       # SQL-запросы для расходов
│   │   └── UserRepo.go           # SQL-запросы для пользователей
│   └── transport/
│       ├── handler.go            # HTTP-обработчики расходов
│       ├── user_handler.go       # HTTP-обработчики авторизации
│       ├── middleware.go         # CORS, JWT middleware
│       └── ErrorHelpers.go       # Маппинг ошибок в HTTP-статусы
├── frontend/
│   ├── src/
│   │   ├── api/                  # Fetch-запросы к бэкенду
│   │   ├── components/           # Dashboard, History, AddExpense, EditExpense и др.
│   │   ├── context/              # AuthContext (JWT в localStorage)
│   │   ├── hooks/                # useTransactions
│   │   ├── pages/                # Login, Register, ForgotPassword
│   │   └── utils/                # Форматирование, обработка ошибок API
│   ├── index.html
│   └── package.json
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── go.mod
```

---

## Переменные окружения

```env
DBURL=postgres://user:password@host:port/dbname
HOST=localhost:8080
JWT_SECRET=your_secret_key
RateURL=https://v6.exchangerate-api.com/v6/
RateKey=your_api_key
```

---

## Запуск локально

### Backend

```bash
go mod tidy
go run ./cmd/exp-api/main.go
```

Сервер запустится на `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Фронтенд запустится на `http://localhost:5173`.

### Docker

```bash
docker compose up --build
```

API: `8081`, React: `3000`, PostgreSQL: `5433`.

---

## API

Базовый URL: `http://localhost:8080`

### Авторизация

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/register` | Регистрация нового пользователя |
| `POST` | `/api/login` | Вход, возвращает JWT-токен |
| `POST` | `/api/auth/forgot-password` | Запрос сброса пароля (заглушка) |

### Расходы (требуют `Authorization: Bearer <token>`)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/expenses` | Список всех расходов пользователя |
| `POST` | `/api/expenses` | Создать расход |
| `PATCH` | `/api/expenses/{id}` | Обновить расход |
| `DELETE` | `/api/expenses/{id}` | Удалить расход |
| `POST` | `/api/expenses/clear` | Удалить все расходы пользователя |
| `GET` | `/api/expenses/summary` | Сводка расходов (с конвертацией в USD) |

### Прочее

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/rate?from=RUB&to=USD` | Текущий курс валют |

---

## Автор

Kirill — [GitHub](https://github.com/)
