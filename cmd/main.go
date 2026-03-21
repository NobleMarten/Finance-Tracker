package main

import (
	"FinanceTracker/internal/service"
	"FinanceTracker/internal/storage"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

func printhelp() {
	fmt.Println("-- finance tracker --")
	fmt.Println("add - create new expense")
	fmt.Println("list - show list expense")
	fmt.Println("delete - delete expense by id")
}

func main() {
	repo := storage.NewFileStorage("data/expenses.json")
	svc, err := service.NewItemService(*repo)
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
		if len(os.Args) < 4 {
			fmt.Println("usage: add \"expense title, amount\"")
			return
		}

		flagset := flag.NewFlagSet("add", flag.ExitOnError)

		var title string
		flagset.StringVar(&title, "title", "", "help message for --title")
		var amount int
		flagset.IntVar(&amount, "amount", 0, "help message for --amount")

		flagset.Parse(os.Args[2:])

		expense, err := svc.Add(title, amount)
		if err != nil {
			fmt.Println("error: ", err)
		}

		fmt.Println("added: ", expense)

	case "list":
		list, err := svc.List()
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

		flagset := flag.NewFlagSet("delete", flag.ExitOnError)

		var id int
		flagset.IntVar(&id, "id", 0, "help message for --id")

		flagset.Parse(os.Args[2:])

		res, err := svc.Delete(id)
		if err != nil {
			fmt.Println("error: ", err)
		}

		fmt.Println(res)

	case "update":
		if len(os.Args) < 4 {
			fmt.Println("usage: update \"expense id, title\"")
		}

		flagset := flag.NewFlagSet("update", flag.ExitOnError)

		var id int
		flagset.IntVar(&id, "id", 0, "help message for --id")
		var title string
		flagset.StringVar(&title, "title", "", "help message for --title")

		title = strings.Join(os.Args[5:], " ")
		fmt.Println(title)

		flagset.Parse(os.Args[2:])

		expense, err := svc.Update(id, title)
		if err != nil {
			fmt.Println("error: ", err)
		}

		fmt.Println("update expense:", expense)

	case "clear":
		str, err := svc.Clear()
		if err != nil {
			fmt.Println("error: ", err)
		}
		fmt.Println(str)
	case "summary":

	}

}
