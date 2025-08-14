package main

import (
	"database/sql"
	"fmt"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db, err := sql.Open("sqlite3", "gophish.db")
	if err != nil {
		fmt.Println("Error opening gophish.db:", err)
		return
	}
	defer db.Close()

	_, err = db.Exec(`ALTER TABLE events ADD COLUMN is_screened BOOLEAN DEFAULT 0;`)
	if err != nil {
		fmt.Println("Error running ALTER TABLE:", err)
		return
	}
	fmt.Println("Added column is_screened successfully.")
}
