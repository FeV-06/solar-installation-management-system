$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env"

if (Test-Path $envFile) {
    Write-Host "Loading environment variables from $envFile..." -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $parts = $line -split '=', 2
        if ($parts.Count -eq 2) {
            $name = $parts[0].Trim()
            $value = $parts[1].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

# Ensure both configured port (e.g. 55229) and standard proxy port (5228) are bound
$urls = [Environment]::GetEnvironmentVariable("ASPNETCORE_URLS", "Process")
if (-not $urls) {
    $urls = "http://localhost:5228"
} elseif (-not ($urls -match "5228")) {
    $urls = "$urls;http://localhost:5228"
}
[Environment]::SetEnvironmentVariable("ASPNETCORE_URLS", $urls, "Process")

Write-Host "Starting WebAPI on $urls..." -ForegroundColor Green
Set-Location -LiteralPath $repoRoot
dotnet run --project backend/src/WebAPI --no-launch-profile
