package service

import (
	"FinanceTracker/internal/model"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type ExchangeService struct {
	client  *http.Client
	baseURL string
	apikey  string
}

type Convert struct {
	СonversionRates map[string]float64 `json:"conversion_rates"`
}

func NewExchangeService(baseURL string) *ExchangeService {
	return &ExchangeService{
		client:  &http.Client{Timeout: 10 * time.Second},
		baseURL: baseURL,
		apikey:  os.Getenv("RateKey"),
	}
}

func (c *ExchangeService) FetchRates(ctx context.Context, base string) (map[string]float64, error) {
	if c.apikey == "" {
		return nil, model.ErrEmptyAPIKey
	}
	url := c.baseURL + c.apikey + "/latest/" + base
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get response %w: %w", model.ErrRateUnavailable, err)
	}
	defer resp.Body.Close()

	var data map[string]float64

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	// rate, ok := data.СonversionRates[to]
	// if !ok {
	// 	return nil, model.ErrInvalidCurrency
	// }

	return data, nil
}
