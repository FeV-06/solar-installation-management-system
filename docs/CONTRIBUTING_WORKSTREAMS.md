# Teammate Guide & Workstream Working Agreements

This document provides a starter guide for Frontend and Testing contributors, paired with a **proposed** Backend working agreement on shared contracts and security boundaries. The described domain APIs, sessions and protected files are not implemented yet.

---

## 1. Provisional Workstreams & Ownership

Role assignments are provisional to enable rapid parallel work during the 24-hour sprint. Team members collaborate across boundaries as priorities shift:

- **Backend Workstream (Main user + assistant):**
  - Database schema, Drizzle migrations, and SQLite persistence.
  - Core domain services, transactional state transitions, and server-side Zod validation.
  - Authenticated session handling and API route handlers.
  - Protected local storage and streaming for photos and signatures.
- **Frontend Workstream (Provisional teammates):**
  - Responsive company workspace shell, navigation drawer/sidebar, and public enquiry form.
  - Departmental work queues and operational detail views (Sales, Survey, Warehouse, Field, Support, Director).
  - Mobile-friendly technician interface, camera/scanner input handling, and signature pad.
- **Testing & Verification Workstream (Provisional teammates):**
  - Systematic test execution against the test matrix (`docs/testing.md`).
  - Boundary, concurrency, and negative testing (unauthorized reads, invalid transitions, boundary dates).
  - Playwright browser test suites across phone, tablet, and desktop viewports.

---

## 2. Frontend Contributor Starter Guide

### 2.1 Workspace Structure & Layouts
- **Application Directory:** `src/app` (Next.js App Router).
- **Public Surface:** Public enquiry form accessible anonymously without authentication.
- **Company Workspace:** Internal dashboard views with unified responsive navigation:
  - Desktop: Persistent sidebar with department queues.
  - Mobile/Tablet: Collapsible hamburger menu or bottom navigation tab bar.
  - Target viewports: **360px** (mobile phone), **768px** (tablet), and **1440px** (desktop).
  - Critical rule: All operational views and forms must fit viewports without horizontal page scrolling.

### 2.2 Field Installation & Technician UI
- The technician interface must be optimized for mobile phone/tablet touch interaction.
- Essential components:
  - Clear inputs for start/finish times and confirmed system capacity.
  - Generation test status (must explicitly record passing power generation).
  - Photo upload component for completed roof documentation.
  - Touch-friendly on-screen signature pad (prevent empty or white-space submissions).

### 2.3 Working with Mock Data (Strict Protocol)
- During the scaffold phase, backend domain routes are not yet live. Frontend builders may use temporary local fixtures in isolated mock files while authoring components.
- **STRICT PROHIBITION:** Never hardcode metrics, counters, or status badges into UI components to simulate working backend logic.
- As soon as a backend route handler is merged, the corresponding UI screen must switch to live API calls or display explicit empty/loading/error states.

---

## 3. Testing Contributor Starter Guide

### 3.1 Verification Mission
The testing workstream focuses on validating business invariants and actively attempting to break the application:
1. **Validation Attacks:** Submit empty, whitespace-only, malformed, or out-of-range payloads to both UI forms and direct API routes.
2. **State Transition Bypasses:**
   - Attempt to generate or send a quote for an unapproved or rejected survey.
   - Attempt to start an installation job before a positive payment has been recorded.
   - Attempt warehouse dispatch with missing, duplicate, or unallocated serial numbers.
   - Attempt to close a service ticket without explicit customer confirmation.
3. **Boundary Math & Edge Cases:**
   - Test warranty start and expiration date calculations across leap years and month boundaries.
   - Test currency calculations in integer paise (ensure no float rounding discrepancies).
   - Test reverse time order (finish time earlier than start time on installation).

### 3.2 Evidence Collection
- Test results must record real outputs: commit hash, environment, steps to reproduce, and observed vs. expected behavior.
- Document blockers directly in the test matrix (`docs/testing.md`).

---

## 4. Backend Working Agreement & Shared Contracts

### 4.1 Response Envelope
All API endpoints follow a strict contract:
- **Success:**
  ```json
  {
    "data": { ... }
  }
  ```
- **Error:**
  ```json
  {
    "error": {
      "code": "STRING_ERROR_CODE",
      "message": "User-facing message",
      "fields": { "fieldName": ["Validation detail"] }
    }
  }
  ```

### 4.2 Security & Data Isolation
- **Authentication:** All company routes (`/api/company/*`) require a valid staff session cookie. Public requests to company routes receive `401 Unauthorized`.
- **Public Isolation:** The public enquiry submission endpoint (`POST /api/enquiries`) accepts submissions only. It must never expose existing customer records, project statuses, or list operational data.
- **File Storage:** Uploaded photos and signatures are saved in a protected directory outside `public/`. They are accessible only via authenticated file streaming endpoints (`/api/company/files/*`) that verify permissions.

### 4.3 Transactional State Guarantees
- Multi-entity writes (e.g., Order Confirmation -> Project + Warehouse Task + Installation Job) must be wrapped in atomic database transactions (`db.transaction`); keep SQLite's synchronous driver transaction callbacks synchronous.
- Business rules are enforced on the server. UI validation and disabled buttons provide user guidance, but server handlers must reject invalid transitions with `400 Bad Request` or `409 Conflict`.

---

## 5. Cross-Platform Developer Tips

- **Package Execution:**
  - On Linux / macOS: Use `pnpm <command>`.
  - On Windows: Use `pnpm.cmd <command>` if `pnpm` is not globally aliased in your shell.
  - Avoid assuming custom global aliases; use the scripts defined in `package.json`.
- **File Paths:**
  - Always use Node's `path.join()` or POSIX forward slashes (`/`) in application and tool scripts. Avoid hardcoded Windows backslashes (`\`).
- **SQLite Native Driver:**
  - Drizzle uses `better-sqlite3`, a native dependency. On Windows or locked-down environments, ensure a compatible prebuilt binary or native build tools are available and that the project folder is writable.

---

## 6. Scaffold Phase Reality Check

- **Current State:** The repository contains a minimal Next.js application, the `/api/health` route, Drizzle configuration and an initial Enquiry table/migration, and basic test harnesses. Authentication and business APIs remain unimplemented.
- **Do Not Assume Endpoints Exist:** Do not write frontend code assuming `/api/quotes`, `/api/inventory`, or `/api/dispatch` are operational today.
- Workstream integration will proceed iteratively as domain endpoints are merged and verified.
