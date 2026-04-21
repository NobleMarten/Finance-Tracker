package main

import (
	"FinanceTracker/internal/config"
	"FinanceTracker/internal/db"
	"FinanceTracker/internal/model"
	"FinanceTracker/internal/service"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

func printhelp() {
	fmt.Println("-- finance tracker --")
	fmt.Println("add - create new expense")
	fmt.Println("list - show list expense")
	fmt.Println("delete - delete expense by id")
}

func main() {
	// repo := storage.NewFileStorage("data/expenses.json")

	godotenv.Load()

	conf, err := config.NewConfig()
	if err != nil {
		log.Fatal(err)
	}

	repo, err := db.NewPostgresRepo(conf.DBURL)
	if err != nil {
		log.Fatal(err)
	}

	svc, err := service.NewItemService(repo)
	if err != nil {
		log.Fatal(err)
	}

	if len(os.Args) < 2 {
		printhelp()
		return
	}

	cmd := os.Args[1]

	switch cmd {

	case "help":
		printhelp()

	case "add":
		if len(os.Args) < 3 {
			fmt.Println("usage: add \"expense title, amount\"")
			return
		}

		ctx := context.Background()

		flagset := flag.NewFlagSet("add", flag.ExitOnError)
		var amount int
		flagset.IntVar(&amount, "amount", 0, "help message for --amount")
		var title string
		flagset.StringVar(&title, "title", "", "help message for --title")

		flagset.Parse(os.Args[2:])

		expense, err := svc.Add(ctx, amount, title)
		if err != nil {
			fmt.Println("error: ", err)
		}

		fmt.Println("added: ", expense)

	case "list":
		ctx := context.Background()
		list, err := svc.List(ctx)
		if err != nil {
			fmt.Println("error: ", err)
			return
		}
		fmt.Printf("%-5s %-12s %-10s %-10s", "ID", "CreatedAt", "Title", "Amount")
		for _, exp := range list {
			fmt.Printf("\n%-5d %-12s %-10s %-15d", exp.ID, exp.CreatedAt.Format(time.DateOnly), exp.Title, exp.Amount)
		}
		fmt.Println()

	case "delete":
		if len(os.Args) < 3 {
			fmt.Println("usage: delete \"expense id\"")
		}

		ctx := context.Background()

		flagset := flag.NewFlagSet("delete", flag.ExitOnError)

		var id int
		flagset.IntVar(&id, "id", 0, "help message for --id")

		flagset.Parse(os.Args[2:])

		res, err := svc.Delete(ctx, id)
		if err != nil {
			fmt.Println("error: ", err)
		}

		fmt.Println(res)

	case "update":
		if len(os.Args) < 4 {
			fmt.Println("usage: update \"expense id, title\"")
		}

		flagset := flag.NewFlagSet("update", flag.ExitOnError)

		var UpdateAmount *int
		var UpdateTitle *string

		var id int
		flagset.IntVar(&id, "id", 0, "help message for --id")
		var title string
		flagset.StringVar(&title, "title", "", "help message for --title")
		var amount int
		flagset.IntVar(&amount, "amount", -1, "help message for --amount")

		// fmt.Println(title)

		flagset.Parse(os.Args[2:])

		if amount != -1 {
			UpdateAmount = &amount
		}

		if title != "" {
			UpdateTitle = &title
		}
		ctx := context.Background()

		expense, err := svc.Update(ctx, id, UpdateAmount, UpdateTitle) // передаем указатели на новые значения
		if err != nil {
			fmt.Println("error: ", err)
		}

		fmt.Println("update expense:", expense)

	case "clear":
		ctx := context.Background()
		err := svc.Clear(ctx)
		if err != nil {
			fmt.Println("error: ", err)
		}
		fmt.Println("all expenses cleared")

	case "summary":
		if len(os.Args) < 2 {
			fmt.Println("usage: summary \"--month\"")
			return
		}
		ctx := context.Background()
		if len(os.Args) == 2 {
			sum, err := svc.Summary(ctx, 0)
			if err != nil {
				fmt.Println("error: ", err)
			}
			fmt.Printf("Total expenses: %d\n", sum)
		}
		if len(os.Args) > 2 {
			var month int
			flagset := flag.NewFlagSet("month", flag.ExitOnError)
			flagset.IntVar(&month, "month", 0, "help message for --month")

			flagset.Parse(os.Args[2:])
			if month < 1 || month > 12 {
				fmt.Println("error: ", model.ErrInvalidMonth)
				return
			}

			sum, err := svc.Summary(ctx, month)
			if err != nil {
				fmt.Println("error: ", err)
			}

			fmt.Printf("Total expenses for month %d: %d\n", month, sum)
		}

	}

}
