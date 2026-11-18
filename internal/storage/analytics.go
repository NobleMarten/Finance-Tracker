package storage

import (
	"FinanceTracker/internal/model"
	"context"
	"encoding/json"
	"fmt"
	"time"
)

// One statement gives all charts the same PostgreSQL snapshot. Its response
// has at most 366 yearly days, 31 monthly days, 6 months, 3 title groups and
// 3 top expenses; its size does not grow with the number of expenses.
// The inlined source lets each consumer use its own indexed date range.
const analyticsQuery = `WITH source AS NOT MATERIALIZED (
    SELECT id, amount, title, created_at, user_id, spent_at,
           (spent_at AT TIME ZONE $8)::date AS local_day
    FROM expenses
    WHERE user_id = $1
), month_rows AS MATERIALIZED (
    SELECT * FROM source WHERE spent_at >= $2 AND spent_at < $3
), metrics AS (
    SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total,
           COALESCE(ROUND(AVG(amount)), 0)::bigint AS avg_check,
           COALESCE(ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY amount))::numeric), 0)::bigint AS median
    FROM month_rows
), month_days AS (
    SELECT local_day AS date, SUM(amount) AS amount, COUNT(*) AS count
    FROM month_rows GROUP BY local_day
), year_days AS (
    SELECT local_day AS date, SUM(amount) AS amount, COUNT(*) AS count
    FROM source WHERE spent_at >= $4 AND spent_at < $5 GROUP BY local_day
), frequent AS MATERIALIZED (
    SELECT lower(btrim(title)) AS key, min(btrim(title)) AS title,
           COUNT(*) AS count, SUM(amount) AS sum, COUNT(DISTINCT local_day) AS days
    FROM month_rows WHERE btrim(title) <> '' AND title <> 'Untitled'
    GROUP BY lower(btrim(title)) HAVING COUNT(*) >= 2
    ORDER BY count DESC, sum DESC, key LIMIT 3
), frequent_days AS (
    SELECT lower(btrim(m.title)) AS key, m.local_day AS date,
           SUM(m.amount) AS amount, COUNT(*) AS count
    FROM month_rows m JOIN frequent f ON lower(btrim(m.title)) = f.key
    GROUP BY lower(btrim(m.title)), m.local_day
), large AS (
    SELECT COUNT(*) AS count, COALESCE(SUM(r.amount), 0) AS sum
    FROM month_rows r CROSS JOIN metrics m
    WHERE m.count >= 4 AND m.median > 0 AND r.amount::bigint >= m.median * 3
), trend_months AS (
    SELECT EXTRACT(YEAR FROM local_day)::int AS year,
           EXTRACT(MONTH FROM local_day)::int AS month, SUM(amount) AS amount
    FROM source WHERE spent_at >= $6 AND spent_at < $7
    GROUP BY 1, 2
), top_rows AS (
    SELECT id, amount, title, created_at, user_id, spent_at FROM month_rows
    ORDER BY amount DESC, spent_at DESC, id DESC LIMIT 3
)
SELECT jsonb_build_object(
    'daily', (SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.date), '[]'::jsonb) FROM month_days d),
    'year_daily', (SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.date), '[]'::jsonb) FROM year_days d),
    'trend', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.year, t.month), '[]'::jsonb) FROM trend_months t),
    'topexp', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.amount DESC, t.spent_at DESC, t.id DESC), '[]'::jsonb) FROM top_rows t),
    'currentmonth', m.total,
    'prevmonth', (SELECT COALESCE(SUM(amount), 0) FROM source WHERE spent_at >= $9 AND spent_at < $2),
    'avgday', COALESCE(m.total / NULLIF((SELECT COUNT(*) FROM month_days), 0), 0),
    'insights', jsonb_build_object(
        'total', m.total, 'count', m.count, 'avg_check', m.avg_check, 'median', m.median,
        'large', CASE WHEN m.count >= 4 AND m.median > 0 THEN jsonb_build_object(
            'threshold', m.median * 3, 'sum', l.sum, 'count', l.count,
            'share', COALESCE(ROUND(100.0 * l.sum / NULLIF(m.total, 0)), 0)
        ) ELSE NULL END,
        'frequent', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'key', f.key, 'title', f.title, 'count', f.count, 'sum', f.sum, 'days', f.days,
            'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'date', d.date, 'amount', d.amount, 'count', d.count
            ) ORDER BY d.date), '[]'::jsonb) FROM frequent_days d WHERE d.key = f.key)
        ) ORDER BY f.count DESC, f.sum DESC, f.key), '[]'::jsonb) FROM frequent f)
    )
) FROM metrics m CROSS JOIN large l`

func (p *PostgresRepo) Analytics(ctx context.Context, month, year, userID int, tz string) (model.Analytics, error) {
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return model.Analytics{}, model.ErrInvalidTimezone
	}
	from := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, loc)
	yearFrom := time.Date(year, time.January, 1, 0, 0, 0, 0, loc)
	now := time.Now().In(loc)
	trendTo := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, loc)
	trendFrom := trendTo.AddDate(0, -6, 0)
	var payload []byte
	if err := p.DB.QueryRowContext(ctx, analyticsQuery, userID, from, from.AddDate(0, 1, 0),
		yearFrom, yearFrom.AddDate(1, 0, 0), trendFrom, trendTo, tz, from.AddDate(0, -1, 0)).Scan(&payload); err != nil {
		return model.Analytics{}, fmt.Errorf("load analytics: %w", err)
	}
	var result model.Analytics
	if err := json.Unmarshal(payload, &result); err != nil {
		return model.Analytics{}, fmt.Errorf("decode analytics: %w", err)
	}
	amounts := make(map[int]int, len(result.Trend))
	for _, month := range result.Trend {
		amounts[month.Year*12+month.Month] = month.Amount
	}
	result.Trend = make([]model.MonthlyAggregate, 0, 6)
	for month := trendFrom; month.Before(trendTo); month = month.AddDate(0, 1, 0) {
		result.Trend = append(result.Trend, model.MonthlyAggregate{
			Year: month.Year(), Month: int(month.Month()),
			Amount: amounts[month.Year()*12+int(month.Month())],
		})
	}
	return result, nil
}

// DailyRange supports calendar charts without fetching individual expenses.
func (p *PostgresRepo) DailyRange(ctx context.Context, from, to time.Time, userID int, tz string) ([]model.DailyAggregate, error) {
	const query = `SELECT (spent_at AT TIME ZONE $4)::date::text, SUM(amount), COUNT(*)
        FROM expenses WHERE user_id = $1 AND spent_at >= $2 AND spent_at < $3
        GROUP BY (spent_at AT TIME ZONE $4)::date ORDER BY 1`
	rows, err := p.DB.QueryContext(ctx, query, userID, from, to, tz)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]model.DailyAggregate, 0)
	for rows.Next() {
		var day model.DailyAggregate
		if err := rows.Scan(&day.Date, &day.Amount, &day.Count); err != nil {
			return nil, err
		}
		result = append(result, day)
	}
	return result, rows.Err()
}
