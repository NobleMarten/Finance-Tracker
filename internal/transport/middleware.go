package transport

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func MyCors(next http.Handler) http.Handler { // middleware для CORS чтобы фронтенд мог обращаться к бэкенду
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func AuthMiddleware(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, authPrefix) {
				http.Error(w, "Missing or invalid Authorization header", http.StatusUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, authPrefix)

			token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); ok {
					return secret, nil
				}
				return nil, fmt.Errorf("unexpected signing method: %v", token.Method.Alg())
			})

			if err != nil || !token.Valid {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			cl, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, "Invalid token", http.StatusUnauthorized) // error 401
				return
			}
			userID, ok := cl["user_id"].(float64)
			if !ok {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}
			userIDInt := int(userID)

			ctx := context.WithValue(r.Context(), UsrContext, userIDInt)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
