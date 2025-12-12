package api

import (
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func (api *Api) BindRoutes() {
	// CORS configuration for Angular frontend
	api.Router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:4200"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	api.Router.Use(middleware.RequestID, middleware.Logger, middleware.Recoverer, api.Sessions.LoadAndSave)

	// Swagger documentation routes (OpenAPI 3 output)
	api.RegisterSwaggerRoutes()

	api.Router.Route("/api", func(r chi.Router) {
		r.Route("/v1", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(api.AuthMiddleware)
				r.Post("/catmat/import", api.handleImportCatmat)
				r.Post("/catser/import", api.handleImportCatser)
				r.Get("/catmat/search", api.handleSearchCatmat)
				r.Get("/catser/search", api.handleSearchCatser)
			})

			r.Route("/users", func(r chi.Router) {
				r.Post("/signup", api.handleSignupUser)
				r.Post("/login", api.handleLoginUser)

				r.Group(func(r chi.Router) {
					r.Use(api.AuthMiddleware)
					r.Post("/logout", api.handleLogoutUser)
					r.Get("/me", api.handleGetCurrentUser)
				})
			})
		})
	})
}
