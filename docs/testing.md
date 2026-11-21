# Testing Strategy & Initial Acceptance Matrix

This document defines the testing methodology, environment considerations, and the initial acceptance test matrix for the SunPower Solutions Solar Installation Management System.

---

## 1. Testing Philosophy & Layers

Testing in this 24-hour hackathon project is organized into four complementary layers to ensure business invariant enforcement, data integrity, and responsive user experience.

1. **Domain & Unit Layer (Vitest):**
   - Business rules, state machine transitions, date arithmetic (warranty start/end boundaries), currency calculations in integer paise.
   - Future database-writing tests must use an isolated local test SQLite database. The initial health unit tests do not write business data.
2. **API & Integration Layer (Vitest):**
   - HTTP route handlers, Zod request/response validation, authentication middleware checks.
   - Negative testing: missing fields, malformed inputs, unauthorized access, out-of-order state transitions.
3. **Browser & Multi-Viewport Layer (Playwright):**
   - End-to-end journey from enquiry submission to service ticket closure.
   - Viewport validation across target screen sizes:
     - **Mobile Phone:** 360 × 640 px (technician field interface, customer enquiry).
     - **Tablet:** 768 × 1024 px (warehouse and manager tablet use).
     - **Desktop:** 1440 × 900 px (sales and operations dashboard).
   - Invariant: Zero horizontal scroll on primary forms and navigation menus.
4. **Manual & Exploratory QA:**
   - Barcode/camera scanning input validation.
   - Signature canvas touch/pointer interaction (ensuring non-blank submissions).
   - Server restart persistence checks (verifying SQLite persistence survives application restarts).

---

## 2. Cross-Platform Test Execution

Tests are executed using project package scripts:
- **Unit & Integration:**
  - Linux/macOS: `pnpm test`
  - Windows: `pnpm.cmd test`
- **End-to-End (Playwright):**
  - Linux/macOS: `pnpm test:e2e`
  - Windows: `pnpm.cmd test:e2e`
- **Isolated Test Database:**
  - Tests must never mutate development or demo SQLite database files. Before adding database-writing tests, configure and verify a dedicated test database (e.g., `test.db`); this isolation has not yet been implemented by the scaffold.

---

## 3. Initial Acceptance Test Matrix

The following matrix covers the primary acceptance criteria (AC) established in the project specifications.

| Test ID | Area / Story | Target Scenario & Business Invariant | Expected Outcome & Negative Checks | Scaffold Status |
|---|---|---|---|---|
| **TC-01** | Sales / US-01 | Submit valid public enquiry with customer details, system type, and subsidy interest. | Enquiry is persisted and appears immediately in the sales queue. | `PENDING` |
| **TC-02** | Sales / US-01 | Submit enquiry missing required name, phone, or address via UI and direct API. | Rejected with `400 Bad Request` and field-level validation errors; no record created. | `PENDING` |
| **TC-03** | Survey / US-02 | Attempt to generate or send quote for an unapproved or rejected site survey. | Request rejected with `409 Conflict`; quote generation is strictly blocked. | `PENDING` |
| **TC-04** | Quote / US-02 | Approve survey and generate quote using synthetic 3 kW package template. | Quote saved with immutable snapshot parts list; future template edits do not alter quote. | `PENDING` |
| **TC-05** | Order / US-03 | Customer accepts quote; confirm order. | Atomic transaction creates Project, Warehouse packing task, and Installation job. | `PENDING` |
| **TC-06** | Order / US-03 | Duplicate/concurrent quote confirmation requests. | Idempotent response; exactly one Project and linked work items exist. | `PENDING` |
| **TC-07** | Order / US-03 | Attempt to start installation before a positive payment is recorded. | Action blocked with error indicating payment prerequisite is unmet. | `PENDING` |
| **TC-08** | Warehouse / US-04 | Warehouse dispatch attempted with missing required serial number (inverter/battery/controller). | Dispatch blocked; error identifies the specific missing serialized item. | `PENDING` |
| **TC-09** | Warehouse / US-04 | Dispatch attempted with a duplicate serial or one already allocated to another project. | Rejected with conflict error; inventory allocation integrity maintained. | `PENDING` |
| **TC-10** | Warehouse / US-04 | Record delivery as distinct event after dispatch. | Delivery date triggers automatic warranty start; delivery before dispatch is rejected. | `PENDING` |
| **TC-11** | Warranty / US-04 | Boundary date calculations for warranties (e.g., 2-year inverter, 20-year panel). | Evaluates half-open `[start, end)` in `Asia/Kolkata`; Feb 29 leap dates handled deterministically. | `PENDING` |
| **TC-12** | Install / US-05 | Field technician records start/finish times, capacity, passing generation test, roof photo, signature. | Evidence securely persisted; installation marked completed. | `PENDING` |
| **TC-13** | Install / US-05 | Field technician submits finish time earlier than start time, missing generation test, or blank signature. | Submission rejected by server validation; installation remains incomplete. | `PENDING` |
| **TC-14** | Install / US-05 | Unauthenticated request attempts to download installation photo or signature file. | Server returns `401 Unauthorized` / `403 Forbidden`; files remain private. | `PENDING` |
| **TC-15** | Service / US-06 | Support searches customer/serial for in-warranty equipment; records repair work. | Ticket created; in-warranty repair yields ₹0 customer charge. | `PENDING` |
| **TC-16** | Service / US-06 | Support logs repair for synthetic expired equipment. | Recorded parts and labour automatically calculate out-of-warranty service charge. | `PENDING` |
| **TC-17** | Service / US-06 | Attempt to close service ticket without recorded customer confirmation. | Ticket remains open in `AWAITING_CUSTOMER`; closure blocked. | `PENDING` |
| **TC-18** | Director / US-07 | Overview financial calculations (Receipts vs. Project Value vs. Direct Margin). | Metrics computed from persisted records in integer paise; missing cost data flagged. | `PENDING` |
| **TC-19** | Director / US-07 | Period filtering across Today, This Week, and This Month boundaries. | Half-open intervals correctly partition records according to `Asia/Kolkata` time. | `PENDING` |
| **TC-20** | Responsive / US-07 | Multi-viewport check across 360px, 768px, and 1440px widths. | Navigation and forms adapt responsively with zero horizontal scrolling. | `PENDING` |

---

## 4. Current Scaffold Verification Status

At the current initial scaffold stage:
- **Baseline Health Check:** The scaffold contains `/api/health`, which performs a Prisma SQLite query; execute it locally to verify your environment.
- **Domain Coverage:** All domain test cases (`TC-01` through `TC-20`) are currently `PENDING`. As endpoints and services are implemented, real execution results will be recorded with commit hashes and test output logs.
