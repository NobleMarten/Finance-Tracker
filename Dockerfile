FROM golang:1.25.5-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /app/finance-tracker ./cmd/exp-api


FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/finance-tracker .
CMD ["./finance-tracker"]