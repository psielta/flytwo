package mocks

import (
	"context"
	"io"

	"github.com/stretchr/testify/mock"

	"gobid/internal/services"
)

type MockCatalogImportService struct {
	mock.Mock
}

func (m *MockCatalogImportService) ImportCatmat(ctx context.Context, reader io.Reader) (*services.ImportResult, error) {
	args := m.Called(ctx, reader)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.ImportResult), args.Error(1)
}

func (m *MockCatalogImportService) ImportCatser(ctx context.Context, reader io.Reader) (*services.ImportResult, error) {
	args := m.Called(ctx, reader)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.ImportResult), args.Error(1)
}
