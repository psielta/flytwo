package dto

// CreateUserReq represents the request payload for user signup
type CreateUserReq struct {
	UserName string `json:"user_name" validate:"required,username"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

// LoginUserReq represents the request payload for user login
type LoginUserReq struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// UserResponse represents the response for successful user operations
type UserResponse struct {
	UserID  string `json:"user_id,omitempty"`
	Message string `json:"message,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error  string            `json:"error"`
	Fields map[string]string `json:"fields,omitempty"`
}

// UserProfileResponse represents the logged-in user's profile data
type UserProfileResponse struct {
	ID        string `json:"id"`
	UserName  string `json:"user_name"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
}