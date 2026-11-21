# Sol — Solar Installation Management Platform

[![CI](https://github.com/kingsahil/solar-installation-management-system/actions/workflows/ci.yml/badge.svg)](https://github.com/kingsahil/solar-installation-management-system/actions/workflows/ci.yml)
[![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![React 19](https://img.shields.io/badge/React-19.3-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql)](https://www.postgresql.org/)

**Sol** is a unified, enterprise-grade operations platform for solar engineering and installation businesses. It tracks the complete customer lifecycle from public enquiry intake through technical site surveys, automated engineering bill of materials (BOM), commercial quotations with government subsidy integration, customer portal approval and advance payments, warehouse packing with serial number verification, installation scheduling, and long-term service management.

---

## Architecture & Project Structure

The project is built on Clean Architecture principles, decoupling business domain logic from infrastructure and presentation layers:

```
solar-installation-management-system/
├── backend/                              # .NET 10 Enterprise WebAPI & Core Domain
│   ├── src/
│   │   ├── Domain/                       # Core domain entities, invariants, enums, India localization
│   │   ├── Application/                  # Use cases, DTOs, interfaces, sizing & BOM engine, validators
│   │   ├── Infrastructure/               # EF Core, PostgreSQL 18, Hangfire, Outbox, MailKit, auth
│   │   └── WebAPI/                       # ASP.NET Core controllers, RFC 9457 ProblemDetails, security
│   └── tests/
│       ├── UnitTests/                    # 165+ xUnit v3 domain, validation, and sizing unit tests
│       ├── IntegrationTests/             # Full HTTP API integration tests using Testcontainers & PostgreSQL
│       └── TestUtilities/                # Shared fixtures, factories, and manual clock fakes
├── frontend/
│   ├── marketing/                        # Public customer website, quote request form & Customer Portal
│   ├── staff/                            # Internal staff workspace (Leads, Surveys, Quotations, Warehouse, Users)
│   └── brand/                            # Shared design system, SVG wordmarks, typography, and CSS tokens
├── docs/                                 # In-depth architectural, domain, API, operational & testing docs
│   ├── architecture.md                   # System boundaries, security pipeline, data flows, and topology
│   ├── domain-models.md                  # State machines, entity definitions, auto-BOM and subsidy formulas
│   ├── api-reference.md                  # Complete HTTP REST endpoint catalog with authentication rules
│   ├── operations.md                     # Operational runbook, docker setup, environment vars, background jobs
│   └── testing.md                        # Test methodology, execution commands, and verification matrix
├── docker-compose.yml                    # Local PostgreSQL 18 development database container
└── scripts/                              # Verification and orchestration scripts
```

---

## Key Features & Business Workflows

### 1. Indian Market Localization
- **Currency & Pricing:** All commercial figures calculated in Indian Rupees (INR, ₹).
- **Subsidies:** Built-in central financial assistance formulas under the **PM Surya Ghar: Muft Bijli Yojana** (₹30,000 for 1 kW, ₹60,000 for 2 kW, capped at ₹78,000 for 3 kW+).
- **Geography:** State and Union Territory validation conforming to **ISO 3166-2:IN** (`IndiaStates.cs`).
- **Time Zone:** System time operations configured for `Asia/Kolkata` (IST, UTC+05:30).
- **Consumption Slabs:** Tailored residential electricity bill slabs (under ₹1,500, ₹1,500–₹3,000, ₹3,000–₹6,000, etc.).

### 2. Gated Site Survey & Auto-BOM Quotation Engine
- **Survey Feasibility:** Field technicians capture shadow-free roof area, roof tilt, orientation, cable distance, and grid suitability.
- **Strict Gating:** Quotation generation is strictly blocked until an assigned technician submits the site report and an administrator explicitly **Approves** it.
- **Automated 9-Part BOM:** The template engine dynamically sizes the system (1–5 kW) and generates an itemized BOM:
  1. High-Efficiency Half-Cut Mono-PERC Solar Panels (550W modules).
  2. Grid-Tie or Pure Sine Wave Hybrid Inverters with MPPT telemetry.
  3. LiFePO4 Lithium Battery Storage & 48V Charge Controllers (Off-Grid).
  4. Hot-Dip Galvanized Elevated Module Mounting Structures (150 km/h wind rated).
  5. UV-Resistant DC and Armoured AC Cabling based on site survey distance.
  6. DC Combiner Box (AJB/DCDB) with 1000V DC Type 2 Surge Protection Device.
  7. AC Distribution Box (ACDB) with Class II AC SPD and RCCB isolation.
  8. Dual Chemical Earthing Pits with copper-bonded electrodes & Lightning Arrester.
  9. Turnkey Engineering, testing, net-metering liaison, and DISCOM signoff.

### 3. Customer Portal & Self-Service
- **Passwordless Sign-In:** One-time passcode (OTP) email authentication or password-based login.
- **Project Tracking:** Real-time visual progress bar showing stage transitions from initial enquiry to active generation.
- **Commercial Review & Payment:** Interactive breakdown of hardware costs, central subsidy deduction, net payable, and one-click advance payment simulation (`PAY-YYYYMMDD-XXXXXX`).

### 4. Warehouse Fulfillment & Serial Tracking
- **Auto-Packing Order:** Advance payment automatically creates a warehouse fulfillment order.
- **Serialization Enforcement:** Critical equipment (Inverters, Batteries, Charge Controllers) mandates physical serial number capture via barcode/scanner before release.
- **Stage Progression:** Itemized packing checklist transitions orders from `Pending` → `Packed` → `Dispatched`.

### 5. Resilience & Enterprise Security
- **Transactional Outbox:** Background email notifications commit atomically with database transactions, featuring exponential backoff retries and an administrative failure recovery dashboard.
- **Strict CSRF & CORS:** Origin validation middleware (`SameOriginCheck`) prevents cross-site state tampering.
- **HttpOnly Cookies:** Isolated session cookies (`sol-session` for staff with `SameSite=Strict`; `sol-customer-session` for customers).

---

## Local Development Quickstart

### Prerequisites
- Git
- .NET 10.0 SDK
- Node.js 22.13+
- pnpm 11.15+ (`corepack enable && corepack prepare pnpm@11.15.1 --activate`)
- Docker Desktop with Compose V2

---

### Step-by-Step Setup

Open **three separate PowerShell terminals** at the repository root:

#### 1. Database & Environment Preparation
Ensure Docker Desktop is running. Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Populate `.env` with a secure PostgreSQL password, JWT secret, and initial admin credentials. Then start the local PostgreSQL 18 container:
```powershell
docker compose up -d postgres
```

#### 2. Start Backend API (Terminal 1)
Load environment variables into the PowerShell session and start the ASP.NET Core API:
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
- **WebAPI Endpoint:** `http://localhost:5228`
- **Interactive Scalar API Docs:** `http://localhost:5228/scalar/v1`
- **Hangfire Dashboard:** `http://localhost:5228/hangfire`

#### 3. Start Customer / Marketing Site (Terminal 2)
Public website, quote estimation form, and Customer Portal:
```powershell
cd frontend/marketing
pnpm install
pnpm dev
```
- **Customer Portal URL:** `http://localhost:5173`

#### 4. Start Sales & Staff Panel (Terminal 3)
Staff workspace for lead qualification, site survey scheduling, quote approvals, warehouse fulfillment, and user administration:
```powershell
cd frontend/staff
pnpm install
pnpm dev
```
- **Staff Panel URL:** `http://localhost:5174/staff/`
- **Sign In:** Use the `Admin__Email` and `Admin__Password` defined in your `.env`.

---

## Verification & Testing

The platform maintains comprehensive automated test suites across all layers:

```powershell
# 1. Backend Unit Tests (165 tests covering domain, validators, and BOM engine)
dotnet test backend/tests/UnitTests/UnitTests.csproj

# 2. Marketing Frontend Tests (69 Vitest tests)
cd frontend/marketing
pnpm test

# 3. Staff Frontend Tests (149 Vitest tests)
cd frontend/staff
pnpm test

# 4. Production TypeScript Bundling
cd frontend/marketing && pnpm build
cd frontend/staff && pnpm build
```

For complete testing details, refer to [docs/testing.md](file:///c:/users/khanna/projects/odoo/solar-installation-management-system/docs/testing.md).

---

## Documentation Index

- [Architecture & Technical Specifications](file:///c:/users/khanna/projects/odoo/solar-installation-management-system/docs/architecture.md)
- [Domain Models & Workflows](file:///c:/users/khanna/projects/odoo/solar-installation-management-system/docs/domain-models.md)
- [WebAPI Reference & Endpoints](file:///c:/users/khanna/projects/odoo/solar-installation-management-system/docs/api-reference.md)
- [Operations & Deployment Runbook](file:///c:/users/khanna/projects/odoo/solar-installation-management-system/docs/operations.md)
- [Testing Strategy & QA Matrix](file:///c:/users/khanna/projects/odoo/solar-installation-management-system/docs/testing.md)
