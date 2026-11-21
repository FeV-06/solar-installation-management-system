---
name: solar-installation-development
description: Use when developing the Solar Installation Management System hackathon project.
---

# Solar installation development

This project-local skill is portable across team coding agents. It documents durable project context; inspect the current source and Git history before treating any workflow as implemented.

## Orient

- Read repo-root `AGENTS.md`, `README.md`, `docs/specs/overall-spec.md`, `docs/specs/execution-spec.md`, and the relevant architecture/testing guides. Run `git status --short --branch` and inspect teammate/remote changes before integrating; do not push without explicit user direction.
- FeV and assistant coordinate the main backend. Frontend and QA are provisional parallel workstreams; agree shared interfaces before implementation and never assume handles map to roles.
- The first priority is a real customer-to-service journey with an actionable company workspace. Full-scope requirements remain in the overall spec; do not call an incomplete slice a complete product.

## Domain and security rules

- Validate and enforce access control and business states on the server. Staff auth, protected files and business flows are only present if verified in the actual code. Do not expose unauthenticated scaffolding or use real customer data.
- An approved survey is required before sending a quote; this project's demo plan also gates generating it. Order confirmation atomically creates the project, warehouse work and installation job; ensure retries and concurrent requests cannot duplicate linked records.
- Scan required serials for inverters, batteries and charge controllers before dispatch. A typed serial is a fallback, not proof of scanning. Delivery—not dispatch—starts the applicable warranty; do not invent real product terms or assume panel serialization.
- Capture field times, capacity, generation test, photo and customer signature; keep evidence private. Service tickets stay open until the customer confirms resolution; covered repair is free, out-of-warranty parts and labour are billed, and unknown coverage needs review.
- Use integer paise for money, distinguish receipts from project direct margin, and flag incomplete costs. Do not hardcode live dashboards or misrepresent synthetic fixtures.

## Stack and workflow

- Next.js App Router + TypeScript, Drizzle ORM + local SQLite (`better-sqlite3`), pnpm, Vitest and Playwright. This synchronous SQLite driver requires synchronous Drizzle transaction callbacks. Make sure each connection enforces SQLite foreign keys.
- Follow README setup. For schema changes edit `src/server/db/schema.ts`, run `pnpm db:generate --name <name>`, review the generated SQL and metadata in `drizzle/`, run `pnpm db:migrate`, and commit schema plus migration together. `db:generate` generates migration files, not a client.
- Previous Prisma development databases have a separate migration history; follow the README backup/reset guidance only when the owner has agreed to discard local data. Do not reset another person's database.
- `better-sqlite3` is a native dependency; verify install and builds on each target platform. pnpm disables peer auto-installation so unused optional adapters are not pulled in; required peers must be explicit. The pinned dev-loader esbuild override addresses GHSA-67mh-4wv8-2f99; rerun dependency and migration tests if changing it.
- SQLite `CURRENT_TIMESTAMP` emits UTC text without an offset; Drizzle `$onUpdateFn` runs only for Drizzle writes, not arbitrary SQL. Do not mix date formats or mistake application defaults for DB constraints; test timestamps and timezone boundaries when adding features.
- Run relevant `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm test:e2e`. Database-writing tests need isolated temporary files. Existing browser smoke tests are read-only; isolate the server DB before adding writes. Always report unverified features and test failures honestly.
