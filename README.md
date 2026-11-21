# Solar Installation Management System

A shared starting point for the solar installation management hackathon project. The intended product connects customer enquiries to surveys, quotes, warehouse work, installation, warranties, support and a company operations dashboard.

**Current status: scaffold only.** The app homepage, a database-backed health check, an initial enquiry table, Prisma migration and testing infrastructure are provided. Customer-facing forms, staff login, business APIs, operational workflows and dashboard are **not implemented yet**. Do not enter real customer data or expose this scaffold publicly: authentication and authorization do not yet exist.

## Getting started

Requirements: Git, Node.js 22.13 or newer in the Node 22 LTS line, and pnpm 11.15.1. The project uses Next.js, TypeScript, Prisma 7 and a local SQLite database; no separate database server is needed. SQLite's native driver requires a supported prebuilt binary or a working local native build toolchain.

```sh
git clone https://github.com/FeV-06/solar-installation-management-system.git
cd solar-installation-management-system
pnpm install
```

GitHub access requires an accepted invitation and authentication. On Windows PowerShell, use `pnpm.cmd` if `pnpm` is blocked by execution policy.

Create a local environment file from the example:

```sh
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Then initialize the database, generate the client and start the app:

```sh
pnpm db:deploy
pnpm db:generate
pnpm dev
```

Open `http://127.0.0.1:3000`. `GET /api/health` runs a real database query and reports whether that connection works. The development server binds to localhost by default. A locally hosted server is not the same as an app that works on a disconnected phone.

When changing the Prisma schema, create and review a migration with `pnpm db:migrate --name <name>` and commit the schema and migration together. Use `pnpm db:deploy` to apply already committed migrations on another checkout. The local SQLite DB, `.env`, generated Prisma client and any private uploads must not be committed.

## Quality checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The browser smoke tests use Playwright. Install its Chromium browser once, then run:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

The test server requires the local `.env` and a migrated database. See `docs/testing.md` for test ownership and limitations. Package dependencies are pinned through `pnpm-lock.yaml`. Native build scripts explicitly allowed in `pnpm-workspace.yaml` are needed for the selected tooling; review additions before approving them.

## Working together

- **Backend:** FeV and assistant coordinate the data model, domain rules and API contracts. Existing `src/server/` and `prisma/` files are the starting points, not a finished backend.
- **Frontend:** Build the customer and operational interfaces in `src/app/` and feature-specific components. Agree API types with the backend before integrating; don't ship hardcoded business numbers as live data.
- **Testing:** Extend `tests/` with independent workflow, validation, permission and browser tests. Test actual behavior, not just screen presence.
- **Everyone:** Work on short-lived branches, commit under your own Git identity, and integrate early. Role assignments are provisional and can overlap. The hackathon requires Git participation from more than one member.

Read [the contributor guide](CONTRIBUTING.md), [workstreams](docs/CONTRIBUTING_WORKSTREAMS.md), [architecture](docs/architecture.md), [test guidance](docs/testing.md), [overall spec](docs/specs/overall-spec.md), and [proposed execution spec](docs/specs/execution-spec.md). The specifications are plans, not claims of implemented features.

## Configuration and safety

`DATABASE_URL` defaults to the local file named in `.env.example`; override it only in your own ignored `.env`. Do not commit secrets, `.env`, local databases, uploads, genuine customer information or test reports. Before deploying or sharing beyond a trusted local development environment, implement and verify staff authentication/authorization, protected file handling, abuse controls and appropriate deployment security.
