package service

import (
	"context"
	"sync"
	"time"
)

type RateCache struct {
	mu              sync.RWMutex
	exchange        sync.RWMutex
	rate            *ExchangeService
	base            string
	conversionRates map[string]float64
	updatedAt       time.Time
}

func (r *RateCache) Refresh(ctx context.Context) error {
	data, err := r.rate.FetchRates(ctx, "RUB")
	if err != nil {
		return nil
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	r.conversionRates = data
	r.updatedAt = time.Now()
	return nil
}
