package transport

import (
	"FinanceTracker/internal/model"
	"encoding/json"
	"errors"
	"net/http"
)

func WriteError(w http.ResponseWriter, err error) {
	var status int
	var res ErrorResponse

	switch {
	case errors.Is(err, model.ErrEmptyTitle): //
		status = http.StatusBadRequest
		res = ErrorResponse{
			Code:    "EMPTY_TITLE",
			Message: err.Error(),
		}
	case errors.Is(err, model.ErrTooLongTitle):
		status = http.StatusBadRequest
		res = ErrorResponse{
			Code:    "TOO_LONG_TITLE",
			Message: err.Error(),
		}
	case errors.Is(err, model.ErrNegativeAmount):
		status = http.StatusBadRequest
		res = ErrorResponse{
			Code:    "NEGATIVE_AMOUNT",
			Message: err.Error(),
		}
	case errors.Is(err, model.ErrInvalidID):
		status = http.StatusBadRequest
		res = ErrorResponse{
			Code:    "INVALID_ID",
			Message: err.Error(),
		}
	case errors.Is(err, model.ErrInvalidMonth):
		status = http.StatusBadRequest
		res = ErrorResponse{
			Code:    "INVALID_MONTH",
			Message: err.Error(),
		}
	case errors.Is(err, model.ErrNotFound):
		status = http.StatusNotFound
		res = ErrorResponse{
			Code:    "NOT_FOUND",
			Message: err.Error(),
		}
	case errors.Is(err, model.ErrNotFoundExpense):
		status = http.StatusNotFound
		res = ErrorResponse{
			Code:    "NOT_FOUND_EXPENSE",
			Message: err.Error(),
		}
	default:
		status = http.StatusInternalServerError
		res = ErrorResponse{
			Code:    "INTERNAL_SERVER_ERROR",
			Message: "An unexpected error occurred",
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(res); err != nil {
		http.Error(w, "Failed to encode error response", http.StatusInternalServerError)
	}
}
