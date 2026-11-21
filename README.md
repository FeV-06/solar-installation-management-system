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

Requirements: Git, .NET 10 SDK, Node.js 22.13+ (or a supported newer release), pnpm 11.15.1 and Docker with Compose. The database image is PostgreSQL 18. Do not commit credentials or genuine customer information.

1. Copy `.env.example` to `.env` and set a local PostgreSQL password, database connection string, JWT secret, initial admin details and email sender address. The backend **does not load `.env` itself**: pass the variables to its process through your IDE, shell or another trusted local environment manager. Docker Compose reads the root `.env` automatically. Do not use a real email address or Gmail credentials for local tests unless explicitly intended.
2. From the repository root, start only this project's database with `docker compose up -d postgres`. Verify port `127.0.0.1:5433` is free first. Keep other running services untouched.
3. From `backend/`, after providing the environment variables, run `dotnet restore` and `dotnet run --project src/WebAPI`. Development applies pending EF migrations. See the launch profile and appsettings for the local API endpoint.
4. In separate terminals, run `pnpm install` then `pnpm dev` from `frontend/marketing/` and `frontend/staff/`. Configure the marketing API URL and CORS origin where needed. The staff dev server proxies `/api` to its configured API target.

Local development defaults to the Recording email provider: it stores/simulates delivery and **does not send real mail**. Geoapify address suggestions are optional; entering an address manually does not require the key. Staff session cookies are Secure; a phone connecting over plain LAN HTTP generally needs HTTPS for sign-in.

## Checks

- Backend, from `backend/`: `dotnet restore`, `dotnet build`, and `dotnet test`. Integration tests use Testcontainers and create isolated PostgreSQL databases; Docker must be available.
- Each frontend, from its own directory: `pnpm lint`, `pnpm test`, `pnpm build`.
- Windows PowerShell can run `scripts/check-windows.ps1 -Repository <absolute-repo-path> -Pnpm <absolute-path-to-pnpm.cmd>` after installing prerequisites. The script checks the full stack and requires a working Docker daemon for integration tests; its Windows execution has not yet been verified.
- Test actual cross-frontend → API → PostgreSQL workflows with synthetic data. Passing a build or unit test does not mean every product workflow is implemented.

The project is under active development. Follow existing permissions and privacy boundaries; avoid exposing development endpoints publicly. Communicate shared API changes to frontend and testing contributors before integrating them.
