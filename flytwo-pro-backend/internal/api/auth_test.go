package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestAuthMiddleware_Authenticated(t *testing.T) {
	// Arrange
	api, _ := setupTestAPI()

	// Create a test handler that will be protected by the middleware
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("authorized"))
	})

	userID := uuid.New()

	// First request: set session data
	setReq := httptest.NewRequest(http.MethodGet, "/set-session", nil)
	setRec := httptest.NewRecorder()
	api.Sessions.LoadAndSave(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.Sessions.Put(r.Context(), "AuthenticatedUserId", userID)
	})).ServeHTTP(setRec, setReq)
	cookie := setRec.Result().Cookies()[0]

	// Second request: call protected route with session cookie
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.AddCookie(cookie)
	recorder := httptest.NewRecorder()

	protectedHandler := api.AuthMiddleware(nextHandler)
	api.Sessions.LoadAndSave(protectedHandler).ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, "authorized", recorder.Body.String())
}

func TestAuthMiddleware_NotAuthenticated(t *testing.T) {
	// Arrange
	api, _ := setupTestAPI()

	// Create a test handler that will be protected by the middleware
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("authorized"))
	})

	// Create a request without authentication
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	recorder := httptest.NewRecorder()

	// Act
	api.Sessions.LoadAndSave(api.AuthMiddleware(nextHandler)).ServeHTTP(recorder, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, recorder.Code)
}

func TestAuthMiddleware_InvalidSessionData(t *testing.T) {
	// Arrange
	api, _ := setupTestAPI()

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("authorized"))
	})

	// set invalid data in session
	setReq := httptest.NewRequest(http.MethodGet, "/set-session", nil)
	setRec := httptest.NewRecorder()
	api.Sessions.LoadAndSave(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.Sessions.Put(r.Context(), "AuthenticatedUserId", "not-a-uuid")
	})).ServeHTTP(setRec, setReq)
	cookie := setRec.Result().Cookies()[0]

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.AddCookie(cookie)
	recorder := httptest.NewRecorder()

	api.Sessions.LoadAndSave(api.AuthMiddleware(nextHandler)).ServeHTTP(recorder, req)

	// Middleware only checks existence, so it should pass through
	assert.Equal(t, http.StatusOK, recorder.Code)
}
