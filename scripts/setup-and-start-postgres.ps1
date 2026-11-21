$ErrorActionPreference = 'Stop'

$pgsqlDir = "C:\Users\shash\pgsql\pgsql"
$binDir = Join-Path $pgsqlDir "bin"
$dataDir = Join-Path $pgsqlDir "data"
$password = "Sol-0c5f76bea12d4ff2b59c!1"
$env:PGPASSWORD = $password

Write-Host "Setting up PostgreSQL..." -ForegroundColor Cyan

if (-not (Test-Path $dataDir)) {
    Write-Host "Initializing PostgreSQL cluster..." -ForegroundColor Yellow
    $pwFile = Join-Path $pgsqlDir "pw.txt"
    Set-Content -Path $pwFile -Value $password -NoNewline
    try {
        & "$binDir\initdb.exe" -D $dataDir -U postgres -A md5 --pwfile=$pwFile -E UTF8
    } finally {
        if (Test-Path $pwFile) { Remove-Item $pwFile -Force }
    }
}

# Ensure port 5433 is configured
$confFile = Join-Path $dataDir "postgresql.conf"
if (Test-Path $confFile) {
    $confContent = Get-Content $confFile -Raw
    if ($confContent -match "(?m)^\s*port\s*=") {
        $confContent = $confContent -replace "(?m)^\s*port\s*=.*", "port = 5433"
    } else {
        $confContent += "`nport = 5433`n"
    }
    Set-Content -Path $confFile -Value $confContent
}

# Start PostgreSQL server using pg_ctl
Write-Host "Starting PostgreSQL server on port 5433..." -ForegroundColor Cyan
$logFile = Join-Path $dataDir "server.log"
& "$binDir\pg_ctl.exe" -D $dataDir -l $logFile -o "-p 5433" start

# Wait for server ready
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    $status = & "$binDir\pg_isready.exe" -h localhost -p 5433 -U postgres
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
}

if (-not $ready) {
    throw "PostgreSQL did not become ready in time. Check $logFile"
}

Write-Host "PostgreSQL is ready!" -ForegroundColor Green

# Create database 'sol' if it doesn't exist
$dbExists = & "$binDir\psql.exe" -h localhost -p 5433 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='sol'"
if ($dbExists.Trim() -ne "1") {
    Write-Host "Creating database 'sol'..." -ForegroundColor Yellow
    & "$binDir\createdb.exe" -h localhost -p 5433 -U postgres sol
    Write-Host "Database 'sol' created successfully." -ForegroundColor Green
} else {
    Write-Host "Database 'sol' already exists." -ForegroundColor Green
}
