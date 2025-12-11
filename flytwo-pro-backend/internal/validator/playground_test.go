package validator

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type TestStruct struct {
	Name     string `validate:"required"`
	Email    string `validate:"required,email"`
	Age      int    `validate:"required,min=18,max=100"`
	Username string `validate:"username"`
	Bio      string `validate:"min=10,max=100"`
}

func TestNewValidator(t *testing.T) {
	v := NewValidator()
	assert.NotNil(t, v)
	assert.NotNil(t, v.validator)
}

func TestValidator_ValidateSuccess(t *testing.T) {
	v := NewValidator()

	testData := TestStruct{
		Name:     "John Doe",
		Email:    "john@example.com",
		Age:      25,
		Username: "john_doe",
		Bio:      "This is a valid bio text",
	}

	errors := v.Validate(testData)
	assert.Nil(t, errors)
}

func TestValidator_ValidateRequired(t *testing.T) {
	v := NewValidator()

	testData := TestStruct{
		Name:  "", // Required but empty
		Email: "", // Required but empty
		Age:   0,  // Required but zero
	}

	errors := v.Validate(testData)
	require.NotNil(t, errors)
	assert.Contains(t, errors, "name")
	assert.Contains(t, errors, "email")
	assert.Contains(t, errors, "age")
	assert.Equal(t, "this field cannot be empty", errors["name"])
	assert.Equal(t, "this field cannot be empty", errors["email"])
}

func TestValidator_ValidateEmail(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name      string
		email     string
		shouldErr bool
	}{
		{"valid email", "test@example.com", false},
		{"valid email with subdomain", "test@mail.example.com", false},
		{"invalid email - no @", "testexample.com", true},
		{"invalid email - no domain", "test@", true},
		{"invalid email - no local part", "@example.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testData := TestStruct{
				Name:  "John",
				Email: tt.email,
				Age:   25,
				Bio:   "This is a valid bio text", // Added valid bio
			}

			errors := v.Validate(testData)
			if tt.shouldErr {
				assert.NotNil(t, errors)
				assert.Contains(t, errors, "email")
				assert.Equal(t, "must be a valid email", errors["email"])
			} else {
				assert.Nil(t, errors)
			}
		})
	}
}

func TestValidator_ValidateMinMax(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name      string
		age       int
		bio       string
		shouldErr bool
		errField  string
	}{
		{"valid age", 25, "Valid bio text here", false, ""},
		{"age too young", 17, "Valid bio text here", true, "age"},
		{"age too old", 101, "Valid bio text here", true, "age"},
		{"bio too short", 25, "Short", true, "bio"},
		{"bio too long", 25, string(make([]byte, 101)), true, "bio"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testData := TestStruct{
				Name:  "John",
				Email: "john@example.com",
				Age:   tt.age,
				Bio:   tt.bio,
			}

			errors := v.Validate(testData)
			if tt.shouldErr {
				assert.NotNil(t, errors)
				assert.Contains(t, errors, tt.errField)
			} else {
				assert.Nil(t, errors)
			}
		})
	}
}

func TestValidator_ValidateUsername(t *testing.T) {
	v := NewValidator()

	tests := []struct {
		name      string
		username  string
		shouldErr bool
	}{
		{"valid username", "john_doe", false},
		{"valid username with numbers", "john_doe123", false},
		{"valid username uppercase", "JOHN_DOE", false},
		{"invalid username with space", "john doe", true},
		{"invalid username with special char", "john@doe", true},
		{"invalid username with hyphen", "john-doe", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testData := TestStruct{
				Name:     "John",
				Email:    "john@example.com",
				Age:      25,
				Username: tt.username,
				Bio:      "This is a valid bio text", // Added valid bio
			}

			errors := v.Validate(testData)
			if tt.shouldErr {
				assert.NotNil(t, errors)
				assert.Contains(t, errors, "username")
				assert.Equal(t, "must contain only letters, numbers, and underscores", errors["username"])
			} else {
				assert.Nil(t, errors)
			}
		})
	}
}

func TestToSnakeCase(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"UserName", "user_name"},
		{"Email", "email"},
		{"FirstNameLastName", "first_name_last_name"},
		{"ID", "i_d"},
		{"UserID", "user_i_d"},
		{"lowercase", "lowercase"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := toSnakeCase(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}