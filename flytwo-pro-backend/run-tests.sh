#!/bin/bash

# Bash script to run all tests for GoBid Backend

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    echo -e "${1}${2}${NC}"
}

print_header() {
    print_color "$CYAN" "====================================="
    print_color "$CYAN" " GoBid Backend Test Runner"
    print_color "$CYAN" "====================================="
    echo ""
}

run_all_tests() {
    print_color "$YELLOW" "Running all tests..."

    print_color "$GREEN" "\n=== Validator Package ==="
    go test ./internal/validator -v

    print_color "$GREEN" "\n=== JSON Utils Package ==="
    go test ./internal/jsonutils -v

    print_color "$GREEN" "\n=== API Handlers Package ==="
    go test ./internal/api -v -run "^(TestHandle)"

    print_color "$GREEN" "\n✅ All tests completed!"
}

run_tests_with_coverage() {
    print_color "$YELLOW" "Running tests with coverage..."

    print_color "$GREEN" "\n=== Validator Package ==="
    go test ./internal/validator -cover

    print_color "$GREEN" "\n=== JSON Utils Package ==="
    go test ./internal/jsonutils -cover

    print_color "$GREEN" "\n=== API Handlers Package ==="
    go test ./internal/api -cover -run "^(TestHandle)"

    print_color "$CYAN" "\n=== Overall Coverage Summary ==="
    go test ./internal/... -cover | grep -E "ok|FAIL|coverage"
}

run_api_tests() {
    print_color "$YELLOW" "Running API handler tests..."
    go test ./internal/api -v -run "^(TestHandle)"
}

run_validator_tests() {
    print_color "$YELLOW" "Running validator tests..."
    go test ./internal/validator -v
}

run_jsonutils_tests() {
    print_color "$YELLOW" "Running jsonutils tests..."
    go test ./internal/jsonutils -v
}

run_integration_tests() {
    print_color "$YELLOW" "Running integration tests with real database..."
    print_color "$CYAN" "Make sure PostgreSQL is running on port 5580"
    RUN_INTEGRATION_TESTS=true go test ./internal/api -v -tags=integration -run "^TestIntegration"
}

run_full_tests() {
    print_color "$YELLOW" "Running all tests including integration..."
    run_all_tests
    echo ""
    run_integration_tests
}

# Print usage
usage() {
    echo "Usage: $0 [option]"
    echo "Options:"
    echo "  all         - Run all tests (default)"
    echo "  cover       - Run all tests with coverage"
    echo "  api         - Run only API handler tests"
    echo "  validator   - Run only validator tests"
    echo "  jsonutils   - Run only jsonutils tests"
    echo "  integration - Run integration tests with real database"
    echo "  full        - Run all tests including integration"
    echo "  help        - Show this help message"
}

# Main script
print_header

case "${1:-all}" in
    all)
        run_all_tests
        ;;
    cover)
        run_tests_with_coverage
        ;;
    api)
        run_api_tests
        ;;
    validator)
        run_validator_tests
        ;;
    jsonutils)
        run_jsonutils_tests
        ;;
    integration)
        run_integration_tests
        ;;
    full)
        run_full_tests
        ;;
    help)
        usage
        ;;
    *)
        print_color "$RED" "Invalid option: $1"
        usage
        exit 1
        ;;
esac

print_color "$CYAN" "\n====================================="
print_color "$CYAN" " Test execution finished"
print_color "$CYAN" "====================================="