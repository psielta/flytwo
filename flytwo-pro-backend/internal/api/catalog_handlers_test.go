package api

import (
	"bytes"
	"encoding/json"
	"gobid/internal/logger"
	"gobid/internal/mocks"
	"gobid/internal/services"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alexedwards/scs/v2"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func setupCatalogAPI() (*Api, *mocks.MockCatalogImportService) {
	if err := logger.InitLogger(true); err != nil {
		panic(err)
	}

	mockCatalog := new(mocks.MockCatalogImportService)
	api := &Api{
		Router:         chi.NewMux(),
		UserService:    new(mocks.MockUserService), // not used here
		CatalogService: mockCatalog,
		Sessions:       scs.New(),
		WsUpgrader:     defaultUpgrader(),
	}
	api.BindRoutes()
	return api, mockCatalog
}

func defaultUpgrader() websocket.Upgrader {
	return websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
}

func TestHandleImportCatmat_Success(t *testing.T) {
	api, mockCatalog := setupCatalogAPI()
	userID := uuid.New()

	// Prepare multipart body with dummy file content
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "dummy.xlsx")
	assert.NoError(t, err)
	_, _ = part.Write([]byte("dummy"))
	writer.Close()

	expected := &services.ImportResult{RowsRead: 2, RowsSaved: 2, RowsSkipped: 0}
	mockCatalog.On("ImportCatmat", mock.Anything, mock.Anything).Return(expected, nil)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/catmat/import", body)
	req.AddCookie(authCookie(api, userID))
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	var resp services.ImportResult
	assert.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.Equal(t, *expected, resp)
	mockCatalog.AssertExpectations(t)
}

func TestHandleImportCatmat_MissingFile(t *testing.T) {
	api, _ := setupCatalogAPI()
	userID := uuid.New()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/catmat/import", nil)
	req.AddCookie(authCookie(api, userID))
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestHandleImportCatmat_Error(t *testing.T) {
	api, mockCatalog := setupCatalogAPI()
	userID := uuid.New()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "dummy.xlsx")
	assert.NoError(t, err)
	_, _ = part.Write([]byte("dummy"))
	writer.Close()

	mockCatalog.On("ImportCatmat", mock.Anything, mock.Anything).Return((*services.ImportResult)(nil), assert.AnError)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/catmat/import", body)
	req.AddCookie(authCookie(api, userID))
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	mockCatalog.AssertExpectations(t)
}

func TestHandleImportCatser_Success(t *testing.T) {
	api, mockCatalog := setupCatalogAPI()
	userID := uuid.New()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "dummy.xlsx")
	assert.NoError(t, err)
	_, _ = part.Write([]byte("dummy"))
	writer.Close()

	expected := &services.ImportResult{RowsRead: 1, RowsSaved: 1, RowsSkipped: 0}
	mockCatalog.On("ImportCatser", mock.Anything, mock.Anything).Return(expected, nil)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/catser/import", body)
	req.AddCookie(authCookie(api, userID))
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	var resp services.ImportResult
	assert.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.Equal(t, *expected, resp)
	mockCatalog.AssertExpectations(t)
}

func TestHandleImportCatser_Error(t *testing.T) {
	api, mockCatalog := setupCatalogAPI()
	userID := uuid.New()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "dummy.xlsx")
	assert.NoError(t, err)
	_, _ = part.Write([]byte("dummy"))
	writer.Close()

	mockCatalog.On("ImportCatser", mock.Anything, mock.Anything).Return((*services.ImportResult)(nil), assert.AnError)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/catser/import", body)
	req.AddCookie(authCookie(api, userID))
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	mockCatalog.AssertExpectations(t)
}

func TestHandleImport_Unauthorized(t *testing.T) {
	api, _ := setupCatalogAPI()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_, _ = writer.CreateFormFile("file", "dummy.xlsx")
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/catmat/import", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

// helper to set session and return auth cookie
func authCookie(api *Api, userID uuid.UUID) *http.Cookie {
	setReq := httptest.NewRequest(http.MethodGet, "/set-session", nil)
	setRec := httptest.NewRecorder()
	api.Sessions.LoadAndSave(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.Sessions.Put(r.Context(), "AuthenticatedUserId", userID)
	})).ServeHTTP(setRec, setReq)
	cookies := setRec.Result().Cookies()
	if len(cookies) == 0 {
		return nil
	}
	return cookies[0]
}
