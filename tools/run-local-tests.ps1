Param(
    [switch]$IncludeE2E
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
    Param(
        [string]$Name,
        [scriptblock]$Action
    )

    Write-Host "`n==> $Name" -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot

Invoke-Step -Name "Backend tests" -Action {
    Push-Location (Join-Path $repoRoot "backend")
    try {
        python -m pytest
    }
    finally {
        Pop-Location
    }
}

Invoke-Step -Name "Frontend unit tests" -Action {
    Push-Location (Join-Path $repoRoot "frontend")
    try {
        npm run test
    }
    finally {
        Pop-Location
    }
}

if ($IncludeE2E) {
    Invoke-Step -Name "Frontend e2e tests" -Action {
        Push-Location (Join-Path $repoRoot "frontend")
        try {
            npm run test:e2e
        }
        finally {
            Pop-Location
        }
    }
}

Write-Host "`nAll requested local tests completed successfully." -ForegroundColor Green
