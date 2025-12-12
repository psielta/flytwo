package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/dgraph-io/ristretto"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// Config holds cache settings for L1 (ristretto) and L2 (redis).
type Config struct {
	L1NumCounters int64
	L1MaxCost     int64
	L1BufferItems int64
	TTL           time.Duration

	RedisAddr     string
	RedisPassword string
	RedisDB       int
	EnableL2      bool
	Logger        *zap.Logger
}

type Cache struct {
	l1  *ristretto.Cache
	l2  *redis.Client
	ttl time.Duration
	log *zap.Logger
}

// New builds a cache with L1 (ristretto) and optional L2 (redis).
func New(cfg Config) (*Cache, error) {
	log := cfg.Logger
	if log == nil {
		log = zap.NewNop()
	}

	l1, err := ristretto.NewCache(&ristretto.Config{
		NumCounters: cfg.L1NumCounters,
		MaxCost:     cfg.L1MaxCost,
		BufferItems: cfg.L1BufferItems,
	})
	if err != nil {
		return nil, err
	}

	var l2 *redis.Client
	if cfg.EnableL2 && cfg.RedisAddr != "" {
		l2 = redis.NewClient(&redis.Options{
			Addr:     cfg.RedisAddr,
			Password: cfg.RedisPassword,
			DB:       cfg.RedisDB,
		})
		if err := l2.Ping(context.Background()).Err(); err != nil {
			log.Warn("redis ping failed, disabling L2 cache", zap.Error(err))
			l2 = nil
		}
	}

	ttl := cfg.TTL
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}

	return &Cache{
		l1:  l1,
		l2:  l2,
		ttl: ttl,
		log: log,
	}, nil
}

// Get tries L1 then L2. On hit, unmarshals JSON into dest.
func (c *Cache) Get(ctx context.Context, key string, dest any) (bool, error) {
	if c == nil {
		return false, nil
	}

	if val, ok := c.l1.Get(key); ok {
		if b, ok := val.([]byte); ok {
			c.log.Debug("cache hit L1", zap.String("key", key))
			return true, json.Unmarshal(b, dest)
		}
	}

	if c.l2 == nil {
		return false, nil
	}

	b, err := c.l2.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return false, nil
		}
		return false, err
	}

	_ = c.l1.SetWithTTL(key, b, int64(len(b)), c.ttl)
	c.log.Debug("cache hit L2", zap.String("key", key))
	return true, json.Unmarshal(b, dest)
}

// Set writes to L2 (if enabled) and L1.
func (c *Cache) Set(ctx context.Context, key string, value any) error {
	if c == nil {
		return nil
	}
	b, err := json.Marshal(value)
	if err != nil {
		return err
	}

	if c.l2 != nil {
		if err := c.l2.Set(ctx, key, b, c.ttl).Err(); err != nil {
			c.log.Warn("failed to set redis cache", zap.Error(err))
		} else {
			c.log.Debug("cache set L2", zap.String("key", key))
		}
	}

	c.l1.SetWithTTL(key, b, int64(len(b)), c.ttl)
	c.log.Debug("cache set L1", zap.String("key", key), zap.Int("bytes", len(b)))
	return nil
}

// Close releases Redis resources (L1 has no Close).
func (c *Cache) Close() {
	if c == nil {
		return
	}
	if c.l2 != nil {
		_ = c.l2.Close()
	}
}
