# Конспект: HTTP-тесты хендлеров в Go — Часть 2

> Продолжение `http-testing-notes.md` (разделы 0–14). Здесь разделы 15–25 —
> темы, которые добавились: query-параметры, второй мок, спай, float, доменные ошибки, вход-vs-выход.

---

## 15. Query-параметры (?month=&year=)

Третий вид входа (после тела и URL-path). Хендлер читает через `r.URL.Query().Get("month")`.
В тесте query кладётся ПРЯМО в URL, НЕ в контекст:

```go
req := httptest.NewRequest("GET", "/api/daily?month=6&year=2026", nil)
```
`r.URL.Query()` распарсит сам — никакого chi.RouteContext не надо.

### Паттерн: query как поле таблицы
Чтобы гонять много вариантов через одну таблицу — храни query строкой и склеивай:
```go
query string   // в структуре кейса
...
req := httptest.NewRequest("GET", "/api/daily"+tt.query, nil)
```
Кейсы: `"?month=6&year=2026"`, `"?month=abc"`, `"?month=&year=2026"`, `""`.
Каждый кейс сам несёт вход → тест самодокументируется.

Для спецсимволов (пробелы/кириллица) сырая строка сломается — тогда `url.Values{}` + `q.Encode()`.
Для чисел сырая строка проще и читаемее.

---

## 16. Второй мок (мокаем ДВА интерфейса сразу)

Некоторые хендлеры зовут два сервиса (напр. Summary: svc.Summary + exchangeService.GetRate).
Раньше оставляли exchangeService = nil (zero value интерфейса). Но если хендлер его ДЁРНЕТ →
вызов метода на nil → паника. Значит надо мокать ОБА.

MockExchange по тому же рецепту, что MockService, но проще (один метод):
```go
type MockExchange struct {
    GetRateFunc func(ctx context.Context, from, to string) (float64, error)
}
func (m *MockExchange) GetRate(ctx context.Context, from, to string) (float64, error) {
    return m.GetRateFunc(ctx, from, to)
}
var _ ExchangeService = (*MockExchange)(nil)   // compile-check
```

Собираем хендлер с ОБОИМИ моками:
```go
h := &Handler{
    svc:             &MockService{SummaryFunc: tt.summaryFunc},
    exchangeService: &MockExchange{GetRateFunc: ...},
}
```

Два сервиса = два источника ошибок. Ветки для теста:
1. успех — оба вернули данные
2. ошибка первого сервиса — до второго НЕ дойдёт
3. ошибка второго сервиса (биржа упала) — самый ценный кейс, проверяет оркестрацию

---

## 17. Спай — проверка "был ли вызван" (mock verification)

Как убедиться, что зависимость НЕ вызвалась (или вызвалась)? Флаг + замыкание.
Заводишь переменную ДО хендлера, в моке взводишь (замыкание захватывает по ссылке):

```go
rateCalled := false
h := &Handler{
    exchangeService: &MockExchange{
        GetRateFunc: func(ctx context.Context, from, to string) (float64, error) {
            rateCalled = true
            return tt.returnRate, tt.errValRate
        },
    },
    ...
}
h.Summary(rec, req)

assert.False(t, rateCalled)   // в кейсе "ошибка Summary" биржа НЕ должна вызваться
```

Работает благодаря замыканию: функция захватывает rateCalled из внешней области.
Логика: если svc.Summary вернул ошибку → хендлер выходит с return ДО GetRate → флаг остался false.
Проверяет короткое замыкание/порядок оркестрации.

Строже — счётчик int (rateCalls++) вместо bool: ловит и "не вызвали", и "вызвали лишний раз".
На собесе: "как проверить, что зависимость вызвана N раз" — это mock verification.

---

## 18. Сравнение float — НЕ через ==/Equal

`assert.Equal(t, 10.0, res.SumUSD)` проходит для круглых чисел, но 0.011*1000 = 10.999...
из-за двоичного представления float → упадёт. Используй InDelta:
```go
assert.InDelta(t, tt.wantUSD, res.SumUSD, 0.001)
```
Собес: "почему нельзя сравнивать float через ==" — из-за ошибок представления в плавающей точке.

---

## 19. Именованные структуры-ответы (для декода в тесте)

Если хендлер кодирует АНОНИМНУЮ структуру:
```go
res := struct { Sum int `json:"sum"` }{...}   // анонимная — тест не может в неё декодить
```
её нельзя переиспользовать в тесте (нет имени типа). Рефактор в именованный тип:
```go
type SummaryResponse struct {
    Sum    int     `json:"sum"`
    SumUSD float64 `json:"sum_usd"`
}
```
Тогда в тесте: `var res SummaryResponse; json.NewDecoder(rec.Body).Decode(&res)`.
Аналогично обёртки: ListExpense{Items, Total}, ListDailyExpenses{Items, Total}.

---

## 20. 🔑 Паттерн: техническая ошибка → доменная ошибка → правильный статус

САМЫЙ частый баг, который ловил несколько раз (delete, summary, daily-month, daily-year).

WriteError — это switch по errors.Is(err, model.ErrXxx). Он знает ТОЛЬКО доменные ошибки.
Если пробросить в него сырую ошибку от strconv.Atoi → она не совпадёт ни с одним case →
проваливается в default → 500.

Но кривой ввод от клиента — это ОШИБКА КЛИЕНТА → должно быть 400, а не 500!
500 врёт: "сервер сломался", хотя виноват запрос.

ПЛОХО:
```go
monthInt, err := strconv.Atoi(month)
if err != nil { WriteError(w, err); return }   // сырая ошибка → default → 500
```
ХОРОШО:
```go
if err != nil { WriteError(w, model.ErrInvalidMonth); return }   // доменная → 400
```

Разделение ответственности (SRP):
- ХЕНДЛЕР переводит технический сбой (парсинг) в доменную ошибку "что не так по смыслу"
- WriteError — единая точка маппинга доменная-ошибка → HTTP-статус+тело

Собес: "почему невалидный ввод должен давать 400, а не 500" + "единая точка обработки ошибок".

Цепочка при ?month=abc:
Atoi("abc") падает → WriteError(ErrInvalidMonth) → switch → case → 400 + ErrorResponse{Code:"INVALID_MONTH"}

⚠️ Следи за СОГЛАСОВАННОСТЬЮ: легко починить month на 400, а year забыть → year роняет 500.
Тест это вскрывает (кейс invalid_year покажет 500 vs ожидаемый 400).

---

## 21. Вход vs Выход — с чем сравнивать тело ответа (углубление)

Хендлер кодирует в ответ то, что вернул СЕРВИС (мок), а НЕ то, что пришло в запросе.
Значит got сравниваем с тем, что вернул мок (выход), а не с tt.body (вход).

Плохо (сравнение с входом — "тавтология по совпадению"):
```go
assert.Equal(t, *tt.body.Amount, got.Amount)   // работает только если вручную подогнал мок
```
Хорошо (сравнение с выходом мока):
```go
wantExp model.Expense   // = то, что вернёт мок И что ждём в ответе
...
UpdateFunc: func(...) (model.Expense, error) { return tt.wantExp, tt.mockErr }  // замыкание видит tt в цикле
...
assert.Equal(t, tt.wantExp.Amount, got.Amount)
```
Доказательство важности — PATCH succes2: запрос Amount=nil (не менять), а мок вернул 0.
Сравнение с входом пропустило бы поле; с выходом — реально проверяет, что хендлер отдал ответ сервиса.

Убирает и nil-guard'ы, и указатели из ассертов (wantExp — обычная структура).

---

## 22. Указатели в теле (PATCH-семантика *int/*string)

PATCH = частичное обновление. Поля-указатели: nil = "это поле НЕ меняем".
```go
type PatchResponse struct {
    Amount *int    `json:"amount"`   // nil → не трогать
    Title  *string `json:"title"`
}
```
Generic-хелпер для указателей (идиоматично, вместо ptrInt/ptrString):
```go
func ptr[T any](v T) *T { return &v }
...
PatchResponse{Title: ptr("Coffee"), Amount: ptr(150)}
```
⚠️ Мина: `*tt.body.Amount` при nil → паника (nil pointer dereference).
Если сравниваешь с входом — нужен guard `if tt.body.Amount != nil`.
Но лучше вообще сравнивать с wantExp (выход мока), тогда указателей в ассертах нет.

---

## 23. Мёртвые поля/ассерты в кейсах — чистота таблицы

Частая небрежность: в error-кейсах задаёшь полный wantExp/wantTotal, хотя блок проверки тела
под `if !tt.wantErr` их не исполняет. Плюс в parse-кейсах (кривой query) мок вообще НЕ вызывается —
значит wantErrVal там тоже мёртвый (ошибку рождает сам хендлер из query, а не мок).

Правило: в кейсах, где данные не используются — ставь нулевые значения (nil, 0).
Тогда видно "тут тело/мок ни при чём". Сравни:
- parse-ошибка (?month=abc) → рождается в ХЕНДЛЕРЕ, мок не зван, wantErrVal=nil
- ошибка сервиса → рождается в МОКЕ (return nil, ErrSomething), wantErrVal используется

---

## 24. Coverage (покрытие)

```bash
go test ./internal/transport/ -cover                              # процент
go test ./internal/transport/ -coverprofile=coverage.out && \
  go tool cover -html=coverage.out                                # HTML: зелёное=покрыто, красное=нет
go tool cover -func=coverage.out                                  # по функциям в терминале
```
HTML — статичный снимок, браузер сам не обновляется: пересобрать профиль + переоткрыть вкладку.
coverage.out → в .gitignore.

⚠️ Покрытие ≠ качество. 100% с пустыми ассертами бесполезно.
Ветки `if err := Encode(w); err != nil` почти недостижимы (httptest.Recorder не падает при Write) —
покрывать их через "сломанный writer" нецелесообразно: это тест стандартной библиотеки, а не логики.
Осознанно оставляй такие красными. Используй HTML как карту белых пятен, не как самоцель.
Собес: "как убеждаюсь, что тест способен упасть" + "почему не гонюсь за 100%".

---

## 25. Прогресс — какие входы освоены

| Вид входа | Как подаётся в тесте | Хендлеры |
|---|---|---|
| Тело JSON | Encode в bytes.Buffer → 3-й арг NewRequest | POST, PATCH |
| URL-path {id} | chi.NewRouteContext + URLParams.Add | DELETE, PATCH |
| Query ?a=b | прямо в URL строкой | Summary, DailyTotal, ... |
| userID | context.WithValue(UsrContext) вручную (имитация middleware) | все |
| Указатели *int | ptr() хелпер, nil = не менять | PATCH |

Второй мок (ExchangeService), спай на вызов, InDelta для float, оркестрация нескольких сервисов.

Закрыто хендлеров: Expenses, PostExpense, DeleteExpenses, PatchExpenses, Clear, Summary, DailyTotal.
Осталось: TopExpenses (+?limit=), Stats (4 вызова сервиса), Rate (только биржа).
