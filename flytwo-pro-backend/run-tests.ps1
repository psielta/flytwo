# PowerShell script to run all tests for GoBid Backend

param(
    [Parameter()]
    [ValidateSet("all", "verbose", "cover", "api", "validator", "jsonutils", "integration", "full")]
    [string]$TestType = "all"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " GoBid Backend Test Runner" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

function Run-AllTests {
    Write-Host "Running all tests..." -ForegroundColor Yellow

    Write-Host "`n=== Validator Package ===" -ForegroundColor Green
    go test ./internal/validator -v

    Write-Host "`n=== JSON Utils Package ===" -ForegroundColor Green
    go test ./internal/jsonutils -v

    Write-Host "`n=== API Handlers Package ===" -ForegroundColor Green
    go test ./internal/api -v -run "^(TestHandle)"

    Write-Host "`n✅ All tests completed!" -ForegroundColor Green
}

function Run-TestsWithCoverage {
    Write-Host "Running tests with coverage..." -ForegroundColor Yellow

    Write-Host "`n=== Validator Package ===" -ForegroundColor Green
    go test ./internal/validator -cover

    Write-Host "`n=== JSON Utils Package ===" -ForegroundColor Green
    go test ./internal/jsonutils -cover

    Write-Host "`n=== API Handlers Package ===" -ForegroundColor Green
    go test ./internal/api -cover -run "^(TestHandle)"

    Write-Host "`n=== Overall Coverage Summary ===" -ForegroundColor Cyan
    go test ./internal/... -cover | Select-String -Pattern "ok|FAIL|coverage"
}

function Run-ApiTests {
    Write-Host "Running API handler tests..." -ForegroundColor Yellow
    go test ./internal/api -v -run "^(TestHandle)"
}

function Run-ValidatorTests {
    Write-Host "Running validator tests..." -ForegroundColor Yellow
    go test ./internal/validator -v
}

function Run-JsonUtilsTests {
    Write-Host "Running jsonutils tests..." -ForegroundColor Yellow
    go test ./internal/jsonutils -v
}

function Run-IntegrationTests {
    Write-Host "Running integration tests with real database..." -ForegroundColor Yellow
    Write-Host "Make sure PostgreSQL is running on port 5580" -ForegroundColor Cyan
    $env:RUN_INTEGRATION_TESTS = "true"
    go test ./internal/api -v -tags=integration -run "^TestIntegration"
    Remove-Item Env:\RUN_INTEGRATION_TESTS
}

function Run-FullTests {
    Write-Host "Running all tests including integration..." -ForegroundColor Yellow
    Run-AllTests
    Write-Host "`n" -ForegroundColor White
    Run-IntegrationTests
}

# Execute based on parameter
switch ($TestType) {
    "all" {
        Run-AllTests
    }
    "verbose" {
        Run-AllTests
    }
    "cover" {
        Run-TestsWithCoverage
    }
    "api" {
        Run-ApiTests
    }
    "validator" {
        Run-ValidatorTests
    }
    "jsonutils" {
        Run-JsonUtilsTests
    }
    "integration" {
        Run-IntegrationTests
    }
    "full" {
        Run-FullTests
    }
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host " Test execution finished" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan