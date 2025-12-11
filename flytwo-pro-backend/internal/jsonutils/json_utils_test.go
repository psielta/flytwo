package jsonutils

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type TestRequest struct {
	Name  string `json:"name" validate:"required"`
	Email string `json:"email" validate:"required,email"`
	Age   int    `json:"age" validate:"min=18"`
}

func TestEncodeJson_Success(t *testing.T) {
	// Arrange
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	data := map[string]string{
		"message": "success",
		"status":  "ok",
	}

	// Act
	err := EncodeJson(w, r, http.StatusOK, data)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "Application/json", w.Header().Get("Content-Type"))

	var response map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "success", response["message"])
	assert.Equal(t, "ok", response["status"])
}

func TestEncodeJson_DifferentStatusCodes(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
	}{
		{"OK", http.StatusOK},
		{"Created", http.StatusCreated},
		{"BadRequest", http.StatusBadRequest},
		{"NotFound", http.StatusNotFound},
		{"InternalServerError", http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodGet, "/test", nil)
			data := map[string]string{"status": tt.name}

			err := EncodeJson(w, r, tt.statusCode, data)

			assert.NoError(t, err)
			assert.Equal(t, tt.statusCode, w.Code)
		})
	}
}

func TestDecodeValidJson_Success(t *testing.T) {
	// Arrange
	reqBody := TestRequest{
		Name:  "John Doe",
		Email: "john@example.com",
		Age:   25,
	}
	bodyBytes, _ := json.Marshal(reqBody)
	r := httptest.NewRequest(http.MethodPost, "/test", bytes.NewReader(bodyBytes))

	// Act
	data, problems, err := DecodeValidJson[TestRequest](r)

	// Assert
	assert.NoError(t, err)
	assert.Nil(t, problems)
	assert.Equal(t, "John Doe", data.Name)
	assert.Equal(t, "john@example.com", data.Email)
	assert.Equal(t, 25, data.Age)
}

func TestDecodeValidJson_ValidationErrors(t *testing.T) {
	// Arrange
	reqBody := TestRequest{
		Name:  "",  // Required but empty
		Email: "notanemail",  // Invalid email format
		Age:   17,  // Below minimum
	}
	bodyBytes, _ := json.Marshal(reqBody)
	r := httptest.NewRequest(http.MethodPost, "/test", bytes.NewReader(bodyBytes))

	// Act
	_, problems, err := DecodeValidJson[TestRequest](r)

	// Assert
	assert.Error(t, err)
	assert.NotNil(t, problems)
	assert.Contains(t, problems, "name")
	assert.Contains(t, problems, "email")
	assert.Contains(t, problems, "age")
}

func TestDecodeValidJson_InvalidJSON(t *testing.T) {
	// Arrange
	invalidJSON := `{"name": "John", "email": invalid}`
	r := httptest.NewRequest(http.MethodPost, "/test", bytes.NewReader([]byte(invalidJSON)))

	// Act
	_, problems, err := DecodeValidJson[TestRequest](r)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, problems)
	assert.Contains(t, err.Error(), "decode json")
}

func TestDecodeJson_Success(t *testing.T) {
	// Arrange
	type SimpleRequest struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	reqBody := SimpleRequest{
		Name:  "test",
		Value: 42,
	}
	bodyBytes, _ := json.Marshal(reqBody)
	r := httptest.NewRequest(http.MethodPost, "/test", bytes.NewReader(bodyBytes))

	// Act
	data, err := DecodeJson[SimpleRequest](r)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, "test", data.Name)
	assert.Equal(t, 42, data.Value)
}

func TestDecodeJson_InvalidJSON(t *testing.T) {
	// Arrange
	type SimpleRequest struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	invalidJSON := `{"name": "test", "value": "not a number"}`
	r := httptest.NewRequest(http.MethodPost, "/test", bytes.NewReader([]byte(invalidJSON)))

	// Act
	_, err := DecodeJson[SimpleRequest](r)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "decode json failed")
}

func TestDecodeJson_EmptyBody(t *testing.T) {
	// Arrange
	type SimpleRequest struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	r := httptest.NewRequest(http.MethodPost, "/test", bytes.NewReader([]byte{}))

	// Act
	_, err := DecodeJson[SimpleRequest](r)

	// Assert
	assert.Error(t, err)
}