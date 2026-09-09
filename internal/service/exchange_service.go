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

func (c *ExchangeService) GetRate(ctx context.Context, from, to string) (float64, error) {
	if c.apikey == "" {
		return 0, model.ErrEmptyAPIKey
	}
	url := c.baseURL + c.apikey + "/latest/" + from
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("get response %w: %w", model.ErrRateUnavailable, err)
	}
	defer resp.Body.Close()

	var data Convert

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return 0, err
	}

	rate, ok := data.СonversionRates[to]
	if !ok {
		return 0, model.ErrInvalidCurrency
	}

	return rate, nil
}
