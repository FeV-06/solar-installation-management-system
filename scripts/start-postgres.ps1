$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env"

$port = "55439"
if (Test-Path $envFile) {
    $match = Select-String -Path $envFile -Pattern "Port=(\d+)"
    if ($match -and $match.Matches.Groups[1].Value) {
        $port = $match.Matches.Groups[1].Value
    }
}

Write-Host "Starting PostgreSQL on port $port..." -ForegroundColor Cyan
& "C:\Users\shash\pgsql\pgsql\bin\postgres.exe" -D "C:\Users\shash\pgsql\pgsql\data" -p $port
