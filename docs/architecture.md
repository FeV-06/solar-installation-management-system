# System Architecture & Technical Specifications

This document outlines the architecture, architectural boundaries, communication patterns, security controls, and data flow of the **Sol** Solar Installation Management Platform.

---

## 1. High-Level Architectural Topology

Sol implements a modern Clean Architecture pattern with decoupled frontend and backend subsystems:

```
+-----------------------------------------------------------------------------------+
|                                  Client Tier                                      |
|                                                                                   |
|   +------------------------------------+   +----------------------------------+   |
|   |   Customer / Marketing Portal      |   |     Company Staff Workspace      |   |
|   |     (React 19, TypeScript, Vite)   |   |   (React 19, TypeScript, Vite)   |   |
|   |         http://localhost:5173      |   |    http://localhost:5174/staff/  |   |
|   +------------------+-----------------+   +-----------------+----------------+   |
+----------------------|---------------------------------------|--------------------+
                       |                                       |
                       | Cross-Site Form / OTP Auth            | Same-Origin / Proxy / Strict Cookie
                       v                                       v
+-----------------------------------------------------------------------------------+
|                        ASP.NET Core WebAPI Host (.NET 10)                         |
|                               http://localhost:5228                               |
|                                                                                   |
|  [Security Pipeline]                                                              |
|   ├── ClientAddress & RateLimiting (QuoteForm, PasswordChecks)                    |
|   ├── Serilog Request & Diagnostics Logging                                       |
|   ├── SameOriginCheck (Strict CSRF Protection for state mutations)                |
|   ├── CrossSiteCalls (CORS restricted to authorized origins)                      |
|   ├── Dual-Mode Cookie Authentication (Staff: sol-session, Customer: sol-customer)|
|   └── FluentValidation Automatic MVC Validation Pipeline                          |
|                                                                                   |
|  [Controllers Tier]                                                               |
|   ├── AuthController & UsersController (Staff Identity & Admin Account Mgmt)     |
|   ├── CustomerAuthController & CustomerPortalController (Customer Auth & View)   |
|   ├── LeadsController (Public Enquiry Intake & Qualification)                     |
|   ├── CustomersController (Account & Site Directory)                              |
|   ├── InstallationsController & SurveysController (Survey Scheduling & Reports)   |
|   ├── QuotesController (BOM Sizing, Customer Proposals & Packing Verification)    |
|   └── NotificationsController (Outbox Retry & Diagnostics)                        |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                        Application Layer (Application.dll)                        |
|                                                                                   |
|  ├── Core Business Interfaces (ILeadService, ISurveyService, IQuoteService, ...)  |
|  ├── Sizing & Bill of Materials Engine (QuoteTemplateEngine)                      |
|  ├── Transfer Objects (DTOs) & Request Contracts                                  |
|  ├── Domain Error Definitions & RFC 9457 ProblemDetails Mappings                  |
|  └── FluentValidation Validation Rules                                            |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                          Domain Layer (Domain.dll)                                |
|                                                                                   |
|  ├── Core Business Entities (Lead, Customer, Installation, Survey, Quote, ...)    |
|  ├── Enums & State Constants (LeadStatus, SurveyStatus, QuoteStatus, BOMCategory) |
|  ├── India Localization Models (IndiaStates ISO 3166-2:IN, UsTimeZones Kolkata)   |
|  └── Entity Invariants & Transition Guards                                        |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                    Infrastructure Layer (Infrastructure.dll)                      |
|                                                                                   |
|  ├── Entity Framework Core DbContext (AppDbContext with snake_case conventions)   |
|  ├── Repository Implementations (LeadRepo, InstallationRepo, CustomerRepo, ...)   |
|  ├── Transactional Outbox Pattern & Background Dispatching                        |
|  ├── Hangfire Server & OutboxCleanup Recurring Daily Jobs                         |
|  ├── Email Dispatching (Recording simulated latency vs. Gmail OAuth/SMTP)         |
|  └── PBKDF2 / PasswordHasher & Session Token Issuance                             |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                               Persistence Tier                                    |
|                                                                                   |
|                   PostgreSQL 18 Database Engine (sol)                             |
|                             Port: 5433 (127.0.0.1)                                |
+-----------------------------------------------------------------------------------+
```

---

## 2. Layer Responsibilities & Boundaries

### 2.1 Domain Layer (`backend/src/Domain`)
- Holds pure enterprise business logic and entities.
- Zero dependencies on external frameworks, databases, or UI libraries.
- Encapsulates state transition rules:
  - `Lead`: State machine transitions (`New` → `Contacted` → `Converted` / `Disqualified` / `Lost`).
  - `Quote`: Commercial invariants, PM Surya Ghar subsidy formulas, advance payment percentages.
  - `Survey`: Site technical findings, optimistic concurrency tracking (`Version`).
  - `PackingOrder`: Warehouse material checklists and serial number tracking flags.
  - `IndiaStates`: Validation for Indian states and Union Territories according to ISO 3166-2:IN.
  - `UsTimeZones`: Default mapping to `Asia/Kolkata` for all Indian installations.

### 2.2 Application Layer (`backend/src/Application`)
- Defines application business contracts and use cases.
- Orchestrates domain entities via repository interfaces (`ILeadRepo`, `IInstallationRepo`, etc.).
- Houses the `QuoteTemplateEngine`:
  - Dynamically calculates solar system capacity (1 kW – 5 kW) based on monthly electricity bills or shadow-free roof area.
  - Generates comprehensive 9-part Bill of Materials (BOM) with equipment specifications, line-item pricing, and subsidy calculations.
- Request validation via FluentValidation.
- Standardized `Result<T>` pattern for robust error handling without throwing business exceptions.

### 2.3 Infrastructure Layer (`backend/src/Infrastructure`)
- Implements application interfaces against concrete technologies.
- Entity Framework Core with PostgreSQL provider (`Npgsql.EntityFrameworkCore.PostgreSQL`).
- Outbox pattern for reliable message delivery:
  - Database transactions save entity state and `OutboxMessage` atomically.
  - Asynchronous dispatchers process outbox events with retry and backoff logic.
  - Failed messages are quarantined and exposed to administrators via the UI for manual or batch retry.
- Hangfire integration for recurring background maintenance (e.g., daily cleanup of old outbox records).
- Dual email provider support: `Recording` provider for local testing and `Gmail` provider with SMTP/OAuth.

### 2.4 WebAPI Layer (`backend/src/WebAPI`)
- Exposes RESTful HTTP endpoints conforming to RFC 9457 `ProblemDetails`.
- Enforces multi-tier security:
  - `SameOriginCheck`: Blocks CSRF attempts by validating `Origin` / `Referer` headers on mutating requests using session cookies.
  - Scoped CORS: Allows the marketing portal to submit quote requests and manage customer authentication while keeping internal staff routes completely private.
  - Endpoint rate limiting for sensitive operations (`RateLimits.QuoteForm`, `RateLimits.PasswordChecks`).
  - Dual session cookie management with `HttpOnly`, `Secure`, and `Strict`/`Lax` policies.
  - OpenAPI and Scalar documentation mapped automatically in Development.

---

## 3. Frontend Architecture

### 3.1 Customer & Marketing Application (`frontend/marketing`)
- **Technology:** React 19, TypeScript, Vite, TailwindCSS.
- **Port:** `http://localhost:5173`.
- **Primary Roles:**
  - Public marketing pages (`/`, `/how-it-works`, `/questions`, `/about`, `/privacy`).
  - Interactive multi-step solar quote and lead submission form (`/quote`).
  - Passwordless customer authentication via email OTP (`/signin`) or account password.
  - Dynamic Customer Portal (`/portal`):
    - Real-time project stage tracking (Enquiry → Site Survey → Proposal Ready → Material Packing → Installation).
    - Interactive quote review with itemized BOM breakdown and government subsidy transparency.
    - One-click online advance payment simulation (`PAY-YYYYMMDD-XXXXXX`).

### 3.2 Company Staff Workspace (`frontend/staff`)
- **Technology:** React 19, TypeScript, Vite, React Router 7, TanStack Query 5, React Hook Form, Zod.
- **Port:** `http://localhost:5174/staff/` (proxies `/api` calls to WebAPI on `localhost:5228`).
- **Role-Based Workspaces:**
  - **Admin / Sales / Operations:**
    - Leads queue (`/leads`): Filter by status, assign, update notes, convert to full customer installation.
    - Customers directory (`/customers`): Search by name or email, view associated sites.
    - Survey Management (`/surveys`): Schedule field visits, assign technicians, review technical feasibility reports, approve or reject.
    - Installation & Quote Sizing (`/installations/:id`): Auto-generate quotation from approved surveys, customize kW capacity and grid configuration, issue proposals.
    - Warehouse Packing Section: Real-time BOM pick-and-pack checklist, serial number entry for inverters, batteries, and charge controllers.
    - Failed Notifications (`/notifications`): View outbox emails exceeding 24 hours of retries, trigger single or batch retries.
    - Staff Accounts (`/users`): Manage technician and administrative accounts, role assignments, and password resets.
  - **Field Technician Workspace (`/my-work`):**
    - Scoped view showing only jobs assigned to the signed-in technician.
    - Mobile-friendly survey report submission form: shadow-free roof area, monthly bill, roof tilt, direction, and cable distance.

### 3.3 Shared Design System (`frontend/brand`)
- Centralized CSS tokens (`tokens.css`, `components.css`, `app-components.css`).
- High-resolution SVG wordmarks and illustrations.
- Typography: Variable Archivo, Fraunces Italic, and custom monospace fonts (`sol-mono`).

---

## 4. Security & Compliance Architecture

1. **Authentication:**
   - Stateless JWT tokens encapsulated within `HttpOnly`, `Secure` cookies.
   - Staff Cookie: `sol-session` (`SameSite=Strict`, scoped to `/api`).
   - Customer Cookie: `sol-customer-session` (`SameSite=Lax`, scoped to `/api`).
   - Token invalidation support via `SessionsValidFrom` timestamps on user records.
2. **Authorization Policies:**
   - `Policies.Staff`: Requires authenticated staff member.
   - `Policies.Admin`: Requires user with `Admin` role.
   - `Policies.Technician`: Allows `Admin` or assigned `Technician`.
   - `Policies.Customer`: Requires authenticated customer session.
3. **Data Protection:**
   - Password hashing utilizing PBKDF2 with HMAC-SHA256, cryptographically secure random salting, and 100,000 iterations.
   - Address hashing (`Address.BuildHash`) using SHA-256 for deterministic address deduplication.
