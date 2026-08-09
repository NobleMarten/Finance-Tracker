package model

import "time"

type Token struct {
	TokenID    int        `json:"token_id"`
	UserID     int        `json:"user_id"`
	TokenHash  []byte     `json:"-"`
	Name       string     `json:"name"`
	CreatedAt  time.Time  `json:"created_at"`
	LastUsedAt *time.Time `json:"last_used_at"`
	RevokedAt  *time.Time `json:"revoked_at"`
}
