package service

import (
	"FinanceTracker/internal/model"
	"fmt"
	"strconv"
	"strings"
)

const chars = ".,"

func ParseQuickAdd(raw string) (amount int, name string, err error) {
	if len(raw) == 0 {
		return 0, "", model.ErrEmptyReq
	}
	res := strings.SplitN(raw, " ", 2)

	if strings.ContainsAny(res[0], chars) {
		return 0, "", model.ErrQuickAddDecimal
	}

	amount, err = strconv.Atoi(res[0])
	if err != nil {
		return 0, "", fmt.Errorf("parse amount: %w: %w", model.ErrQuickAddNoAmount, err)
	}

	if len(res) > 1 && res[1] != "" {
		name = strings.TrimSpace(res[1])
	}

	return amount, name, nil
}
