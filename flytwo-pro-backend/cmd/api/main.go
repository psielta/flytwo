package main

import (
	"context"
	"encoding/gob"
	"fmt"
	"gobid/internal/api"
	"gobid/internal/cache"
	"gobid/internal/logger"
	"gobid/internal/services"
	"net/http"
	"os"
	"strconv"
	"time"

	_ "gobid/docs" // Import generated swagger docs

	"github.com/alexedwards/scs/pgxstore"
	"github.com/alexedwards/scs/v2"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"go.uber.org/zap"
)

// @title           FlyTwo Pro API
// @version         1.0
// @description     FlyTwo Pro Backend API Server
// @termsOfService  http://swagger.io/terms/

// @contact.name   FlyTwo Support
// @contact.url    https://flytwo.com/support
// @contact.email  support@flytwo.com

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost:3080
// @BasePath  /api/v1

// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization

func main() {
	gob.Register(uuid.UUID{})

	// Initialize logger
	if err := logger.InitLogger(true); err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}
	defer logger.Sync()

	if err := godotenv.Load(); err != nil {
		logger.Log.Fatal("Failed to load .env file", zap.Error(err))
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, fmt.Sprintf("user=%s password=%s host=%s port=%s dbname=%s",
		os.Getenv("GOBID_DATABASE_USER"),
		os.Getenv("GOBID_DATABASE_PASSWORD"),
		os.Getenv("GOBID_DATABASE_HOST"),
		os.Getenv("GOBID_DATABASE_PORT"),
		os.Getenv("GOBID_DATABASE_NAME"),
	))

	if err != nil {
		logger.Log.Fatal("Failed to connect to database", zap.Error(err))
	}

	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		logger.Log.Fatal("Failed to ping database", zap.Error(err))
	}

	logger.Log.Info("Successfully connected to database")

	// Cache configuration (L1 Ristretto, optional L2 Redis)
	cacheTTLSeconds, _ := strconv.Atoi(os.Getenv("GOBID_CACHE_TTL_SECONDS"))
	if cacheTTLSeconds == 0 {
		cacheTTLSeconds = 300
	}
	l1MaxCost, _ := strconv.Atoi(os.Getenv("GOBID_CACHE_L1_MAX_COST"))
	if l1MaxCost == 0 {
		l1MaxCost = 10000
	}
	l1NumCounters := l1MaxCost * 10
	cacheCfg := cache.Config{
		L1NumCounters: int64(l1NumCounters),
		L1MaxCost:     int64(l1MaxCost),
		L1BufferItems: 64,
		TTL:           time.Duration(cacheTTLSeconds) * time.Second,
		RedisAddr:     os.Getenv("GOBID_REDIS_ADDR"),
		RedisPassword: os.Getenv("GOBID_REDIS_PASSWORD"),
		EnableL2:      os.Getenv("GOBID_REDIS_ADDR") != "",
		Logger:        logger.Log,
	}
	if dbStr := os.Getenv("GOBID_REDIS_DB"); dbStr != "" {
		if v, err := strconv.Atoi(dbStr); err == nil {
			cacheCfg.RedisDB = v
		}
	}
	appCache, err := cache.New(cacheCfg)
	if err != nil {
		logger.Log.Warn("Failed to initialize cache; continuing without cache", zap.Error(err))
		appCache = nil
	}

	s := scs.New()
	s.Store = pgxstore.New(pool)
	s.Lifetime = 24 * time.Hour
	s.Cookie.HttpOnly = true
	s.Cookie.SameSite = http.SameSiteLaxMode
	userService := services.NewUserService(pool)
	catalogService := services.NewCatalogImportService(pool, appCache)
	api := api.Api{
		Router:         chi.NewMux(),
		UserService:    &userService,
		CatalogService: &catalogService,
		Sessions:       s,
		WsUpgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}

	api.BindRoutes()

	logger.Log.Info("Starting server", zap.String("address", "localhost:3080"))
	logger.Log.Info("Swagger documentation", zap.String("swagger", "http://localhost:3080/swagger/index.html"))
	if err := http.ListenAndServe("localhost:3080", api.Router); err != nil {
		logger.Log.Fatal("Failed to start server", zap.Error(err))
	}
}
