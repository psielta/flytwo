package mocks

import (
	"context"
	"gobid/internal/store/pgstore"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

// MockUserService is a mock implementation of UserService
type MockUserService struct {
	mock.Mock
}

// CreateUser mocks the CreateUser method
func (m *MockUserService) CreateUser(ctx context.Context, username, email, password, bio string) (uuid.UUID, error) {
	args := m.Called(ctx, username, email, password, bio)
	return args.Get(0).(uuid.UUID), args.Error(1)
}

// AuthenticateUser mocks the AuthenticateUser method
func (m *MockUserService) AuthenticateUser(ctx context.Context, email, password string) (uuid.UUID, error) {
	args := m.Called(ctx, email, password)
	return args.Get(0).(uuid.UUID), args.Error(1)
}

// GetUserByID mocks the GetUserByID method
func (m *MockUserService) GetUserByID(ctx context.Context, userID uuid.UUID) (*pgstore.User, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*pgstore.User), args.Error(1)
}