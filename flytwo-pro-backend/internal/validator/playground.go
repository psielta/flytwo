package validator

import (
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

// Validator wrapper for go-playground/validator
type Validator struct {
	validator *validator.Validate
}

// NewValidator creates a new validator instance
func NewValidator() *Validator {
	v := validator.New()

	// Register custom validators if needed
	_ = v.RegisterValidation("username", validateUsername)

	return &Validator{
		validator: v,
	}
}

// Validate validates a struct and returns validation errors as a map
func (v *Validator) Validate(data interface{}) map[string]string {
	err := v.validator.Struct(data)
	if err == nil {
		return nil
	}

	errors := make(map[string]string)
	for _, err := range err.(validator.ValidationErrors) {
		field := strings.ToLower(err.Field())
		tag := err.Tag()
		param := err.Param()

		// Convert field name from PascalCase to snake_case
		field = toSnakeCase(field)

		// Custom error messages based on validation tags
		switch tag {
		case "required":
			errors[field] = "this field cannot be empty"
		case "email":
			errors[field] = "must be a valid email"
		case "min":
			if err.Type().String() == "string" {
				errors[field] = fmt.Sprintf("must be at least %s characters", param)
			} else {
				errors[field] = fmt.Sprintf("must be at least %s", param)
			}
		case "max":
			if err.Type().String() == "string" {
				errors[field] = fmt.Sprintf("must be at most %s characters", param)
			} else {
				errors[field] = fmt.Sprintf("must be at most %s", param)
			}
		case "username":
			errors[field] = "must contain only letters, numbers, and underscores"
		default:
			errors[field] = fmt.Sprintf("failed validation: %s", tag)
		}
	}

	return errors
}

// Custom validators

func validateUsername(fl validator.FieldLevel) bool {
	username := fl.Field().String()
	for _, char := range username {
		if !((char >= 'a' && char <= 'z') ||
			 (char >= 'A' && char <= 'Z') ||
			 (char >= '0' && char <= '9') ||
			 char == '_') {
			return false
		}
	}
	return true
}

// Helper function to convert PascalCase to snake_case
func toSnakeCase(str string) string {
	var result strings.Builder
	for i, char := range str {
		if i > 0 && char >= 'A' && char <= 'Z' {
			result.WriteRune('_')
		}
		result.WriteRune(char)
	}
	return strings.ToLower(result.String())
}