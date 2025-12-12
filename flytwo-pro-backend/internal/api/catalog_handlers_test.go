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

// ==================== SEARCH TESTS ====================

func TestHandleSearchCatmat_Success(t *testing.T) {
	api, mockCatalog := setupCatalogAPI()
	userID := uuid.New()

	ncmCode := "12345678"
	expected := &services.SearchResult[services.CatmatSearchItem]{
		Data: []services.CatmatSearchItem{
			{
				ID:              1,
				GroupCode:       10,
				GroupName:       "Test Group",
				ClassCode:       1000,
				ClassName:       "Test Class",
				PdmCode:         10000,
				PdmName:         "Test PDM",
				ItemCode:        100000,
				ItemDescription: "Test Item",
				NcmCode:         &ncmCode,
				Rank:            0.5,
			},
		},
		Total:  1,
		Limit:  50,
		Offset: 0,
	}
	mockCatalog.On("SearchCatmat", mock.Anything, mock.Anything).Return(expected, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/catmat/search?q=test", nil)
	req.AddCookie(authCookie(api, userID))
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var resp map[string]interface{}
	assert.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.Equal(t, float64(1), resp["total"])
	assert.Equal(t, float64(50), resp["limit"])
	assert.Equal(t, float64(0), resp["offset"])

	data := resp["data"].([]interface{})
	assert.Len(t, data, 1)

	mockCatalog.AssertExpectations(t)
}

func TestHandleSearchCatmat_WithFilters(t *testing.T) {
	api, mockCatalog := setupCatalogAPI()
	userID := uuid.New()

	expected := &services.SearchResult[services.CatmatSearchItem]{
		Data:   []services.CatmatSearchItem{},
		Total:  0,
		Limit:  25,
		Offset: 10,
	}
	mockCatalog.On("SearchCatmat", mock.Anything, mock.MatchedBy(func(p services.CatmatSearchParams) bool {
		return p.Query == "material" &&
			p.GroupCode != nil && *p.GroupCode == 10 &&
			p.Limit == 25 &&
			p.Offset == 10
	})).Return(expected, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/catmat/search?q=material&group_code=10&limit=25&offset=10", nil)
	req.AddCookie(authCookie(api, userID))
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	mockCatalog.AssertExpectations(t)
}

func TestHandleSearchCatmat_Error(t *testing.T) {
	api, mockCatalog := setupCatalogAPI()
	userID := uuid.New()

	mockCatalog.On("SearchCatmat", mock.Anything, mock.Anything).Return((*services.SearchResult[services.CatmatSearchItem])(nil), assert.AnError)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/catmat/search?q=test", nil)
	req.AddCookie(authCookie(api, userID))
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	mockCatalog.AssertExpectations(t)
}

func TestHandleSearchCatmat_Unauthorized(t *testing.T) {
	api, _ := setupCatalogAPI()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/catmat/search?q=test", nil)
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestHandleSearchCatser_Success(t *testing.T) {
	api, mockCatalog := setupCatalogAPI()
	userID := uuid.New()

	expected := &services.SearchResult[services.CatserSearchItem]{
		Data: []services.CatserSearchItem{
			{
				ID:                  1,
				MaterialServiceType: "Serviço",
				GroupCode:           20,
				GroupName:           "Test Service Group",
				ClassCode:           2000,
				ClassName:           "Test Service Class",
				ServiceCode:         200000,
				ServiceDescription:  "Test Service",
				Status:              "Ativo",
				Rank:                0.8,
			},
		},
		Total:  1,
		Limit:  50,
		Offset: 0,
	}
	mockCatalog.On("SearchCatser", mock.Anything, mock.Anything).Return(expected, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/catser/search?q=service", nil)
	req.AddCookie(authCookie(api, userID))
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var resp map[string]interface{}
	assert.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.Equal(t, float64(1), resp["total"])

	data := resp["data"].([]interface{})
	assert.Len(t, data, 1)

	mockCatalog.AssertExpectations(t)
}

func TestHandleSearchCatser_WithStatusFilter(t *testing.T) {
	api, mockCatalog := setupCatalogAPI()
	userID := uuid.New()

	expected := &services.SearchResult[services.CatserSearchItem]{
		Data:   []services.CatserSearchItem{},
		Total:  0,
		Limit:  50,
		Offset: 0,
	}
	mockCatalog.On("SearchCatser", mock.Anything, mock.MatchedBy(func(p services.CatserSearchParams) bool {
		return p.Status != nil && *p.Status == "Ativo"
	})).Return(expected, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/catser/search?status=Ativo", nil)
	req.AddCookie(authCookie(api, userID))
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	mockCatalog.AssertExpectations(t)
}

func TestHandleSearchCatser_Error(t *testing.T) {
	api, mockCatalog := setupCatalogAPI()
	userID := uuid.New()

	mockCatalog.On("SearchCatser", mock.Anything, mock.Anything).Return((*services.SearchResult[services.CatserSearchItem])(nil), assert.AnError)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/catser/search?q=test", nil)
	req.AddCookie(authCookie(api, userID))
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	mockCatalog.AssertExpectations(t)
}

func TestHandleSearchCatser_Unauthorized(t *testing.T) {
	api, _ := setupCatalogAPI()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/catser/search?q=test", nil)
	rec := httptest.NewRecorder()

	api.Router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}
