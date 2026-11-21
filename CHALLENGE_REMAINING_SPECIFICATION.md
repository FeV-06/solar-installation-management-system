# SunPower Solar Installation Management System: Remaining Challenge Specification & Execution Guide

---

## 1. Executive Status & Progress Map

| Operational Scene | SunPower Challenge Requirement | Status | Verification & Code Artefacts |
| :--- | :--- | :--- | :--- |
| **Scene 1: Rooftop Inquiry & Site Survey** | Public intake, OTP auth, survey scheduling, roof measurements, admin approval. | **COMPLETED** | `SurveysController.cs`, `SurveyService.cs`, `SurveyPage.tsx`, 6/6 Integration Tests. |
| **Scene 2: Getting the Kit Right** | Auto-BOM sizing (1-5 kW), 10 itemized parts, PM Surya Ghar subsidy, 20% advance payment, warehouse packing generation. | **COMPLETED** | `QuoteTemplateEngine.cs`, `QuotesController.cs`, `InstallationsPage.tsx`, `/portal`. |
| **Scene 3: Dispatch Day & Serial Scanning** | High-value hardware serial scanning gate, warehouse dispatch, automated 2-yr & 20-yr warranty clocks, sub-second lookup. | **COMPLETED** | `warranties` table, `POST /api/packing-orders/{id}/dispatch`, `POST /api/packing-orders/{id}/deliver`, `DispatchAndWarrantyTests.cs`. |
| **Scene 4: On the Roof** | Mobile field execution: start/finish times, kW generation test readout, photo evidence, customer digital signature. | **PENDING** | **Phase 1 Target** |
| **Scene 5: Rainy Season Breakdown** | Sub-second warranty check, fault ticket intake, ₹0 covered vs billable logic, customer-confirmed ticket closure. | **PENDING** | **Phase 2 Target** |
| **Scene 6: Director's Month-End** | Job-level unit economics (profit/loss), cash vs receivables, subsidy tracker, technician compensation, exportable reports. | **PENDING** | **Phase 3 Target** |

---

## 2. Detailed Technical Specifications for Remaining Scenes

### Scene 4: On the Roof (Field Installation Execution)

#### Narrative & Business Rules
* "The crew mounts the stands, lays the panels, connects the boxes and finishes the earthing. They test that power is being generated, then open a simple form on their phone or tablet. There they note the start and finish times, confirm the system size, and upload photos of the finished roof. The homeowner signs on the screen to accept the work. The company should have clear proof of the job, and the customer should have no doubt about what was installed."

#### Requirements Breakdown
1. **Technician Mobile View (`/staff/my-work`):**
   - Filter jobs assigned to the authenticated technician where status is `Installation`.
   - Clear project summary: customer address, system capacity, BOM checklist, inverter & battery serial numbers.
2. **Work Time Tracking:**
   - Clock in (`WorkStartedAt`) and clock out (`WorkCompletedAt`) or explicit time entry.
   - Calculates total on-site labor hours for Scene 6 technician pay.
3. **Generation Test & Commissioning Readout:**
   - Measured live power generation readout (actual kW generation, e.g. `2.85 kW` on a 3 kW system).
   - Inverter status check (Normal / Error free).
   - Grid export voltage and net-meter verification flag.
4. **Photo Evidence Capture & Storage:**
   - Upload of at least 3 mandatory field photos:
     1. Solar Panel Array (rooftop modules & mounting structure).
     2. Inverter & Protection Boxes (DCDB / ACDB / wiring).
     3. Net-Meter Connection & Earth Pit.
5. **Homeowner Digital Screen Signature Pad:**
   - Interactive HTML5 Canvas signature pad for customer screen signature.
   - Confirmation text: *"I confirm that the solar system has been installed, tested, and is generating power to my satisfaction."*
   - Stores signature base64 data URL and customer sign-off timestamp.
6. **State Transition:**
   - Transitions `Installation.Status` from `Installation` to `Inspection` (or `Active`).
   - Customer Portal `/portal` immediately reflects installation completion with photo gallery and signed handover certificate.

---

### Scene 5: The Rainy Season Breakdown (Post-Sales Service & Warranty)

#### Narrative & Business Rules
* "Eighteen months later, it is pouring and a customer calls: the inverter is showing a fault code and there is zero power. Support should find the customer and the exact inverter serial number within seconds, and see whether it is still under warranty. If it is, the repair or replacement should cost the customer nothing. If not, the parts and labour should be billed automatically. Either way the complaint should be tracked as a ticket until the customer confirms that everything works."

#### Requirements Breakdown
1. **Sub-Second Customer & Serial Search (`/staff/support` or Header Search):**
   - Instant search input querying `GET /api/warranties/lookup?query=...` (built in Scene 3).
   - Typing customer phone, email, name, or hardware serial instantly displays:
     - Customer name, property address, contact info.
     - Installed equipment and serial numbers.
     - Warranty coverage banner: "Under Warranty (Active - 482 days remaining)" vs. "Warranty Expired (45 days ago)".
2. **Service Breakdown Complaint / Ticket Creation:**
   - Can be initiated via:
     a) **Staff Desk (`POST /api/tickets`):** For phone/WhatsApp customer calls.
     b) **Customer Portal (`/portal` -> "Report Issue"):** Direct homeowner fault intake.
   - Ticket fields:
     - `InstallationId`, `CustomerId`, `AffectedHardwareItem`, `SerialNumber`.
     - `FaultCode` (e.g. `E01 - Grid Fault`, `E04 - Inverter Overheat`, `E08 - Earth Fault`, `E12 - Zero Generation`).
     - `Description` and `CustomerReportedAt`.
3. **Automated Warranty Billing Logic:**
   - When ticket is logged:
     - If hardware `IsCovered == true`:
       - Replacement parts: ₹0
       - Technician diagnostic visit: ₹0
       - Invoice total: ₹0 (labeled *"100% Covered under 2-Year SunPower Warranty"*).
     - If hardware `IsCovered == false`:
       - Replacement parts: Standard BOM rate (e.g. ₹32,000 for 3.3kVA inverter).
       - Technician visit & labour charge: Flat ₹1,500.
       - Generates payable service invoice linked to ticket.
4. **Resolution Gate (Customer Confirmation Invariant):**
   - Technician fixes unit and marks ticket: `Status = ResolvedPendingCustomerConfirmation`.
   - **Hard Rule:** Support / staff cannot close the ticket alone.
   - Homeowner receives notification and confirms on Customer Portal (`/portal`):
     - Click *"Confirm Power Restored & Close Ticket"*.
   - Ticket transitions to `Closed` only after customer confirmation.

---

### Scene 6: The Director's Month-End Financials & Operations Dashboard

#### Narrative & Business Rules
* "The director sits down and asks a simple question: which installations made money, which lost money, and what is still unfinished? Advance payments, stock purchases, technician hours and unfinished steps for customers are scattered across notebooks and phones. There are also invoices to send, government subsidy paperwork to track, and technicians to pay. The director wants to see how the company is doing today, this week and this month, including the profit on each job and the repairs still open, and to share these numbers when needed."

#### Requirements Breakdown
1. **Director Operations View (`/staff/director`):**
   - Timeframe filter controls: **Today**, **This Week**, **This Month**, **All Time**.
2. **Job-Level Unit Economics (True Margin per Installation):**
   - Real accounting equation for each installation:
     $$\text{Job Profit} = \text{Revenue Collected} - \text{BOM Equipment Cost} - \text{Technician Labor Pay}$$
   - Visual indicators:
     - Profitable jobs: Green badge with percentage margin (e.g., +28.4% Net Margin).
     - Loss-making jobs: Red alert badge with cost overrun breakdown.
3. **Cash Flow vs. Receivables Separation (Zero Synthetic Data):**
   - **Cash Collected:** Actual advance payments and balance payments recorded in the database.
   - **Accounts Receivable:** Outstanding balance invoices sent to customers but unpaid.
   - **Government Subsidy Pipeline:** Total subsidy amount claimed vs. disbursed.
4. **PM Surya Ghar Subsidy Paperwork Tracker:**
   - Tracks central subsidy status per installation:
     - `Not Applicable` (Off-grid systems).
     - `Documents Submitted` (National Portal claim submitted).
     - `DISCOM Inspection Cleared` (Local utility net-meter verified).
     - `Subsidy Disbursed` (₹30k / ₹60k / ₹78k credited).
5. **Operational Backlog & Crew Payroll:**
   - Backlog summary: Pending Surveys, Pending Packing, Scheduled Roof Installs, Open Warranty Tickets.
   - Technician hours logged across survey & rooftop installations multiplied by hourly rate = Total Crew Payroll.
6. **Executive Export & Shareable Report:**
   - One-click export button producing a clean, structured financial statement (printable HTML view / CSV data download).

---

## 3. Database Schema Blueprint for Scenes 4, 5 & 6

```sql
-- Scene 4: Rooftop Field Installation Proof
CREATE TABLE installation_proofs (
    id SERIAL PRIMARY KEY,
    installation_id INT NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
    technician_id INT NOT NULL REFERENCES users(id),
    work_started_at TIMESTAMPTZ NOT NULL,
    work_completed_at TIMESTAMPTZ NOT NULL,
    system_capacity_kw NUMERIC(6,2) NOT NULL,
    tested_generation_kw NUMERIC(6,2) NOT NULL,
    grid_connected BOOLEAN NOT NULL DEFAULT TRUE,
    panel_array_photo_url TEXT NOT NULL,
    inverter_photo_url TEXT NOT NULL,
    meter_photo_url TEXT NOT NULL,
    customer_signature_data TEXT NOT NULL,
    signed_by_name VARCHAR(150) NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scene 5: Breakdown & Warranty Service Tickets
CREATE TABLE service_tickets (
    id SERIAL PRIMARY KEY,
    installation_id INT NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    assigned_technician_id INT REFERENCES users(id),
    serial_number VARCHAR(100) NOT NULL,
    hardware_item VARCHAR(255) NOT NULL,
    fault_code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    is_warranty_covered BOOLEAN NOT NULL,
    parts_cost_rupees NUMERIC(12,2) NOT NULL DEFAULT 0,
    labor_cost_rupees NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_billed_rupees NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Open', -- Open, Assigned, InProgress, ResolvedPendingCustomerConfirmation, Closed
    technician_resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    customer_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scene 6: PM Surya Ghar Subsidy Records
CREATE TABLE subsidy_claims (
    id SERIAL PRIMARY KEY,
    installation_id INT UNIQUE NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
    subsidy_amount_rupees NUMERIC(12,2) NOT NULL,
    application_reference VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DocumentsSubmitted', -- DocumentsSubmitted, InspectionCleared, Disbursed, Rejected
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cleared_at TIMESTAMPTZ,
    disbursed_at TIMESTAMPTZ,
    disbursement_reference VARCHAR(100)
);
```

---

## 4. Execution Step-by-Step Instructions

Follow these exact steps to implement the remaining capabilities cleanly:

### Step 1: Execute Scene 4 (Rooftop Field Proof)
1. **Domain & EF Core:**
   - Create `Domain/Entities/InstallationProof.cs`.
   - Add DbSet in `AppDbContext.cs` and configuration in `Infrastructure/Data/Configurations/InstallationProofConfig.cs`.
   - Run `dotnet ef migrations add AddInstallationProof`.
   - Update database: `dotnet ef database update --connection "..."`.
2. **Backend API:**
   - Create `InstallationsController.cs` endpoints:
     - `POST /api/installations/{id}/proof`: Accepts start/finish time, generation kW, 3 photo data URLs, and homeowner digital signature.
     - Transitions installation status to `Inspection` or `Active`.
3. **Frontend Staff (`frontend/staff`):**
   - Create `RooftopFieldProofModal.tsx` or `/staff/my-work` field page.
   - Include signature canvas with clear & save hooks.
   - Add live generation test input and photo uploader.
4. **Customer Portal (`frontend/marketing`):**
   - Show signed rooftop handover certificate and generation readout under `/portal`.

### Step 2: Execute Scene 5 (Rainy Season Breakdown & Warranty Tickets)
1. **Domain & EF Core:**
   - Create `Domain/Entities/ServiceTicket.cs`.
   - Run EF Core migration `AddServiceTickets` and apply to database.
2. **Backend Services & API:**
   - In `ServiceTicketService.cs`:
     - Lookup warranty using existing `Warranty` engine: determine if incident is within 2 years (inverter/battery) or 20 years (panels).
     - Auto-calculate billing (₹0 if covered; parts + ₹1,500 if expired).
     - Endpoint `PUT /api/tickets/{id}/resolve`: Technician marks resolved.
     - Endpoint `PUT /api/customer-portal/tickets/{id}/confirm`: Homeowner confirms power restoration.
3. **Frontend Staff & Support:**
   - Build `/staff/support` quick lookup bar (search by phone, email, S/N) with instant coverage card.
   - Service ticket management view with resolution actions.
4. **Customer Portal:**
   - "Report Fault / Breakdown" form with inverter error codes.
   - "Power Restoration Confirmation" button for open tickets.

### Step 3: Execute Scene 6 (Director's Month-End Financials)
1. **Backend Financial Aggregator:**
   - Create `FinancialService.cs` calculating:
     - Margin per installation: `(PaidAdvance + PaidBalance) - Sum(BOM Costs) - (TechnicianHours * HourlyRate)`.
     - Receivables: `Sum(TotalAmount - AmountPaid)`.
     - Subsidy Pipeline: Grouped by status (`DocumentsSubmitted`, `Cleared`, `Disbursed`).
   - Endpoint: `GET /api/director/overview?period=today|week|month|all`.
2. **Frontend Staff:**
   - Build `DirectorDashboardPage.tsx` under `/staff/director`.
   - Cards: Net Margin %, Cash Collected, Invoiced Receivables, Pending Subsidies, Active Backlog.
   - Table: All jobs with green/red profit margins and breakdown.
   - Shareable Export button generating clean print summary.

---

## 5. Verification Commands

Always run the full verification test suite after each phase:

```bash
# 1. Backend Unit Tests
DOTNET_ROOT=~/.hermes/cache/scratch/solaris-runtime-analysis/dotnet PATH="~/.hermes/cache/scratch/solaris-runtime-analysis/dotnet:$PATH" \
  dotnet run --project backend/tests/UnitTests/UnitTests.csproj

# 2. Backend Integration Tests
DOTNET_ROOT=~/.hermes/cache/scratch/solaris-runtime-analysis/dotnet PATH="~/.hermes/cache/scratch/solaris-runtime-analysis/dotnet:$PATH" \
  dotnet run --project backend/tests/IntegrationTests/IntegrationTests.csproj

# 3. Frontend Marketing Build & Tests
cd frontend/marketing && pnpm test && pnpm build

# 4. Frontend Staff Build & Tests
cd frontend/staff && pnpm test && pnpm build
```
