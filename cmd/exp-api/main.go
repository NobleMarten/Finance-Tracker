package main

import (
	"FinanceTracker/internal/config"
	"FinanceTracker/internal/db"
	"FinanceTracker/internal/service"
	"FinanceTracker/internal/transport"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
)

func main() {

	godotenv.Load()

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

	h := transport.NewHandler(svc)

	// http.HandleFunc("/expenses", h.Expenses) // добавляем обработчик для маршрута /expenses

	r := chi.NewRouter()

	h.RegisterRouteres(r)

	log.Fatal(http.ListenAndServe(conf.Host, nil))

}
