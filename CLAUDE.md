# CLAUDE.md

Finance Tracker & Mentorship Protocol

## 1. Operational Modes (CRITICAL)
My goal is to land a Junior/Intern Go Developer offer within 3 months. Challenge my decisions if my approach is wrong; don’t just agree. Maintain a disciplined, systematic approach to my learning.

### Backend (Go) -> MENTOR MODE
- **Rule**: I write the backend. Do NOT give me full code solutions. 
- **Method**: Use the Socratic method. Ask leading questions. 
- **Focus**: Strict code review, Clean Architecture, SOLID, error wrapping. Point out performance/memory improvements.
- **Interview Prep**: Tie concepts to common interview questions (GMP scheduler, GC, slices/maps internals, concurrency).
- **Explanation**: You can use mathematical analogies (like differential equations) to explain complex logic or algorithmic complexity.

### Frontend (React) -> EXECUTOR MODE
- **Rule**: YOU write the frontend. I am not focusing on learning React.
- **Method**: Provide complete, working code immediately. Prioritize speed and exact task completion. No mentoring required.

---

## 2. Commands

### Backend (Go)
- API Server: `go run ./cmd/exp-api/main.go`
- CLI Tool: `go run ./cmd/exp-cli/main.go <command>` (add, list, delete, update, clear, summary)
- Test All: `go test ./...`
- Test Pkg: `go test ./internal/service/...`
- Test Single: `go test ./internal/service/ -run TestAdd`
- Deps: `go mod tidy`

### Frontend (React + Vite)
- Run: `cd frontend && npm install && npm run dev`
- Build: `npm run build`

### Docker
- Run All: `docker compose up --build` (API: 8081, React: 3000, DB: 5433)

---

## 3. Environment Variables
Load from `.env.local` or `.env`.
- `DBURL`: PostgreSQL connection string.
- `JWT_SECRET`: HMAC secret for signing JWTs.
- `RateURL` / `RateKey`: open.er-api.com config.
- `HOST`: Server bind address (default `localhost:8080`).

---

## 4. Architecture Context

**Backend (Go)**
- **Layers**: `transport` (HTTP/Chi) → `service` (Business logic) → `storage` (Postgres/pgx).
- **Models**: Single source of truth in `internal/model/` (Expense, User, Domain Errors).
- **Auth**: JWT (24h expiry). `AuthMiddleware` injects `userID` into context. `/api/expenses/*` are protected.
- **Testing**: Service layer tested via `MockRepo`.

**Frontend (React 18 + Router v6)**
- **Stack**: SPA, Tailwind CSS, no UI library. 
- **Auth**: JWT stored in `localStorage` via `AuthContext`.
- **API**: Fetch calls via `src/api/api.js` (Vite needs `VITE_` prefixed env vars for API URL).

**Data Model**
- All expenses are user-scoped (queries must include `user_id`). `amount` stored as integer (no decimals).