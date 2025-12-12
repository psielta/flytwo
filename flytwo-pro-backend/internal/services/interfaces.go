package services

import (
	"context"
	"io"

	"github.com/google/uuid"

	"gobid/internal/dto"
	"gobid/internal/store/pgstore"
)

// UserServiceInterface defines the interface for user operations
type UserServiceInterface interface {
	CreateUser(ctx context.Context, userName, email, password string) (uuid.UUID, error)
	AuthenticateUser(ctx context.Context, email, password string) (uuid.UUID, error)
	GetUserByID(ctx context.Context, userID uuid.UUID) (*pgstore.User, error)
}

// CatalogImportServiceInterface defines import, search and stats operations for CATMAT and CATSER.
type CatalogImportServiceInterface interface {
	ImportCatmat(ctx context.Context, reader io.Reader) (*ImportResult, error)
	ImportCatser(ctx context.Context, reader io.Reader) (*ImportResult, error)
	SearchCatmat(ctx context.Context, params CatmatSearchParams) (*SearchResult[CatmatSearchItem], error)
	SearchCatser(ctx context.Context, params CatserSearchParams) (*SearchResult[CatserSearchItem], error)
	GetCatalogStats(ctx context.Context) (*dto.CatalogStatsResponse, error)
}
