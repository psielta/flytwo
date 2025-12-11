package api

import (
	"bytes"
	"encoding/gob"
	"encoding/json"
	"errors"
	"gobid/internal/dto"
	"gobid/internal/logger"
	"gobid/internal/mocks"
	"gobid/internal/services"
	"gobid/internal/store/pgstore"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alexedwards/scs/v2"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func init() {
	// Register UUID type for session storage
	gob.Register(uuid.UUID{})
}

func setupTestAPI() (*Api, *mocks.MockUserService) {
	// Initialize logger for tests
	if err := logger.InitLogger(true); err != nil {
		panic(err)
	}

	mockUserService := new(mocks.MockUserService)
	sessionManager := scs.New()

	api := &Api{
		Router:      chi.NewMux(),
		UserService: mockUserService,
		Sessions:    sessionManager,
		WsUpgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}

	api.BindRoutes()
	return api, mockUserService
}

func TestHandleSignupUser_Success(t *testing.T) {
	// Arrange
	api, mockService := setupTestAPI()

	reqBody := dto.CreateUserReq{
		UserName: "testuser",
		Email:    "test@example.com",
		Password: "Test1234",
		Bio:      "This is a test bio for the user",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	expectedID := uuid.New()
	mockService.On("CreateUser", mock.Anything, "testuser", "test@example.com", "Test1234", "This is a test bio for the user").
		Return(expectedID, nil)

	recorder := httptest.NewRecorder()

	// Act
	api.Router.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusOK, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, expectedID.String(), response["user_id"])
	mockService.AssertExpectations(t)
}

func TestHandleSignupUser_ValidationError(t *testing.T) {
	// Arrange
	api, _ := setupTestAPI()

	reqBody := dto.CreateUserReq{
		UserName: "",  // Invalid: empty
		Email:    "invalid", // Invalid: not an email
		Password: "123", // Invalid: too short
		Bio:      "short", // Invalid: too short
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()

	// Act
	api.Router.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusUnprocessableEntity, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "Validation failed", response["error"])
	assert.NotNil(t, response["fields"])

	fields := response["fields"].(map[string]interface{})
	assert.Contains(t, fields, "user_name")
	assert.Contains(t, fields, "email")
	assert.Contains(t, fields, "password")
	assert.Contains(t, fields, "bio")
}

func TestHandleSignupUser_DuplicateUser(t *testing.T) {
	// Arrange
	api, mockService := setupTestAPI()

	reqBody := dto.CreateUserReq{
		UserName: "testuser",
		Email:    "test@example.com",
		Password: "Test1234",
		Bio:      "This is a test bio for the user",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	mockService.On("CreateUser", mock.Anything, "testuser", "test@example.com", "Test1234", "This is a test bio for the user").
		Return(uuid.UUID{}, services.ErrDuplicatedEmailOrUsername)

	recorder := httptest.NewRecorder()

	// Act
	api.Router.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusUnprocessableEntity, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "email or username already exists", response["error"])
	mockService.AssertExpectations(t)
}

func TestHandleLoginUser_Success(t *testing.T) {
	// Arrange
	api, mockService := setupTestAPI()

	reqBody := dto.LoginUserReq{
		Email:    "test@example.com",
		Password: "Test1234",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/login", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	expectedID := uuid.New()
	mockService.On("AuthenticateUser", mock.Anything, "test@example.com", "Test1234").
		Return(expectedID, nil)

	recorder := httptest.NewRecorder()

	// Act
	api.Router.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusOK, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "logged in successfully", response["message"])
	assert.Equal(t, expectedID.String(), response["user_id"])
	mockService.AssertExpectations(t)
}

func TestHandleLoginUser_InvalidCredentials(t *testing.T) {
	// Arrange
	api, mockService := setupTestAPI()

	reqBody := dto.LoginUserReq{
		Email:    "test@example.com",
		Password: "wrongpassword",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/login", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	mockService.On("AuthenticateUser", mock.Anything, "test@example.com", "wrongpassword").
		Return(uuid.UUID{}, services.ErrInvalidCredentials)

	recorder := httptest.NewRecorder()

	// Act
	api.Router.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "invalid email or password", response["error"])
	mockService.AssertExpectations(t)
}

func TestHandleLoginUser_ValidationError(t *testing.T) {
	// Arrange
	api, _ := setupTestAPI()

	reqBody := dto.LoginUserReq{
		Email:    "notanemail",  // Invalid email format
		Password: "",  // Empty password
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/login", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()

	// Act
	api.Router.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusUnprocessableEntity, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "Validation failed", response["error"])
	assert.NotNil(t, response["fields"])
}

func TestHandleLogoutUser_Success(t *testing.T) {
	// Arrange
	api, _ := setupTestAPI()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/logout", nil)
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()

	// Act
	api.handleLogoutUser(recorder, req)

	// Assert
	assert.Equal(t, http.StatusOK, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "logged out successfully", response["message"])
}

func TestHandleSignupUser_UnexpectedError(t *testing.T) {
	// Arrange
	api, mockService := setupTestAPI()

	reqBody := dto.CreateUserReq{
		UserName: "testuser",
		Email:    "test@example.com",
		Password: "Test1234",
		Bio:      "This is a test bio for the user",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/signup", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	mockService.On("CreateUser", mock.Anything, "testuser", "test@example.com", "Test1234", "This is a test bio for the user").
		Return(uuid.UUID{}, errors.New("database connection failed"))

	recorder := httptest.NewRecorder()

	// Act
	api.Router.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "internal server error", response["error"])
	mockService.AssertExpectations(t)
}

func TestHandleLoginUser_UnexpectedError(t *testing.T) {
	// Arrange
	api, mockService := setupTestAPI()

	reqBody := dto.LoginUserReq{
		Email:    "test@example.com",
		Password: "Test1234",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/login", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	mockService.On("AuthenticateUser", mock.Anything, "test@example.com", "Test1234").
		Return(uuid.UUID{}, errors.New("database connection failed"))

	recorder := httptest.NewRecorder()

	// Act
	api.Router.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "unexpected internal server error", response["error"])
	mockService.AssertExpectations(t)
}

func TestHandleGetCurrentUser_Success(t *testing.T) {
	// Arrange
	api, mockService := setupTestAPI()

	userID := uuid.New()
	testUser := &pgstore.User{
		ID:        userID,
		UserName:  "testuser",
		Email:     "test@example.com",
		Bio:       "Test bio",
		CreatedAt: time.Date(2025, 1, 1, 10, 0, 0, 0, time.UTC),
		UpdatedAt: time.Date(2025, 1, 1, 10, 0, 0, 0, time.UTC),
	}

	mockService.On("GetUserByID", mock.Anything, userID).
		Return(testUser, nil)

	// Create request and manually setup session context
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()

	// Wrap handler to setup session
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.Sessions.Put(r.Context(), "AuthenticatedUserId", userID)
		api.handleGetCurrentUser(w, r)
	})

	wrapper := api.Sessions.LoadAndSave(handler)

	// Act
	wrapper.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusOK, recorder.Code)

	var response dto.UserProfileResponse
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, userID.String(), response.ID)
	assert.Equal(t, "testuser", response.UserName)
	assert.Equal(t, "test@example.com", response.Email)
	assert.Equal(t, "Test bio", response.Bio)
	assert.Equal(t, "2025-01-01T10:00:00Z", response.CreatedAt)

	mockService.AssertExpectations(t)
}

func TestHandleGetCurrentUser_Unauthenticated(t *testing.T) {
	// Arrange
	api, _ := setupTestAPI()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()

	// Wrap handler without setting session (user not authenticated)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Don't put anything in session - user not authenticated
		api.handleGetCurrentUser(w, r)
	})

	wrapper := api.Sessions.LoadAndSave(handler)

	// Act
	wrapper.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "authentication required", response["error"])
}

func TestHandleGetCurrentUser_InvalidSessionType(t *testing.T) {
	// Arrange
	api, _ := setupTestAPI()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()

	// Wrap handler to setup session with invalid type
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.Sessions.Put(r.Context(), "AuthenticatedUserId", "not-a-uuid")
		api.handleGetCurrentUser(w, r)
	})

	wrapper := api.Sessions.LoadAndSave(handler)

	// Act
	wrapper.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "internal server error", response["error"])
}

func TestHandleGetCurrentUser_UserNotFound(t *testing.T) {
	// Arrange
	api, mockService := setupTestAPI()

	userID := uuid.New()

	mockService.On("GetUserByID", mock.Anything, userID).
		Return((*pgstore.User)(nil), errors.New("user not found"))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()

	// Wrap handler to setup session
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.Sessions.Put(r.Context(), "AuthenticatedUserId", userID)
		api.handleGetCurrentUser(w, r)
	})

	wrapper := api.Sessions.LoadAndSave(handler)

	// Act
	wrapper.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "user not found", response["error"])
	mockService.AssertExpectations(t)
}

func TestHandleGetCurrentUser_DatabaseError(t *testing.T) {
	// Arrange
	api, mockService := setupTestAPI()

	userID := uuid.New()

	mockService.On("GetUserByID", mock.Anything, userID).
		Return((*pgstore.User)(nil), errors.New("database connection failed"))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()

	// Wrap handler to setup session
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.Sessions.Put(r.Context(), "AuthenticatedUserId", userID)
		api.handleGetCurrentUser(w, r)
	})

	wrapper := api.Sessions.LoadAndSave(handler)

	// Act
	wrapper.ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "internal server error", response["error"])
	mockService.AssertExpectations(t)
}