# System Architecture & Lifecycle Rules

This document outlines **proposed**, not implemented, architectural boundaries, domain state lifecycles, and shared contract patterns for the Solar Installation Management System. The current scaffold has only the Next.js homepage, health check, initial Enquiry table and migration. Authentication, private file storage and all business workflows remain unimplemented. Do not expose the scaffold publicly or enter real customer data.

---

## 1. System Overview & Boundaries

The proposed application uses a unified Next.js App Router application, a local SQLite database and protected file storage. Only the app shell and SQLite connection exist today; the diagram below is a target, not a description of current endpoints or security.

### 1.1 Architectural Surfaces

```
+--------------------------------------------------------------------------+
|                           Client Layer (Browser)                         |
|  +-------------------------------+   +--------------------------------+  |
|  |     Public Enquiry Portal     |   |   Internal Company Workspace   |  |
|  |  (Anonymous lead submission)  |   | (Sales, Survey, Warehouse, etc)|  |
|  +---------------+---------------+   +---------------+----------------+  |
+------------------|-----------------------------------|-------------------+
                   |                                   | (Session Cookie)
                   v                                   v
+--------------------------------------------------------------------------+
|                       Next.js Server & Route Handlers                    |
|  +-------------------------------+   +--------------------------------+  |
|  |   /api/enquiries (public POST)|   |   /api/company/* (auth-gated)  |  |
|  +---------------+---------------+   +---------------+----------------+  |
|                  |                                   |                   |
|                  +-----------------+-----------------+                   |
|                                    v                                     |
|                       Server-Side Zod Validation                         |
|                                    v                                     |
|                        Drizzle ORM (Transactions)                        |
+------------------------------------|-------------------------------------+
                                     v
+--------------------------------------------------------------------------+
|                           Persistence Layer                              |
|  +-------------------------------+   +--------------------------------+  |
|  |     SQLite Database          |   |    Private Upload Directory    |  |
|  |    (Local dev/demo database)  |   | (Protected photos & signatures)|  |
|  +-------------------------------+   +--------------------------------+  |
+--------------------------------------------------------------------------+
```

1. **Public Surface:**
   - Single entry point for prospective customers to submit rooftop solar enquiries.
   - Accepts customer details, requested system type/capacity, and subsidy interest.
   - Anonymous access only; cannot query or enumerate any company or customer records.
2. **Company Workspace:**
   - Dedicated internal interface supporting role-appropriate operational queues: Sales, Surveys, Projects/Installation, Warehouse, Service/Support, and Director Overview.
   - All operational read and write routes require an authenticated staff session.
3. **Protected Evidence Storage:**
   - Uploaded roof photos and drawn customer signatures are saved to a private local directory outside the public web root (`public/`).
   - Files are served only through authenticated route handlers that verify authorization.

---

## 2. Core Workflow Lifecycles & State Rules

The business workflow follows a connected, customer-to-service lifecycle. Server-side validation must enforce each transition.

### 2.1 Enquiry & Qualification
- Customer submits enquiry via the public form (or staff logs phone/WhatsApp leads).
- Enquiry enters the Sales work queue.
- Sales staff record qualification details: shadow-free roof area, monthly electricity bill, and grid connection suitability.

### 2.2 Survey & Gated Quoting
- Site visit records roof direction, tilt angle, cable distance, and technician notes.
- **Strict Server Gate:** A customer quote cannot be generated or sent until the survey status is explicitly set to `APPROVED` by an authorized reviewer. Unapproved or rejected surveys block quote generation.

### 2.3 Package Templates & Snapshot Bill of Materials
- Standard package templates define systems (1–5 kW On-Grid, Off-Grid, hardware-only panel set, installation service).
- Quoting from a template generates an **immutable snapshot parts list** saved to the project. Subsequent template changes must never retroactively alter agreed quotes.

### 2.4 Order Confirmation & Work Queue Fan-Out
- Customer acceptance is recorded and the quote is confirmed.
- **Atomic Transaction:** Confirming an order creates:
  1. The confirmed `Project` record.
  2. The warehouse `PackingItem` queue entry.
  3. The field `InstallationJob` queue entry.
- Idempotency: Duplicate or concurrent confirmation requests must never create duplicate projects, packing items, or jobs.
- **Proposed Payment Prerequisite:** Installation work cannot start until a positive advance or full payment is recorded. The plan does not require blocking scheduling before payment.

### 2.5 Warehouse Serialization & Dispatch
- Warehouse reviews the project parts list against available inventory.
- **Mandatory Serialization:** Every inverter, battery, and charge controller must have a unique serial number captured via scanner input before dispatch.
- **Dispatch Gate:** Dispatch is blocked if any required serial number is missing, invalid, already assigned to another project, or not in stock.
- Serial numbers are linked to the customer and project upon dispatch.

### 2.6 Delivery & Warranty Clock Activation
- Delivery is recorded as an explicit action separate from warehouse dispatch.
- Delivery cannot be recorded prior to dispatch or with a date earlier than dispatch.
- **Automated Warranty Clock:** Recording delivery automatically initializes warranty records for all delivered serialized components:
  - Default demo policy: 2 years for inverters and batteries, 20 years for panels.
  - Warranty starts on the recorded delivery date without manual register entry.
  - Warranty calculation convention: deterministic half-open interval `[deliveryDate, deliveryDate + policyYears)` in `Asia/Kolkata`.

### 2.7 Field Installation & Evidence Capture
- Technicians access assigned jobs via a mobile/tablet-friendly interface.
- Required inputs to complete an installation:
  - Start and finish timestamps (finish timestamp must be equal to or later than start timestamp).
  - Confirmed system size (kW).
  - Passing generation test result (mandatory verification that power is being produced).
  - Completed roof photo upload.
  - On-screen homeowner signature (blank signatures rejected).
- Evidence must be securely saved before completion status is recorded.

### 2.8 Service Tickets & Customer Confirmation
- Support locates customer and equipment by serial number to review warranty status.
- **Charge Calculation:**
  - In-warranty repair: Customer charge is ₹0.
  - Out-of-warranty repair: Billed automatically based on recorded parts and labour rates.
  - Unclear/review-required: Escalated without automatic charge generation.
- **Customer Confirmation Gate:** A service ticket cannot be closed solely by technician assertion. The ticket remains in `AWAITING_CUSTOMER` until explicit customer confirmation is recorded.

### 2.9 Director Overview & Financial Conventions
- Overview displays live operational queues and period summaries for Today, This Week, and This Month.
- **Interval Boundary:** Uses half-open calendar intervals `[start, next period start)` in `Asia/Kolkata`.
- **Financial Metric Integrity:**
  - Currency is stored and calculated in **integer paise** (1 INR = 100 paise) to avoid floating-point rounding errors.
  - Separate metrics: **Receipts** (recorded payments) vs. **Project Value** (agreed quotes) vs. **Direct Margin** (project revenue minus recorded direct material/labour costs).
  - Missing cost information is prominently flagged; unrecorded costs are never treated as ₹0 profit.

---

## 3. Shared API & Contract Specification

All route handlers adhere to a standardized JSON response envelope.

### 3.1 Response Format

**Success Envelope (`HTTP 200 / 201`):**
```json
{
  "data": { ... }
}
```

**Error Envelope (`HTTP 400 / 401 / 403 / 404 / 409 / 500`):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
    "message": "Human-readable explanation of error",
    "fields": {
      "fieldName": ["Field-specific error description"]
    }
  }
}
```

### 3.2 HTTP Status Conventions
- `200 OK`: Successful read or update.
- `201 Created`: Resource created successfully.
- `400 Bad Request`: Input validation failed (Zod schema rejection).
- `401 Unauthorized`: Missing or invalid staff session.
- `403 Forbidden`: Authenticated user lacks permission for action.
- `404 Not Found`: Resource does not exist.
- `409 Conflict`: Business rule violation (e.g., dispatch without serials, quote without approved survey, duplicate order confirmation).
- `500 Internal Server Error`: Unexpected server exception.

---

## 4. Current Scaffold State & Next Steps

- **Implemented:** Root Next.js structure, `/api/health`, Drizzle configuration and initial migration, SQLite local database file connection, and initial Vitest/Playwright harnesses.
- **Pending Implementation:** Remaining domain entities and their migrations, staff authentication and authorization, protected file handling, and domain route handlers. An initial Enquiry table and migration exist but no enquiry API or UI exists yet.
- **Boundaries:** No third-party gateway integrations, external government subsidy APIs, or certified accounting ledgers are in scope. All demo data must be synthetic.
