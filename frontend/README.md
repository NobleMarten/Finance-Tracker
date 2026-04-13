# Finance Tracker — Frontend

## Быстрый старт

```bash
npm install
npm run dev
```

## Переменные окружения

В файле `.env` укажи адрес твоего Go-бэкенда:

```
VITE_API_URL=http://localhost:8080
```

## Структура

```
src/
├── api/
│   └── api.js              # fetch-обёртки для Go REST API
├── components/
│   ├── Dashboard.jsx       # главный экран (день / неделя / месяц)
│   ├── History.jsx         # история с фильтром Day/Month/Year
│   ├── AddExpense.jsx      # экран добавления с нумпадом
│   └── BottomNav.jsx       # нижняя навигация
├── hooks/
│   └── useTransactions.js  # состояние транзакций + API-вызовы
├── utils/
│   └── format.js           # форматирование чисел, дат, приветствие
├── App.jsx
├── main.jsx
└── index.css
```

## Что ожидает бэкенд

`GET /transactions` → массив объектов:
```json
[{ "id": 1, "amount": 258, "description": "Coffee", "created_at": "2026-04-10T14:06:00Z" }]
```

`POST /transactions` → тело:
```json
{ "amount": 258, "description": "Coffee" }
```

`DELETE /transactions/:id` → 204 No Content

## Важно — CORS

Добавь в Go-бэкенд CORS middleware перед роутами:

```go
import "github.com/go-chi/cors"

r.Use(cors.Handler(cors.Options{
    AllowedOrigins: []string{"http://localhost:5173"},
    AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowedHeaders: []string{"Content-Type"},
}))
```
