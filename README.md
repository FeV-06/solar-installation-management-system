# Sol

Sol is a solar-installation management project with a public enquiry site, a separate company workspace and an ASP.NET Core API. It is being adapted for the SunPower hackathon brief; the imported application is a starting point, not a complete implementation of that brief.

## Project structure

- `frontend/marketing/` — public website and enquiry form (React, TypeScript and Vite).
- `frontend/staff/` — staff workspace (React, TypeScript and Vite).
- `frontend/brand/` — shared styling, fonts and brand assets.
- `backend/` — .NET 10 API, EF Core, application/domain code and tests.
- `docker-compose.yml` — local PostgreSQL 18 development database.
- `perf/` — imported performance scripts and recorded reference results; they do not establish the performance of this project's future changes.

The current code includes enquiry intake, staff sessions, staff-account management, lead and customer pages and related APIs. The installation details, technician work and production sections include placeholders; verify functionality in the actual code and tests rather than assuming the complete SunPower workflow exists. Quotes and bills of materials, inventory and serial scanning, delivery warranties, service tickets and financial operations still require assessment and implementation against the challenge.

## Local development

- The imported setup and stop scripts are disabled: one contained a database password and another stopped every Node/PostgreSQL process. Rotate the exposed password if it was used; it remains in Git history. Use the steps below instead.

Requirements: Git, .NET 10 SDK, Node.js 22.13+ (or a supported newer release), pnpm 11.15.1 and Docker with Compose. The database image is PostgreSQL 18. Do not commit credentials or genuine customer information.

### Quick Start / Running the Apps

Open **three separate PowerShell terminals** at the repository root.

#### 1. Start the Database (PostgreSQL)
Ensure Docker Desktop is running. Copy `.env.example` to `.env` and set a local PostgreSQL password, connection string, JWT secret, initial admin details and email sender address. Do not use a real email address or Gmail credentials for local tests unless explicitly intended. Verify port `127.0.0.1:5433` is free, then run:
```powershell
docker compose up -d postgres
```


#### 2. Start Backend API (Terminal 1)
The backend does not load `.env` itself; load environment variables into PowerShell and launch the API:
```powershell
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
dotnet restore backend/Sol.slnx
dotnet run --project backend/src/WebAPI
```
- Listens at: `http://localhost:5228`. Development applies pending EF migrations.

#### 3. Start Customer / Marketing Site (Terminal 2)
Public website and enquiry/quote form:
```powershell
cd frontend/marketing
pnpm install
pnpm dev
```
- Serves at: `http://localhost:5173`

#### 4. Start Sales & Staff Panel (Terminal 3)
Staff dashboard for managing leads, customers, and operations:
```powershell
cd frontend/staff
pnpm install
pnpm dev
```
- Serves at: `http://localhost:5174/staff/`
- Proxies `/api` requests to `http://localhost:5228`. Log in using `Admin__Email` and `Admin__Password` from `.env`.

> [!NOTE]
> Local development defaults to the `Recording` email provider: it simulates email delivery and does not send actual emails. Address suggestions via Geoapify are optional. Staff session cookies are secure; a phone connecting over plain LAN HTTP generally needs HTTPS for sign-in. Configure the marketing API URL and CORS origin where needed.

## Checks

- Backend, from `backend/`: `dotnet restore`, `dotnet build`, and `dotnet test`. Integration tests use Testcontainers and create isolated PostgreSQL databases; Docker must be available.
- Each frontend, from its own directory: `pnpm lint`, `pnpm test`, `pnpm build`.
- Windows PowerShell can run `scripts/check-windows.ps1 -Repository <absolute-repo-path> -Pnpm <absolute-path-to-pnpm.cmd>` after installing prerequisites. The script checks the full stack and requires a working Docker daemon for integration tests; its Windows execution has not yet been verified.
- Test actual cross-frontend → API → PostgreSQL workflows with synthetic data. Passing a build or unit test does not mean every product workflow is implemented.

The project is under active development. Follow existing permissions and privacy boundaries; avoid exposing development endpoints publicly. Communicate shared API changes to frontend and testing contributors before integrating them.
