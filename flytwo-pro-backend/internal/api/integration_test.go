// +build integration

package api

import (
	"bytes"
	"context"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"gobid/internal/dto"
	"gobid/internal/logger"
	"gobid/internal/services"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/alexedwards/scs/v2"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
)

type IntegrationTestSuite struct {
	suite.Suite
	pool        *pgxpool.Pool
	api         *Api
	userService services.UserService
}

// SetupSuite runs once before all tests
func (suite *IntegrationTestSuite) SetupSuite() {
	// Register uuid.UUID type with gob for session encoding
	gob.Register(uuid.UUID{})

	// Initialize logger
	err := logger.InitLogger(true)
	require.NoError(suite.T(), err)

	// Setup database connection
	dbHost := getEnvOrDefault("GOBID_DATABASE_HOST", "localhost")
	dbPort := getEnvOrDefault("GOBID_DATABASE_PORT", "5580")
	dbUser := getEnvOrDefault("GOBID_DATABASE_USER", "ADM")
	dbPassword := getEnvOrDefault("GOBID_DATABASE_PASSWORD", "2104")
	dbName := getEnvOrDefault("GOBID_DATABASE_NAME", "gobid")

	connStr := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	ctx := context.Background()
	suite.pool, err = pgxpool.New(ctx, connStr)
	require.NoError(suite.T(), err, "Failed to create connection pool")

	// Test connection
	err = suite.pool.Ping(ctx)
	require.NoError(suite.T(), err, "Failed to connect to test database")

	// Setup services and API
	suite.userService = services.NewUserService(suite.pool)
	sessionManager := scs.New()

	suite.api = &Api{
		Router:      chi.NewMux(),
		UserService: &suite.userService,
		Sessions:    sessionManager,
		WsUpgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}

	suite.api.BindRoutes()
}

// TearDownSuite runs once after all tests
func (suite *IntegrationTestSuite) TearDownSuite() {
	if suite.pool != nil {
		suite.pool.Close()
	}
}

// SetupTest runs before each test
func (suite *IntegrationTestSuite) SetupTest() {
	// Clean up the users table before each test
	suite.cleanupDatabase()
}

// TearDownTest runs after each test
func (suite *IntegrationTestSuite) TearDownTest() {
	// Additional cleanup if needed
	suite.cleanupDatabase()
}

func (suite *IntegrationTestSuite) cleanupDatabase() {
	// Delete all test users (be careful with this in production!)
	// We'll only delete users created during tests (with specific patterns)
	ctx := context.Background()
	_, err := suite.pool.Exec(ctx, `
		DELETE FROM users
		WHERE email LIKE 'test%@example.com'
		   OR email LIKE 'integration%@test.com'
		   OR user_name LIKE 'testuser%'
		   OR user_name LIKE 'integrationuser%'
	`)
	if err != nil {
		suite.T().Logf("Warning: Failed to cleanup database: %v", err)
	}
}

// Test creating a user with real database
func (suite *IntegrationTestSuite) TestCreateUser_RealDatabase() {
	// Arrange
	reqBody := dto.CreateUserReq{
		UserName: "testuser_integration_1",
		Email:    "test_integration_1@example.com",
		Password: "Password123",
		Bio:      "This is an integration test bio for user 1",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()

	// Act
	suite.api.Router.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(suite.T(), http.StatusOK, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	userIDStr := response["user_id"].(string)
	assert.NotEmpty(suite.T(), userIDStr)

	// Verify the user exists in database
	userID, err := uuid.Parse(userIDStr)
	require.NoError(suite.T(), err)

	ctx := context.Background()
	var username, email string
	err = suite.pool.QueryRow(ctx, "SELECT user_name, email FROM users WHERE id = $1", userID).Scan(&username, &email)
	require.NoError(suite.T(), err)

	assert.Equal(suite.T(), "testuser_integration_1", username)
	assert.Equal(suite.T(), "test_integration_1@example.com", email)
}

// Test duplicate email constraint
func (suite *IntegrationTestSuite) TestCreateUser_DuplicateEmail() {
	// First, create a user
	reqBody := dto.CreateUserReq{
		UserName: "testuser_unique_1",
		Email:    "test_duplicate@example.com",
		Password: "Password123",
		Bio:      "This is a test bio for duplicate email test",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	suite.api.Router.ServeHTTP(recorder, req)
	assert.Equal(suite.T(), http.StatusOK, recorder.Code)

	// Now try to create another user with same email
	reqBody2 := dto.CreateUserReq{
		UserName: "testuser_unique_2",
		Email:    "test_duplicate@example.com", // Same email
		Password: "Password456",
		Bio:      "This is another test bio for duplicate test",
	}

	bodyBytes2, _ := json.Marshal(reqBody2)
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes2))
	req2.Header.Set("Content-Type", "application/json")

	recorder2 := httptest.NewRecorder()
	suite.api.Router.ServeHTTP(recorder2, req2)

	// Assert
	assert.Equal(suite.T(), http.StatusUnprocessableEntity, recorder2.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder2.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	assert.Equal(suite.T(), "email or username already exists", response["error"])
}

// Test duplicate username constraint
func (suite *IntegrationTestSuite) TestCreateUser_DuplicateUsername() {
	// First, create a user
	reqBody := dto.CreateUserReq{
		UserName: "testuser_duplicate_name",
		Email:    "test_unique1@example.com",
		Password: "Password123",
		Bio:      "This is a test bio for duplicate username test",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	suite.api.Router.ServeHTTP(recorder, req)
	assert.Equal(suite.T(), http.StatusOK, recorder.Code)

	// Now try to create another user with same username
	reqBody2 := dto.CreateUserReq{
		UserName: "testuser_duplicate_name", // Same username
		Email:    "test_unique2@example.com",
		Password: "Password456",
		Bio:      "This is another test bio for duplicate test",
	}

	bodyBytes2, _ := json.Marshal(reqBody2)
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes2))
	req2.Header.Set("Content-Type", "application/json")

	recorder2 := httptest.NewRecorder()
	suite.api.Router.ServeHTTP(recorder2, req2)

	// Assert
	assert.Equal(suite.T(), http.StatusUnprocessableEntity, recorder2.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder2.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	assert.Equal(suite.T(), "email or username already exists", response["error"])
}

// Test login with real database
func (suite *IntegrationTestSuite) TestLoginUser_RealDatabase() {
	// First, create a user
	signupReq := dto.CreateUserReq{
		UserName: "testuser_login",
		Email:    "test_login@example.com",
		Password: "Password123",
		Bio:      "This is a test bio for login test",
	}

	bodyBytes, _ := json.Marshal(signupReq)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	suite.api.Router.ServeHTTP(recorder, req)
	require.Equal(suite.T(), http.StatusOK, recorder.Code)

	// Now try to login
	loginReq := dto.LoginUserReq{
		Email:    "test_login@example.com",
		Password: "Password123",
	}

	loginBytes, _ := json.Marshal(loginReq)
	loginRequest := httptest.NewRequest(http.MethodPost, "/api/v1/users/login", bytes.NewReader(loginBytes))
	loginRequest.Header.Set("Content-Type", "application/json")

	loginRecorder := httptest.NewRecorder()
	suite.api.Router.ServeHTTP(loginRecorder, loginRequest)

	// Assert
	assert.Equal(suite.T(), http.StatusOK, loginRecorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(loginRecorder.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	assert.Equal(suite.T(), "logged in successfully", response["message"])
	assert.NotEmpty(suite.T(), response["user_id"])
}

// Test login with wrong password
func (suite *IntegrationTestSuite) TestLoginUser_WrongPassword() {
	// First, create a user
	signupReq := dto.CreateUserReq{
		UserName: "testuser_wrongpass",
		Email:    "test_wrongpass@example.com",
		Password: "CorrectPassword123",
		Bio:      "This is a test bio for wrong password test",
	}

	bodyBytes, _ := json.Marshal(signupReq)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	suite.api.Router.ServeHTTP(recorder, req)
	require.Equal(suite.T(), http.StatusOK, recorder.Code)

	// Now try to login with wrong password
	loginReq := dto.LoginUserReq{
		Email:    "test_wrongpass@example.com",
		Password: "WrongPassword123",
	}

	loginBytes, _ := json.Marshal(loginReq)
	loginRequest := httptest.NewRequest(http.MethodPost, "/api/v1/users/login", bytes.NewReader(loginBytes))
	loginRequest.Header.Set("Content-Type", "application/json")

	loginRecorder := httptest.NewRecorder()
	suite.api.Router.ServeHTTP(loginRecorder, loginRequest)

	// Assert
	assert.Equal(suite.T(), http.StatusUnauthorized, loginRecorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(loginRecorder.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	assert.Equal(suite.T(), "invalid email or password", response["error"])
}

// Test login with non-existent user
func (suite *IntegrationTestSuite) TestLoginUser_NonExistent() {
	// Try to login with a user that doesn't exist
	loginReq := dto.LoginUserReq{
		Email:    "nonexistent@example.com",
		Password: "SomePassword123",
	}

	loginBytes, _ := json.Marshal(loginReq)
	loginRequest := httptest.NewRequest(http.MethodPost, "/api/v1/users/login", bytes.NewReader(loginBytes))
	loginRequest.Header.Set("Content-Type", "application/json")

	loginRecorder := httptest.NewRecorder()
	suite.api.Router.ServeHTTP(loginRecorder, loginRequest)

	// Assert
	assert.Equal(suite.T(), http.StatusUnauthorized, loginRecorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(loginRecorder.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	assert.Equal(suite.T(), "invalid email or password", response["error"])
}

// Test transaction rollback on error
func (suite *IntegrationTestSuite) TestCreateUser_TransactionRollback() {
	// This test would require simulating a database error during user creation
	// For now, we'll test that the service properly handles database constraints

	// Create a user with a very long username that exceeds database limits
	reqBody := dto.CreateUserReq{
		UserName: "testuser_" + string(make([]byte, 300)), // Exceeds typical varchar limits
		Email:    "test_toolong@example.com",
		Password: "Password123",
		Bio:      "This is a test bio for transaction test",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	suite.api.Router.ServeHTTP(recorder, req)

	// The validation should catch this before it reaches the database
	assert.Equal(suite.T(), http.StatusUnprocessableEntity, recorder.Code)
}

// Helper function to get environment variable with default
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// TestIntegrationSuite runs the test suite
func TestIntegrationSuite(t *testing.T) {
	// Skip integration tests if not explicitly enabled
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" {
		t.Skip("Skipping integration tests. Set RUN_INTEGRATION_TESTS=true to run them.")
	}

	suite.Run(t, new(IntegrationTestSuite))
}