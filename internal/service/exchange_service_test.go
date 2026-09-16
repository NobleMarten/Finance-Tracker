package service

import (
	"FinanceTracker/internal/model"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestExchangeRate(t *testing.T) {

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
	}))
	defer srv.Close()

	svc := &ExchangeService{
		client:  &http.Client{Timeout: 50 * time.Millisecond},
		baseURL: srv.URL + "/",
		apikey:  "testkey",
	}

	_, err := svc.GetRate(context.Background(), "USD", "RUB")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, model.ErrRateUnavailable) {
		t.Fatalf("expected ErrRateUnavailable, got %v", err)
	}
}

func TestExchangeRateCtxCancel(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(500 * time.Millisecond)
	}))
	defer srv.Close()

	ctx, cancel := context.WithCancel(context.Background())
	timer := time.AfterFunc(50*time.Millisecond, cancel)
	defer timer.Stop()

	svc := &ExchangeService{
		client:  &http.Client{Timeout: 500 * time.Millisecond},
		baseURL: srv.URL + "/",
		apikey:  "testkey",
	}

	_, err := svc.GetRate(ctx, "USD", "RUB")
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
}
