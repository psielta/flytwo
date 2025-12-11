package logger

import (
	"os"
	"path/filepath"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	// Log is the global logger
	Log *zap.Logger
)

// LoggerConfig holds configuration for logger
type LoggerConfig struct {
	Development bool
	LogFilePath string
	MaxSize     int  // Maximum size in megabytes before rotation
	MaxBackups  int  // Maximum number of old log files to retain
	MaxAge      int  // Maximum number of days to retain old log files
	Compress    bool // Whether to compress rotated log files
}

// DefaultLoggerConfig returns default logger configuration
func DefaultLoggerConfig(development bool) LoggerConfig {
	return LoggerConfig{
		Development: development,
		LogFilePath: "logs/app.log",
		MaxSize:     10,   // 10 MB
		MaxBackups:  5,    // Keep 5 old log files
		MaxAge:      30,   // Keep logs for 30 days
		Compress:    true, // Compress rotated files
	}
}

// InitLogger initializes the global logger with file persistence
func InitLogger(development bool) error {
	config := DefaultLoggerConfig(development)
	return InitLoggerWithConfig(config)
}

// InitLoggerWithConfig initializes the global logger with custom configuration
func InitLoggerWithConfig(config LoggerConfig) error {
	// Create logs directory if it doesn't exist
	logDir := filepath.Dir(config.LogFilePath)
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return err
	}

	// Configure log rotation
	fileWriter := &lumberjack.Logger{
		Filename:   config.LogFilePath,
		MaxSize:    config.MaxSize,
		MaxBackups: config.MaxBackups,
		MaxAge:     config.MaxAge,
		Compress:   config.Compress,
	}

	// Configure encoder
	var encoderConfig zapcore.EncoderConfig
	if config.Development {
		encoderConfig = zap.NewDevelopmentEncoderConfig()
		encoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		encoderConfig = zap.NewProductionEncoderConfig()
		encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	}

	// Create console encoder (with colors for development)
	consoleEncoder := zapcore.NewConsoleEncoder(encoderConfig)

	// Create file encoder (without colors)
	fileEncoderConfig := encoderConfig
	fileEncoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder // No colors in file
	fileEncoder := zapcore.NewJSONEncoder(fileEncoderConfig)

	// Set log level
	logLevel := zapcore.InfoLevel
	if config.Development {
		logLevel = zapcore.DebugLevel
	}

	// Create core that writes to both console and file
	core := zapcore.NewTee(
		zapcore.NewCore(consoleEncoder, zapcore.AddSync(os.Stdout), logLevel),
		zapcore.NewCore(fileEncoder, zapcore.AddSync(fileWriter), logLevel),
	)

	// Create logger with caller information
	Log = zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

	return nil
}

// Sugar returns a sugared logger for easier logging
func Sugar() *zap.SugaredLogger {
	if Log == nil {
		// Initialize with development config if not initialized
		_ = InitLogger(true)
	}
	return Log.Sugar()
}

// Sync flushes any buffered log entries
func Sync() {
	if Log != nil {
		_ = Log.Sync()
	}
}