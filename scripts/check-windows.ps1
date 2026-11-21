[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $Repository,
    [Parameter(Mandatory = $true)] [string] $Pnpm,
    [string] $Git = 'git',
    [string] $Node = 'node',
    [string] $DotNet = 'dotnet',
    [string] $Docker = 'docker'
)

$ErrorActionPreference = 'Stop'
$Repository = (Resolve-Path -LiteralPath $Repository).Path
$env:HUSKY = '0'
$env:CI = 'true'

function Assert-Exit([string] $Step) {
    if ($LASTEXITCODE -ne 0) {
        throw "$Step failed with exit code $LASTEXITCODE"
    }
}

function Run-Executable([string] $Step, [string] $Executable, [string[]] $CommandArgs) {
    Write-Host "`n--- $Step ---"
    & $Executable @CommandArgs
    Assert-Exit $Step
}

try {
    Set-Location -LiteralPath $Repository
    Run-Executable 'Git version' $Git @('--version')
    Run-Executable 'Node version' $Node @('--version')
    Run-Executable 'pnpm version' $Pnpm @('--version')
    Run-Executable '.NET version' $DotNet @('--version')
    Run-Executable 'Docker daemon' $Docker @('info', '--format', '{{.ServerVersion}}')
    Run-Executable 'Repository status' $Git @('status', '--short', '--branch')

    foreach ($App in @('marketing', 'staff')) {
        Set-Location -LiteralPath (Join-Path $Repository "frontend/$App")
        Run-Executable "$App install" $Pnpm @('install', '--frozen-lockfile', '--ignore-scripts')
        Run-Executable "$App lint" $Pnpm @('lint')
        Run-Executable "$App tests" $Pnpm @('test')
        Run-Executable "$App build" $Pnpm @('build')
    }

    Set-Location -LiteralPath (Join-Path $Repository 'backend')
    Run-Executable 'Backend restore' $DotNet @('restore')
    Run-Executable 'Backend build' $DotNet @('build', '--no-restore')
    Run-Executable 'Backend unit tests' $DotNet @('test', '--project', 'tests/UnitTests/UnitTests.csproj', '--no-build')
    Run-Executable 'Backend integration tests' $DotNet @('test', '--project', 'tests/IntegrationTests/IntegrationTests.csproj', '--no-build')
    Write-Host "`nPASS: Sol full-platform verification"
} catch {
    Write-Error $_
    exit 1
}
