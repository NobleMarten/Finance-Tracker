package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

func TestRateCacheRefreshThenGet(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := w.Write([]byte(`{"conversion_rates":{"USD":0.0115,"EUR":0.0106}}`)); err != nil {
			t.Errorf("failed to write test response: %v", err)
		}
	}))

	svc := &RateCache{
		rate: &ExchangeService{
			client:  &http.Client{},
			baseURL: srv.URL + "/",
			apikey:  "testkey",
		},
		base: "RUB",
	}

	ctx := context.Background()

	_, err := svc.GetRate(ctx, "RUB", "USD")
	if err == nil {
		t.Fatalf("expected model.ErrRateUnavailable, got nil")
	}

	if err := svc.Refresh(ctx); err != nil {
		t.Fatalf("expected nil, got %v", err)
	}

	got, err := svc.GetRate(ctx, "RUB", "USD")
	if err != nil {
		t.Fatalf("expected got data, got error: %v, got %v, want %v", err, got, 0.0115)
	}
	if got != 0.0115 {
		t.Fatalf("got is not equal to 0.0115")
	}

}

func TestRateCacheRace(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := w.Write([]byte(`{"conversion_rates":{"USD":0.0115,"EUR":0.0106}}`)); err != nil {
			t.Errorf("failed to write test response: %v", err)
		}
	}))
	defer srv.Close()

	svc := &RateCache{
		rate: &ExchangeService{
			client:  &http.Client{},
			baseURL: srv.URL + "/",
			apikey:  "testkey",
		},
		base: "RUB",
	}
	ctx := context.Background()
	var wg sync.WaitGroup
	wg.Add(1)

	go func() {
		defer wg.Done()
		for i := 0; i < 100; i++ {
			err := svc.Refresh(ctx)
			if err != nil {
				t.Errorf("error: %v", err)
			}
		}
	}()

	err := svc.Refresh(ctx)
	if err != nil {
		t.Errorf("error: %v", err)
	}

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				_, err := svc.GetRate(ctx, "RUB", "USD")
				if err != nil {
					t.Errorf("error: %v", err)
				}
			}

		}()
	}
	wg.Wait()
}
