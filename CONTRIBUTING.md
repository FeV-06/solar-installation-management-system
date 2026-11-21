# Contributing to Solar Installation Management System

Welcome to the team repository for SunPower Solutions Solar Installation Management System, built for the 24-hour hackathon challenge.

---

## Current Scaffold State

The repository is in its initial scaffold phase:
- **Framework:** Next.js (App Router) with TypeScript (`src/app`).
- **Database & ORM:** SQLite with Prisma 7 (`prisma/schema.prisma`).
- **Verification:** Vitest for unit/integration tests and Playwright for browser testing.
- **Active Endpoints:** Baseline `/api/health` and database connectivity verification only.
- **Status:** All domain features, department dashboards, authentication, and file upload endpoints are **unimplemented**. Do not assume functional routes or dashboards exist beyond baseline connectivity.

---

## Provisional Team Workstreams

Role assignments are provisional and designed to facilitate parallel execution during the 24-hour sprint. Team members can assist across workstreams as priorities demand:

1. **Backend Workstream (Main user + assistant):**
   - Core domain models, Prisma schema & migrations.
   - Transactional business logic (order creation, serialized dispatch, delivery warranties).
   - Server-side validation (Zod) and authenticated API route handlers.
   - Protected local file storage for installation evidence and signatures.

2. **Frontend Workstream (Provisional teammates):**
   - Responsive public enquiry form.
   - Company workspace shell and navigation (desktop sidebar, mobile header/drawer).
   - Departmental work queues and operational forms (Sales, Survey, Warehouse, Field Installation, Support).
   - Mobile-friendly technician interface with scanner input and signature capture.

3. **Testing & QA Workstream (Provisional teammates):**
   - Test matrix execution and expansion.
   - Negative testing: invalid state transitions, boundary dates, duplicate submissions, unapproved actions.
   - Automated Vitest integration tests and Playwright multi-viewport flows (360px, 768px, 1440px).
   - Device and environment validation (camera/barcode scanner, phone touch inputs).

---

## Cross-Platform Environment

The project standardizes on **Node.js LTS** and **pnpm**:
- **Unix / macOS:** Standard `pnpm <command>` invocations.
- **Windows:** Use `pnpm.cmd <command>` in PowerShell or Command Prompt if `pnpm` is not globally aliased in your shell.
- **Prisma & SQLite:** The selected adapter uses the native `better-sqlite3` dependency. If no compatible prebuilt binary is available, ensure native build prerequisites are met.
- **Line Endings & Paths:** Git should manage line endings (LF preferred). Avoid hardcoded POSIX or Windows file path separators in application code; use Node's `path` module.

---

## Working Agreements & Git Rules

1. **Multi-Member Git Participation:**
   - Active contribution from multiple team members across commits is an explicit requirement.
   - Work on short-lived feature branches and merge regularly to keep `main` healthy.
2. **Never Commit Sensitive or Ephemeral Data:**
   - Never commit SQLite database files (`*.db`, `*.db-journal`, `*.sqlite`), uploaded demo files, or `.env` files containing secrets.
3. **No Fake Dynamic Values:**
   - Do not hardcode metrics, queue counters, or status badges into UI components to create the illusion of functionality. UI components must consume live API responses or render explicit empty/loading states.
4. **Contract-First Communication:**
   - Agree on TypeScript request/response shapes before building frontend views against backend endpoints. See `docs/CONTRIBUTING_WORKSTREAMS.md` for details.

---

## Documentation Index

- **System Architecture & Lifecycle Rules:** [`docs/architecture.md`](docs/architecture.md)
- **Workstreams & Developer Working Agreement:** [`docs/CONTRIBUTING_WORKSTREAMS.md`](docs/CONTRIBUTING_WORKSTREAMS.md)
- **Test Strategy & Acceptance Matrix:** [`docs/testing.md`](docs/testing.md)
- **Specifications:** [`docs/specs/`](docs/specs/) (the overall product and execution specs derived from the supplied problem statement; not the original PDF).
