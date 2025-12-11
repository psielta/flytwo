package services

import (
	"context"
	"gobid/internal/store/pgstore"

	"github.com/google/uuid"
)

// UserServiceInterface defines the interface for user operations
type UserServiceInterface interface {
	CreateUser(ctx context.Context, userName, email, password string) (uuid.UUID, error)
	AuthenticateUser(ctx context.Context, email, password string) (uuid.UUID, error)
	GetUserByID(ctx context.Context, userID uuid.UUID) (*pgstore.User, error)
}