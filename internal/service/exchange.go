package service

import (
	"FinanceTracker/internal/model"
	"context"
	"encoding/json"
	"net/http"
	"os"
)

type ExchangeService struct {
	client  http.Client
	baseURL string
	apikey  string
}

type Convert struct {
	СonversionRates map[string]float64 `json:"conversion_rates"`
}

func NewExchangeService(baseURL string) *ExchangeService {
	return &ExchangeService{
		client:  http.Client{},
		baseURL: baseURL,
		apikey:  os.Getenv("RateKey"),
	}
}

func (c *ExchangeService) GetRate(ctx context.Context, from, to string) (float64, error) {
	if c.apikey == "" {
		return 0, model.ErrEmptyAPIKey
	}
	url := c.baseURL + c.apikey + "/latest/" + from
	resp, err := c.client.Get(url)
	if err != nil {
		return 0, model.ErrInvalidAPIURL
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
