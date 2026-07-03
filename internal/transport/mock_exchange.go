package transport

import "context"

type MockExchange struct {
	GetRateFunc func(ctx context.Context, from, to string) (float64, error)
}

func (m *MockExchange) GetRate(ctx context.Context, from, to string) (float64, error) {
	return m.GetRateFunc(ctx, from, to)
}
