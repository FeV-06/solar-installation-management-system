# Testing Strategy & Quality Assurance Matrix

This document defines the testing methodology, automated test suites, execution procedures, and acceptance criteria for the Sol platform.

---

## 1. Testing Philosophy & Architecture

Testing is structured across three complementary layers:

1. **Backend Unit & Domain Tests (`backend/tests/UnitTests`)**
   - Built on xUnit v3 and Microsoft Testing Platform.
   - Verifies domain invariants, boundary date math, password complexity rules, address hashing, quote auto-sizing formulas, and FluentValidation request validators.
   - Total Unit Tests: **165 tests**, 100% passing.
2. **Backend Integration Tests (`backend/tests/IntegrationTests`)**
   - Utilizes `Microsoft.AspNetCore.Mvc.Testing` and `Testcontainers.PostgreSql`.
   - Spins up ephemeral, isolated PostgreSQL 18 database containers in Docker.
   - Exercises end-to-end HTTP pipeline: serialization, routing, authorization policies, database transactions, outbox commits, and concurrent operations.
3. **Frontend Vitest Suites (`frontend/marketing` & `frontend/staff`)**
   - Built on Vitest 5 and Testing Library.
   - Tests form schemas, validation feedback, routing guards, API client contracts, state transitions, and responsive components.
   - Marketing Test Suite: **6 test files, 69 tests**, 100% passing.
   - Staff Test Suite: **20 test files, 149 tests**, 100% passing.

---

## 2. Test Execution Commands

### 2.1 Backend Unit Tests
Execute unit tests directly with .NET CLI:
```powershell
dotnet test backend/tests/UnitTests/UnitTests.csproj
```

### 2.2 Backend Integration Tests
Ensure Docker Desktop is running before executing integration tests:
```powershell
dotnet test backend/tests/IntegrationTests/IntegrationTests.csproj
```

### 2.3 Frontend Test Suites
Run Vitest suites for marketing and staff applications:
```powershell
# Marketing frontend
cd frontend/marketing
pnpm test

# Staff frontend
cd frontend/staff
pnpm test
```

### 2.4 Production Builds & Type Checking
Verify TypeScript compiler compliance and bundle production builds:
```powershell
# Marketing bundle
cd frontend/marketing
pnpm build

# Staff bundle
cd frontend/staff
pnpm build
```

---

## 3. Acceptance Verification Matrix

| Verification ID | Category | Invariant & Scenario | Automated Test Reference | Status |
|---|---|---|---|---|
| **V-01** | Lead Intake | Public quote submission with Indian address, bill slab, and contact details | `CreateLeadRequestValidatorTests`, `LeadsTests` | **PASS** |
| **V-02** | Lead Deduplication | Prevents duplicate open leads for identical email addresses | `LeadsTests.FindOpenIdByEmailAsync` | **PASS** |
| **V-03** | Indian States | Validates Indian states and Union Territories per ISO 3166-2:IN | `UsStatesTests` (aliased to IndiaStates) | **PASS** |
| **V-04** | Survey Gating | Gating rule: Quotation creation strictly rejected until site survey is Approved | `QuoteServiceTests`, `QuotesControllerTests` | **PASS** |
| **V-05** | Auto-BOM Sizing | Calculates kW capacity, 550W panel count, inverters, cabling, and PM Surya Ghar subsidy | `QuoteTemplateEngineTests` | **PASS** |
| **V-06** | Order Packing | Customer payment triggers packing order with serialized items flagged | `QuoteService.AcceptAndPayAsync` | **PASS** |
| **V-07** | Serialization | Inverters, batteries, and charge controllers mandate unique serial capture | `QuotesController.UpdatePackingItem` | **PASS** |
| **V-08** | Customer Auth | Passwordless 6-digit OTP verification and session issuance | `CustomerJourneyTests` | **PASS** |
| **V-09** | Outbox Resilience | Transactional outbox commits with retry mechanism and failed notification queue | `OutboxTests`, `NotificationsTests` | **PASS** |
| **V-10** | Staff Security | Same-origin validation blocks cross-site state tampering on cookie-authenticated routes | `CrossSiteTests`, `SameOriginCheck` | **PASS** |
| **V-11** | Frontend Validation | Form step validation on contact, address, and energy bill steps | `validation.test.ts`, `forms.test.ts` | **PASS** |
| **V-12** | Responsive Layout | Zero-scroll navigation and layout adapting from 360px mobile to desktop | `Shell.tsx`, `tokens.css` | **PASS** |
