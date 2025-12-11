package services

import (
	"context"
	"gobid/internal/store/pgstore"
	"io"

	"github.com/google/uuid"
)

// UserServiceInterface defines the interface for user operations
type UserServiceInterface interface {
	CreateUser(ctx context.Context, userName, email, password string) (uuid.UUID, error)
	AuthenticateUser(ctx context.Context, email, password string) (uuid.UUID, error)
	GetUserByID(ctx context.Context, userID uuid.UUID) (*pgstore.User, error)
}

// CatalogImportServiceInterface defines import operations for CATMAT and CATSER spreadsheets.
type CatalogImportServiceInterface interface {
	ImportCatmat(ctx context.Context, reader io.Reader) (*ImportResult, error)
	ImportCatser(ctx context.Context, reader io.Reader) (*ImportResult, error)
}
