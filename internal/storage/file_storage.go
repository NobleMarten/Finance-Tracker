package storage

import (
	"FinanceTracker/internal/model"
	"encoding/json"
	"os"
)

type Storage interface {
	Load() ([]model.Expense, error)
	Save([]model.Expense) error
}

type FileStorage struct {
	path string
}

func NewFileStorage(path string) *FileStorage {
	return &FileStorage{path: path}
}

func (fs *FileStorage) Load() ([]model.Expense, error) {
	data, err := os.ReadFile(fs.path)
	if err != nil {
		// if errors.Is(err, os.ErrNotExist) {
		// 	return []model.Expense{}, os.ErrNotExist
		// }
		// return nil, err
		return []model.Expense{}, nil
	}
	if len(data) == 0 {
		return []model.Expense{}, nil
	}
	var Items []model.Expense
	err = json.Unmarshal(data, &Items)
	if err != nil {
		return nil, err
	}
	return Items, nil
}

func (fs *FileStorage) Save(items []model.Expense) error {
	data, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(fs.path, data, 0644); err != nil {
		return err
	}
	return nil
}
