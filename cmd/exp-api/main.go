package main

import (
	"FinanceTracker/internal/config"
	"FinanceTracker/internal/db"
	"FinanceTracker/internal/service"
	"FinanceTracker/internal/transport"
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	base := os.Getenv("RateURL")

	conf, err := config.NewConfig()
	if err != nil {
		panic(err)
	}

	repo, err := db.NewPostgresRepo(conf.DBURL)
	if err != nil {
		panic(err)
	}

	svc, err := service.NewItemService(repo)
	if err != nil {
		panic(err)
	}

	exsvc := service.NewExchangeService(base)
	h := transport.NewHandler(svc, exsvc)

	r := chi.NewRouter()

	r.Use(transport.MyCors)

	h.RegisterRouteres(r)

	srv := &http.Server{
		Addr:    conf.Host,
		Handler: r,
	}

	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM) // SIGINT - Ctrl+C, SIGTERM - kill

	go func() {
		println("Server is running on ", conf.Host)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			println("Server error: ", err)
		}
	}()

	<-ch
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server shutdown error: ", err)
	}
	println("Server stopped")

}
