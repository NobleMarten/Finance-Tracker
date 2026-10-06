package service

import (
	"FinanceTracker/internal/model"
	"context"
	"sync"
	"time"
)

type RateCache struct {
	mu              sync.RWMutex
	rate            *ExchangeService
	base            string
	conversionRates map[string]float64
	updatedAt       time.Time
}

func (r *RateCache) Refresh(ctx context.Context) error {
	data, err := r.rate.FetchRates(ctx, r.base)
	if err != nil {
		return err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	r.conversionRates = data
	r.updatedAt = time.Now()
	return nil
}

func (r *RateCache) GetRate(ctx context.Context, from, to string) (float64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.updatedAt.IsZero() {
		return 0, model.ErrRateUnavailable
	}

	if from != r.base {
		return 0, model.ErrInvalidCurrency
	}

	rate, ok := r.conversionRates[to]
	if !ok {
		return 0, model.ErrInvalidCurrency
	}

	return rate, nil
}
