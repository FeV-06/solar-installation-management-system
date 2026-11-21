Stop-Process -Name WebAPI, node, postgres -Force -ErrorAction SilentlyContinue
Write-Host "All frontend, backend, and PostgreSQL services have been stopped." -ForegroundColor Yellow
