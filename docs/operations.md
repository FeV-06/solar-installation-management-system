# Operations & Deployment Runbook

This runbook covers environment configuration, local orchestration, database management, background jobs, and operational troubleshooting for the Sol platform.

---

## 1. Prerequisites

- **Operating System:** Windows, macOS, or Linux.
- **Runtimes & SDKs:**
  - .NET 10.0 SDK (`10.0.100` or later, rolling forward to latest feature release).
  - Node.js 22.13.0+ LTS.
  - pnpm 11.15.1+ (`corepack enable && corepack prepare pnpm@11.15.1 --activate`).
  - Docker Desktop with Compose V2.
- **Database Engine:** PostgreSQL 18 (containerized via `docker-compose.yml`).

---

## 2. Environment Configuration

Copy `.env.example` to `.env` in the repository root. Ensure secrets are populated:

```env
# Database Credentials
POSTGRES_PASSWORD=your_secure_postgres_password_here
ConnectionStrings__Default="Host=localhost;Port=5433;Database=sol;Username=postgres;Password=your_secure_postgres_password_here"

# Security Keys
Jwt__Secret=your_at_least_32_characters_random_secret_here

# Initial System Administrator (Created automatically on empty database)
Admin__Name="System Administrator"
Admin__Email="admin@sunpower.local"
Admin__Password="AdminPassword123!"

# Email Subsystem (Default: Recording provider in development)
Email__FromAddress="notifications@sunpower.local"
# For Gmail OAuth / SMTP (optional in local development)
Email__Gmail__ClientId=
Email__Gmail__ClientSecret=
Email__Gmail__RefreshToken=
```

> [!IMPORTANT]
> The WebAPI executable does not load `.env` directly from disk. On Windows PowerShell, load the `.env` variables into the current session process before starting the backend (see Running the Services below).

---

## 3. Running the Platform Locally

Open three separate terminals at the repository root:

### Terminal 1: Database & Backend WebAPI
```powershell
# 1. Start PostgreSQL 18
docker compose up -d postgres

# 2. Export .env variables into current session
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') {
    $name = $Matches[1]
    $value = $Matches[2].Trim()
    if ($value.Length -ge 2 -and $value[0] -eq '"' -and $value[$value.Length - 1] -eq '"') {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

# 3. Launch WebAPI (auto-applies pending EF migrations and seeds FirstAdmin)
dotnet run --project backend/src/WebAPI
```
- **WebAPI Host:** `http://localhost:5228`
- **Interactive Documentation:** `http://localhost:5228/scalar/v1`
- **Hangfire Dashboard:** `http://localhost:5228/hangfire`

### Terminal 2: Customer / Marketing Frontend
```powershell
cd frontend/marketing
pnpm install
pnpm dev
```
- **Marketing Site:** `http://localhost:5173`
- **Public Quote Form:** `http://localhost:5173/quote`
- **Customer Sign-in & Portal:** `http://localhost:5173/signin` and `http://localhost:5173/portal`

### Terminal 3: Staff Operations Dashboard
```powershell
cd frontend/staff
pnpm install
pnpm dev
```
- **Staff Panel:** `http://localhost:5174/staff/`
- **Sign In:** Use the credentials configured in `Admin__Email` and `Admin__Password`.

---

## 4. Background Job Processing & Transactional Outbox

### 4.1 Outbox Pattern
All transactional notifications (e.g., lead receipt confirmation, survey scheduling alerts, customer quote proposals) utilize the transactional outbox pattern:
- The domain event and outbox record (`outbox_messages` table) are committed in the same database transaction as the business entity.
- An asynchronous dispatcher picks up pending outbox messages and attempts delivery.
- If delivery fails, exponential backoff retries the message for up to 24 hours.
- Messages failing beyond 24 hours transition to `Failed` and surface on the Staff Notifications screen (`/notifications`) for manual or batch retry.

### 4.2 Hangfire Jobs
- In development, the Hangfire dashboard is accessible locally at `/hangfire`.
- Hangfire schedules a recurring daily job: `OutboxCleanupJob`, which purges completed outbox records older than retention thresholds to keep database tables lean.

---

## 5. Database Migrations & Administration

### Applying Migrations
In development mode, WebAPI automatically checks and applies pending EF Core migrations on startup:
```csharp
using var scope = app.Services.CreateScope();
var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
await context.Database.MigrateAsync();
```

### Adding a New Migration
Run from the `backend/` directory:
```powershell
dotnet ef migrations add <MigrationName> --project src/Infrastructure --startup-project src/WebAPI
```

---

## 6. Operational Troubleshooting

| Symptom | Probable Cause | Resolution |
|---|---|---|
| `docker compose` fails on port 5433 | Local port conflict | Check if another PostgreSQL instance is using `5433` (`Get-NetTCPConnection -LocalPort 5433`). Update host port mapping in `docker-compose.yml` if needed. |
| API returns `401 Unauthorized` on staff routes | Missing or expired `sol-session` cookie | Ensure browser cookies are allowed for `localhost`. Re-authenticate at `/staff/login`. |
| Customer portal shows `401 Unauthorized` | Missing customer session cookie | Log in via OTP or password at `/signin`. |
| `403 Forbidden` on state mutation (e.g. POST/PUT) | CSRF SameOrigin check rejected | Request `Origin` or `Referer` header does not match the expected API host. Verify proxy configuration in `vite.config.ts`. |
| Email notifications not received locally | `Recording` email provider active | In development, the system simulates email delivery with 2-second latency. Set `Email__Provider=Gmail` and OAuth credentials if live dispatch is required. |
