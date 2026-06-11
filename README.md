# Finance Tracker

Personal expense tracking app with JWT auth, multi-currency support and monthly analytics.

> **Stack:** Go · Chi · PostgreSQL · React 18 · Tailwind CSS · Docker


<img src="docs/screen1.png" width="350" />

---

## Architecture

Clean Architecture — transport → service → storage. All domain types live in `internal/model/` as a single source of truth.

```
cmd/
  exp-api/        # HTTP server entrypoint
  exp-cli/        # CLI tool: add, list, delete, update, clear, summary
internal/
  config/         # Env config loader
  model/          # Domain models and errors
  service/        # Business logic + unit tests (MockRepo)
  storage/        # PostgreSQL repositories (pgx)
  transport/      # HTTP handlers, JWT middleware, error mapping
frontend/
  src/
    api/          # Fetch wrappers
    components/   # Dashboard, History, AddExpense, EditExpense
    context/      # AuthContext — JWT in localStorage
    hooks/        # useTransactions
    pages/        # Login, Register, ForgotPassword
    utils/        # Formatting, API error handling
```

## Running locally

**Docker (recommended)**

```bash
cp .env.example .env
docker compose up --build
```

| Service  | Port |
|----------|------|
| API      | 8081 |
| Frontend | 3000 |
| Postgres | 5433 |

**Without Docker**

```bash
# Backend
go run ./cmd/exp-api/main.go

# Frontend (separate terminal)
cd frontend && npm install && npm run dev  # http://localhost:5173
```

## Environment variables

```env
DBURL=postgres://user:password@host:port/dbname
HOST=localhost:8080
JWT_SECRET=your_secret_key
RateURL=https://v6.exchangerate-api.com/v6/
RateKey=your_api_key
```

## Testing

```bash
go test ./...                              # all tests
go test ./internal/service/...            # service layer only
go test ./internal/service/ -run TestAdd  # single test
```

## API

Base URL: `http://localhost:8080`

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/register` | Register |
| `POST` | `/api/login` | Login, returns JWT |

### Expenses — require `Authorization: Bearer <token>`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/expenses` | List all expenses |
| `POST` | `/api/expenses` | Create expense |
| `PATCH` | `/api/expenses/{id}` | Update expense |
| `DELETE` | `/api/expenses/{id}` | Delete expense |
| `POST` | `/api/expenses/clear` | Delete all expenses |
| `GET` | `/api/expenses/summary` | Monthly summary with USD conversion |
| `GET` | `/api/expenses/daily-total` | Daily totals by month |
| `GET` | `/api/expenses/top` | Top expenses |

### Other

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/rate?from=RUB&to=USD` | Live exchange rate |

---

## Author

Kirill — [github.com/NobleMarten](https://github.com/NobleMarten)
