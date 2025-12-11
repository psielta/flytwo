package api

import (
	"errors"
	"gobid/internal/dto"
	"gobid/internal/jsonutils"
	"gobid/internal/logger"
	"gobid/internal/services"
	"net/http"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// handleSignupUser godoc
// @Summary Create a new user
// @Description Register a new user with username, email and password
// @Tags users
// @Accept json
// @Produce json
// @Param user body dto.CreateUserReq true "User signup information"
// @Success 200 {object} map[string]interface{} "Returns user_id"
// @Failure 422 {object} map[string]interface{} "Validation errors or email/username already exists"
// @Router /users/signup [post]
func (api *Api) handleSignupUser(w http.ResponseWriter, r *http.Request) {
	data, problems, err := jsonutils.DecodeValidJson[dto.CreateUserReq](r)
	if err != nil {
		logger.Log.Debug("Validation failed for signup request",
			zap.Error(err),
			zap.Any("validation_errors", problems))

		response := map[string]any{
			"error": "Validation failed",
			"fields": problems,
		}
		_ = jsonutils.EncodeJson(w, r, http.StatusUnprocessableEntity, response)
		return
	}

	logger.Log.Info("Creating new user",
		zap.String("username", data.UserName),
		zap.String("email", data.Email))

	id, err := api.UserService.CreateUser(
		r.Context(),
		data.UserName,
		data.Email,
		data.Password,
	)

	if err != nil {
		if errors.Is(err, services.ErrDuplicatedEmailOrUsername) {
			logger.Log.Warn("User creation failed - duplicate email or username",
				zap.String("email", data.Email),
				zap.String("username", data.UserName))

			_ = jsonutils.EncodeJson(w, r, http.StatusUnprocessableEntity, map[string]any{
				"error": "email or username already exists",
			})
			return
		}

		logger.Log.Error("Unexpected error creating user",
			zap.Error(err),
			zap.String("email", data.Email))

		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "internal server error",
		})
		return
	}

	logger.Log.Info("User created successfully",
		zap.String("user_id", id.String()),
		zap.String("email", data.Email))

	_ = jsonutils.EncodeJson(w, r, http.StatusOK, map[string]any{
		"user_id": id,
	})
}

// handleLoginUser godoc
// @Summary User login
// @Description Authenticate a user and create a session
// @Tags users
// @Accept json
// @Produce json
// @Param credentials body dto.LoginUserReq true "Login credentials"
// @Success 200 {object} map[string]interface{} "Login successful"
// @Failure 401 {object} map[string]interface{} "Invalid credentials"
// @Failure 422 {object} map[string]interface{} "Validation errors"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /users/login [post]
func (api *Api) handleLoginUser(w http.ResponseWriter, r *http.Request) {
	data, problems, err := jsonutils.DecodeValidJson[dto.LoginUserReq](r)

	if err != nil {
		logger.Log.Debug("Validation failed for login request",
			zap.Error(err),
			zap.Any("validation_errors", problems))

		response := map[string]any{
			"error": "Validation failed",
			"fields": problems,
		}
		jsonutils.EncodeJson(w, r, http.StatusUnprocessableEntity, response)
		return
	}

	logger.Log.Info("User login attempt", zap.String("email", data.Email))

	id, err := api.UserService.AuthenticateUser(r.Context(), data.Email, data.Password)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCredentials) {
			logger.Log.Warn("Login failed - invalid credentials",
				zap.String("email", data.Email))

			jsonutils.EncodeJson(w, r, http.StatusUnauthorized, map[string]any{
				"error": "invalid email or password",
			})
			return
		}

		logger.Log.Error("Unexpected error during login",
			zap.Error(err),
			zap.String("email", data.Email))

		jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "unexpected internal server error",
		})
		return
	}

	err = api.Sessions.RenewToken(r.Context())
	if err != nil {
		logger.Log.Error("Failed to renew session token",
			zap.Error(err),
			zap.String("user_id", id.String()))

		jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "unexpected internal server error",
		})
		return
	}

	api.Sessions.Put(r.Context(), "AuthenticatedUserId", id)

	logger.Log.Info("User logged in successfully",
		zap.String("user_id", id.String()),
		zap.String("email", data.Email))

	jsonutils.EncodeJson(w, r, http.StatusOK, map[string]any{
		"message": "logged in successfully",
		"user_id": id,
	})
}

// handleLogoutUser godoc
// @Summary User logout
// @Description End the current user session
// @Tags users
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Logout successful"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Security ApiKeyAuth
// @Router /users/logout [post]
func (api *Api) handleLogoutUser(w http.ResponseWriter, r *http.Request) {
	userId := api.Sessions.Get(r.Context(), "AuthenticatedUserId")

	err := api.Sessions.RenewToken(r.Context())
	if err != nil {
		logger.Log.Error("Failed to renew token during logout", zap.Error(err))

		jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "unexpected internal server error",
		})
		return
	}

	api.Sessions.Remove(r.Context(), "AuthenticatedUserId")

	logger.Log.Info("User logged out successfully",
		zap.Any("user_id", userId))

	jsonutils.EncodeJson(w, r, http.StatusOK, map[string]any{
		"message": "logged out successfully",
	})
}

// handleGetCurrentUser godoc
// @Summary Get current user profile
// @Description Get the profile information of the currently authenticated user
// @Tags users
// @Accept json
// @Produce json
// @Success 200 {object} dto.UserProfileResponse "User profile data"
// @Failure 401 {object} map[string]interface{} "User not authenticated"
// @Failure 404 {object} map[string]interface{} "User not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Security ApiKeyAuth
// @Router /users/me [get]
func (api *Api) handleGetCurrentUser(w http.ResponseWriter, r *http.Request) {
	// Get user ID from session
	userIDValue := api.Sessions.Get(r.Context(), "AuthenticatedUserId")
	if userIDValue == nil {
		logger.Log.Warn("Unauthenticated access attempt to /me endpoint",
			zap.String("remote_addr", r.RemoteAddr))

		_ = jsonutils.EncodeJson(w, r, http.StatusUnauthorized, map[string]any{
			"error": "authentication required",
		})
		return
	}

	// Type assert the user ID
	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		logger.Log.Error("Invalid user ID type in session",
			zap.Any("user_id_value", userIDValue))

		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "internal server error",
		})
		return
	}

	// Log the request
	logger.Log.Info("Fetching user profile",
		zap.String("user_id", userID.String()))

	// Get user from database
	user, err := api.UserService.GetUserByID(r.Context(), userID)
	if err != nil {
		if err.Error() == "user not found" {
			logger.Log.Warn("User not found in database",
				zap.String("user_id", userID.String()))

			_ = jsonutils.EncodeJson(w, r, http.StatusNotFound, map[string]any{
				"error": "user not found",
			})
			return
		}

		logger.Log.Error("Failed to fetch user profile",
			zap.Error(err),
			zap.String("user_id", userID.String()))

		_ = jsonutils.EncodeJson(w, r, http.StatusInternalServerError, map[string]any{
			"error": "internal server error",
		})
		return
	}

	// Prepare response
	response := dto.UserProfileResponse{
		ID:        user.ID.String(),
		UserName:  user.UserName,
		Email:     user.Email,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}

	logger.Log.Info("User profile fetched successfully",
		zap.String("user_id", userID.String()),
		zap.String("username", user.UserName))

	_ = jsonutils.EncodeJson(w, r, http.StatusOK, response)
}
