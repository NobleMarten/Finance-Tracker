package main

import (
	"FinanceTracker/internal/config"
	"FinanceTracker/internal/db"
	"FinanceTracker/internal/service"
	"FinanceTracker/internal/transport"
	"log"
	"net/http"
	"os"

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

	h.RegisterRouteres(r)

	println("Server is running on ", conf.Host)
	log.Fatal(http.ListenAndServe(conf.Host, r))

}
