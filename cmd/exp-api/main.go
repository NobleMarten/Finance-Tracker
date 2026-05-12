package main

import (
	"FinanceTracker/internal/config"
	"FinanceTracker/internal/db"
	"FinanceTracker/internal/service"
	"FinanceTracker/internal/storage"
	"FinanceTracker/internal/transport"
	"context"
	"log/slog"
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
	repoUser, err := storage.NewPostgresUserRepo(conf.DBURL)
	if err != nil {
		panic(err)
	}

	svc := service.NewItemService(repo)
	usvc := service.NewUserService(repoUser, []byte(conf.JWTSecret))

	exsvc := service.NewExchangeService(base)
	uh := transport.NewUserHandler(usvc)

	h := transport.NewHandler(svc, exsvc)

	r := chi.NewRouter()

	r.Use(transport.MyCors)

	h.RegisterRouteres(r)
	uh.RegisterHandler(r)

	srv := &http.Server{
		Addr:    conf.Host,
		Handler: r,
	}

	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM) // SIGINT - Ctrl+C, SIGTERM - kill

	go func() {
		slog.Info("Server is running on ", "host", conf.Host)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server error: ", "error", err)
		}
	}()

	<-ch
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Server shutdown error: ", "error", err)
	}
	slog.Info("Server stopped")
}
