package transport

import (
	"FinanceTracker/internal/model"
	"FinanceTracker/internal/service"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

// Тело quick-add — сырая строка вроде "500 кофе", а не JSON: в iOS Shortcuts
// текстовое тело собирается одним блоком, а JSON пришлось бы клеить руками
// и экранировать кавычки в названии.
//
// Ограничение размера обязательно: без него достаточно отправить гигабайт,
// чтобы io.ReadAll съел его целиком в память.
const quickAddMaxBody = 4 << 10 // 4 KiB

// QuickAdd создаёт трату из одной строки.
//
// Живёт в той же группе, что и остальные /api/expenses: AuthMiddleware пускает
// и по Bearer, и по куке, а CSRFMiddleware сам пропускает Bearer-запросы —
// поэтому Shortcuts работает без CSRF-токена, а браузер по-прежнему проверяется.
func (h *Handler) QuickAdd(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, quickAddMaxBody))
	if err != nil {
		writeText(w, http.StatusBadRequest, "Не удалось прочитать запрос")
		return
	}

	raw := strings.TrimSpace(string(body))

	// Ошибки разбора отдаём текстом, а не JSON: Shortcuts показывает тело
	// ответа в уведомлении как есть, и человек должен прочитать подсказку,
	// а не фигурные скобки.
	amount, name, err := service.ParseQuickAdd(raw)
	if err != nil {
		writeText(w, http.StatusBadRequest, quickAddHint(err))
		return
	}

	userID := ctx.Value(UsrContext).(int)

	expense, err := h.svc.Add(ctx, amount, name, userID, nil)
	if err != nil {
		WriteError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(expense); err != nil {
		http.Error(w, "Failed to encode expense", http.StatusInternalServerError)
		return
	}
}

// quickAddHint переводит доменную ошибку в подсказку для человека.
//
// Тот же приём, что в WriteError: сервис формулирует, что случилось, транспорт
// решает, как это показать. Поэтому sentinel'ы в model остаются английскими и
// техническими — русский текст живёт здесь, рядом с остальным представлением.
//
// Ошибку от strconv наружу не отдаём: «invalid syntax» человеку в уведомлении
// ничего не объясняет. Она осталась в цепочке через %w и доступна в логах.
func quickAddHint(err error) string {
	switch {
	case errors.Is(err, model.ErrEmptyReq):
		return "Пустой запрос. Напишите сумму и на что: «500 кофе»."
	case errors.Is(err, model.ErrQuickAddDecimal):
		return "Дробные суммы не поддерживаются — только целые рубли: «500 кофе»."
	case errors.Is(err, model.ErrQuickAddNoAmount):
		return "Сумма должна идти первой: «500 кофе»."
	default:
		return "Не понял запрос. Ожидаю строку вида «500 кофе»."
	}
}

func writeText(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(status)
	_, _ = io.WriteString(w, msg)
}
