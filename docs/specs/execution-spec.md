# Solar Installation Management System — Proposed Hackathon Execution Spec

## Status

- **Version:** 1.1 proposed plan; Drizzle replaces the originally proposed Prisma stack. This is not a claim that the full product has been built.
- **Chosen challenge:** Solar Installation Management System.
- **Agreed priority:** A complete customer-to-service journey with an operational company dashboard first.
- **Team:** Three builders and one person dedicated to testing and breaking the product.
- **Timebox:** 24 hours. Milestones and responsibilities below are proposals, not assignments accepted by the team.
- **Companion:** `Solar_Installation_Management_System_SPEC.md` describes the complete product and source requirements. This document proposes what to implement first and how to verify it. It does **not** replace the original challenge or represent deferred requirements as optional in that challenge.
- **Source of truth:** The supplied solar PDF and event description; this plan adds explicitly identified demo choices where the brief leaves details open.

## Problem Statement

SunPower Solutions needs a single system connecting enquiries, site surveys, quotes, inventory, installation, warranties, service and business management. The current work passes through disconnected messages, paper and phones, leaving employees without a dependable work queue and management without trustworthy job information.

The proposed hackathon product is a responsive application with a customer enquiry entry point and a company workspace. **The company workspace is how the business operates**, not just a collection of charts. Each department sees actionable work, while the director's overview is derived from that same underlying data.

## Success Criteria

The proposed submission is ready to demo when all of the following are demonstrated on the actual build:

1. A new enquiry, entered through the public form, is persisted and appears in the sales work queue.
2. Staff can record and approve its survey, generate a template-based quote/parts list, confirm the order and record a payment.
3. Confirmation makes the same order visible to both warehouse and installation staff without a manual handoff outside the app.
4. Warehouse can scan required serials, record dispatch and delivery, and inspect warranties derived from the delivery date.
5. The crew can record installation times, system capacity, generation-test result, a roof photo and the customer's on-screen signature against that project.
6. Support can find that customer's equipment, assess warranty, record service work and the applicable charge, and keep a ticket open until customer confirmation.
7. A director can inspect real queue counts, unfinished work, open repairs, receipts and project financial information derived from persisted records.
8. The app runs through the journey again after a restart; validation and negative scenarios are checked; the event's UI, dynamic-data and team Git requirements are met.

The above is an ambitious target, not a guarantee of completion. If a step is incomplete, say so in the demo rather than replacing it with a hardcoded screen.

## Scope

### In Scope — Proposed P0 Demonstrable Journey

P0 features form one connected flow. The codes map to user stories and tests below.

- **P0-01 Enquiry and sales:** Public form, saved enquiry, company sales list/detail, basic follow-up and qualification fields.
- **P0-02 Survey:** Site measurements/findings, survey approval/rejection and a server-enforced approval gate before a customer quote can be sent. This proposal also gates generation for simplicity; it is a stricter demo choice than the brief's sending requirement.
- **P0-03 Quote and bill of materials:** At least one clearly labeled synthetic 3 kW on-grid template that creates a quote and an itemized parts snapshot covering the brief's panels, inverter, stands, switches, wires and safety parts; preserve the agreed price/parts on the project. The architecture must permit more templates. Example part quantities and prices are demo fixtures, not engineering guidance.
- **P0-04 Order and payment record:** Record the customer's acceptance, confirm the order, record an advance or full payment, and block installation start until a positive payment is recorded. The brief does not specify a minimum advance; accepting any positive advance is a **demo assumption**, not a business policy.
- **P0-05 Warehouse and delivery:** Persistent project parts list and packing queue, inventory record/availability for demo items, scanner-based serial capture for inverters, batteries and charge controllers when present, blocked dispatch for missing required serials, distinct dispatch/delivery actions, and delivery-linked warranty records.
- **P0-06 Installation:** Job queue with schedule/assignment fields, mobile-friendly work form, start/finish times, capacity, generation-test result, roof image upload and a non-blank drawn signature retained with the job.
- **P0-07 Support:** Customer/equipment search, fault ticket, warranty status, parts/labour entry, coverage-dependent customer charge and customer-confirmed closure.
- **P0-08 Company dashboard:** Work queues and detail actions for sales, projects/installations, warehouse and service; staff can record actual direct material and labour costs against a project; manager view has today/week/month filters, direct-cost information, receipts and open/unfinished work. Operational data is persisted and shared between views.
- **P0-09 Foundation:** Staff sign-in and server-side authorization, responsive navigation, server-side validation, persistent local database and file storage, repeatable test/demo fixtures, basic tests and multi-person Git work.

**P0 is still aggressive for 24 hours.** The later timeline includes checkpoints and a cut order. A judge-facing claim must be limited to what the team actually verifies, even if that means the final submission covers less than this target.

### In Scope — P1 If the P0 Journey Works

- More verified package templates covering the brief's other 1–5 kW on-grid/off-grid combinations, the hardware-only panel set and installation service.
- Additional inventory purchasing/adjustment workflows and richer stock alerts.
- More capable technician scheduling, richer follow-up, subsidy-paperwork tracking, and sharing/export of director reports.
- Fuller invoicing, technician pay administration and additional financial reports, provided their rules are defined and backed by real records.
- Usability improvements and broader device/browser coverage.

These are **requirements or useful extensions from the larger brief that are not guaranteed in the P0 slice**. If deferred, list them as gaps in the final presentation.

### Out of Scope for This 24-Hour Proposal

- Real payment processing; P0 **records** payments only.
- Government portal integration or automatic subsidy submission; subsidy tracking itself remains a larger-brief requirement and is P1 here.
- Production-grade tax filing, general-ledger accounting, full payroll and engineering-certified system design; invoices and technician pay remain explicitly incomplete if P1 does not deliver them.
- Automatic real-world WhatsApp/email delivery, native mobile packaging and disconnected-device synchronization.
- Odoo integration or an AI feature unless an organizer confirms it is mandatory or the team explicitly chooses it. The supplied event description does not establish either requirement.

## Roles and Company Workspace

Roles describe responsibility, not necessarily one account per person. The team may combine implementation responsibilities, but access must be checked server-side rather than merely hiding buttons.

- **Sales:** New enquiries, follow-ups, qualification, survey request/review, quote and order/payment details.
- **Survey / installation:** Assigned surveys and installation jobs; measurements, approval when authorized, scheduling, work evidence and signature.
- **Warehouse:** Project bill of materials, stock availability, serial capture, dispatch and delivery.
- **Support:** Customer/serial lookup, service tickets, warranty status, parts/labour and confirmation.
- **Director / admin:** Cross-company work and reporting, plus any permissions required to demonstrate management actions.
- **Customer:** Anonymous enquiry submitter; customer supplies installation signature and service confirmation through an explicitly recorded assisted interaction in the P0 demo. A separate customer login/portal is not assumed.

### Proposed Navigation

**Public:** Enquiry form.

**Company:** Overview · Enquiries · Surveys · Projects / Installations · Warehouse · Service. Each list opens its actual record and relevant actions. Use a clear responsive sidebar or equivalent on desktop, with compact navigation on mobile. A separate dashboard per department is not required if filtered views and work queues perform the job.

### Director Overview — Working Definitions

- **Period:** Use the company timezone `Asia/Kolkata` as a demo setting. “Today” is the current local calendar day; “this week” begins Monday; “this month” begins on the first. Use half-open ranges `[start, next period start)` to avoid double-counting at boundaries.
- **Enquiries and activity:** New enquiries created during the selected period. Show total currently open/unfinished projects and open service tickets as clearly labeled **current snapshots**, not as if they were period flows.
- **Receipts:** Sum recorded payments by payment date in the selected period. A payment is not profit and an unpaid quote is not a receipt.
- **Project financials:** Show the confirmed project value and sum of recorded direct material and labour costs associated with that project; label their difference **recorded direct margin**, not audited/net profit. Indicate when expected material, labour or other costs are not recorded; do not treat unknown costs as confirmed zero. For the full product, actual accounting/profit rules require a business decision.
- **Other obligations:** Show amounts owed only for charges or invoices actually recorded. Do not imply the system covers all company liabilities if it does not.
- **Drill-down:** Each operational count opens the relevant list; project values link to the underlying order, payment and cost records. Empty state is zero or “no data,” never invented values.

## End-to-End Workflow and State Rules

The following are concrete **demo defaults** where the source leaves implementation details open. Dates, prices, package items, serials and customers used to demonstrate them must be synthetic.

1. **Enquiry:** Customer submits name, phone, address, preferred system type/capacity, subsidy interest and optional notes. Validate required fields on the server. Sales opens the saved record and enters basic qualification, including shadow-free roof area, monthly bill and grid suitability.
2. **Survey:** Staff record roof direction, tilt, cable distance and site notes. An authorized reviewer approves or rejects it. Rejected/unapproved surveys cannot generate or send a customer quote in this demo.
3. **Quote:** Select the synthetic package template; produce quote lines and required parts. Persist a project-specific snapshot so later template edits do not rewrite the agreed quote. The app can show a quote and record its status; an external send must be described as manual unless a real delivery channel is implemented and verified.
4. **Order and payment:** Record customer acceptance and confirm the quote. Confirmation creates one order/project, one packing work item and one installation job together. Recording a payment creates a separate payment record; work cannot start with a zero or missing payment under the proposed demo rule. Confirming the same quote twice must not duplicate work.
5. **Preparation and dispatch:** Warehouse opens the project's parts, verifies available demo inventory and uses a real scanner input for each required unique serial. Validate that each serialized unit is available, belongs to the expected product, is not duplicated and is not allocated to another project. Dispatch fails if any required serial is missing. Record inventory movement/assignment atomically with dispatch.
6. **Delivery and warranty:** Recording delivery is a separate action and transaction. Reject delivery before dispatch or with a delivery date earlier than dispatch. For each delivered serialized unit with a product warranty policy, create one warranty linked to the customer and project with the delivery date as start. The example 2-year inverter/battery and 20-year panel policies are configurable demo examples, not promises for real equipment. The brief does not establish individual panel serialization; use an explicitly labeled serialized sample panel if needed for the demo and keep the general panel warranty identity rule open.
7. **Install:** After delivery and a recorded positive payment, crew opens the job, records schedule/assignee, start/finish, capacity, a generation-test result, photo and customer signature. The brief calls for testing that power is generated; reject completion when the test has not passed, rather than merely displaying a checkbox. Save evidence before reporting completion; finish must not precede start, and a blank signature is invalid. Keep uploaded evidence retrievable only for authorized staff.
8. **Service:** Support locates the customer and exact serial, creates a ticket, sees warranty as of the ticket date, records parts and labour, and records work complete. Under the brief's rule, a covered repair produces a customer charge of ₹0; an out-of-warranty repair produces a charge from recorded parts and labour. If policy or delivery date is missing, label coverage **review required** and do not automatically claim either status or amount. Out-of-warranty line prices are explicit demo inputs, not sourced real prices.
9. **Customer confirms:** When work is marked ready, set the ticket to `AWAITING_CUSTOMER`. A staff user can record the customer's explicit confirmation, method and time following an actual assisted interaction; only then can the ticket be closed. Do not represent an unchecked staff assertion as an automatic customer message or external confirmation.
10. **Management:** Queues, current snapshots and selected-period receipts update from persisted records. Project direct margin reflects recorded material/labour cost entries and clearly flags incomplete data.

### Warranty Date Convention for the Demo

Use date-only values in the business timezone. The warranty is active from delivery date inclusive to the policy end date **exclusive**; the end date is calculated by adding the policy duration in calendar years. If adding years to February 29 results in a non-leap year, use February 28 as the end date. Display the rule and date clearly. This is a **proposed deterministic demo policy**, not a statement of SunPower's legal warranty terms. Test the start and end boundaries. Historical/expired equipment may be introduced as a clearly labeled synthetic fixture to exercise the out-of-warranty branch; do not alter the actual system clock or imply the fixture is a real customer.

### Service Charge Convention for the Demo

A support user records parts quantities/unit charge prices and labour hours/rate. When work is marked ready for customer confirmation, calculate the charge using those saved line items: covered = ₹0; out-of-warranty = parts charges plus labour charges; review-required = no automatic charge. Save a charge record once and prevent retries from duplicating it. This is an operational service charge, **not a claim of an integrated payment gateway or tax-compliant invoice**. Keep charge prices distinct from the company's internal material/labour cost entries used in project financials.

## Proposed Architecture and Local Setup

### Stack

- **Single application:** Next.js App Router + TypeScript, using a responsive React UI and server route handlers in one repository. Avoid a separate frontend/backend deployment for the first slice.
- **Database:** SQLite stored on the demo host, accessed through Drizzle ORM and the `better-sqlite3` driver. Use migrations and seeded synthetic package/fixture data; do not keep live business records solely in static JSON.
- **Validation:** Shared TypeScript request schemas with Zod, applied on the server. Client-side validation improves feedback but is not the security boundary.
- **Files:** Store uploaded demo photos and signatures in a private local directory outside the public static assets; persist references in the database and serve access through authenticated, authorized routes. Validate file type and size. Do not commit uploads, database files, secrets or real customer data to Git.
- **Testing:** Unit/integration tests for business rules and persistence, plus Playwright for browser-based flow/validation tests where available. The dedicated tester also conducts manual exploratory and phone-width tests.
- **Package manager:** pnpm; commit the lockfile and agree on one compatible Node LTS and dependency versions at kickoff.

**Why:** One TypeScript codebase reduces integration surfaces, and local SQLite avoids requiring a cloud database for the demo. It does not make this a production architecture, guarantee that teammates' machines are configured, or provide offline synchronization.

### Setup Proof at Kickoff

On the actual demo host, within the first two hours: install dependencies from the committed lockfile; initialize and migrate a local database; seed clearly labeled fixtures; start the app; submit a request; reload after a restart and verify the record persists. Have a second builder and the tester pull/setup as early as possible. Confirm the actual Node/pnpm versions and record exact setup commands in the repository README after they work. The `better-sqlite3` driver is native; explicitly resolve pnpm build-approval and Windows/native build problems early. If it blocks the timebox, choose a proven alternative together and change this plan/contract rather than quietly faking persistence.

### Deployment and Connectivity

- Demo defaults to a single local host running the application, SQLite and the upload directory. Internet is not required **after** dependencies, local assets, browser and fixtures are available, provided no unverified external service is added.
- Other devices require a working local connection to that host and suitable firewall/network settings. A phone disconnected from the host cannot use the app offline; do not claim otherwise.
- A camera-based scanner generally needs a secure browser context; an ordinary `http://` LAN address may not provide one. Use a real USB/Bluetooth barcode scanner acting as a keyboard with synthetic labels if available, or a verified HTTPS setup for camera scanning. Typed serial entry is a useful fallback but **does not satisfy the brief's scan requirement** and must be disclosed as a gap if scanning is not demonstrated.
- Do not expose an unauthenticated demo to the public internet, store actual customer information, or assume a network or scanner will be available at the event. Test the intended setup early.

### Access and Privacy Baseline

Public users can submit enquiries; company reads and mutations require a signed-in staff session. Enforce role/permission checks on the server for every company endpoint and file download; public clients cannot read customer data or modify operational records. Use secure password hashing, HTTP-only session cookies, appropriate cookie/CSRF protections, and non-committed secrets. Account creation/reset and granular enterprise administration are out of scope. A local demo login is not production-ready identity/security. Use synthetic customer details and consent-free dummy signatures/photos only.

## Data Model and Integration Contract

This section establishes a common minimum vocabulary and cross-module contract. Exact request/response schemas and owned files should be committed together before independent UI/backend work diverges.

### Core Records

- `Enquiry`: id, customer contact/site details, system request, qualification, status, follow-up, timestamps.
- `Survey`: enquiry/project link, roof measurements and notes, review status, reviewer/time.
- `PackageTemplate` and lines: system type/capacity, configurable price, material items/quantities, warranty policy references; fixture data explicitly marked synthetic.
- `Quote` and snapshot lines: enquiry/survey link, package, itemized parts, total, status and acceptance.
- `Project` / `Order`: one accepted quote, customer/site, status, payment summary, schedule and assignee.
- `Payment`: project, positive amount, method, date and reference; recording is not gateway processing.
- `InventoryItem` / `StockMovement` / `EquipmentUnit`: product, quantity or unique serial, availability, assigned project, movement history.
- `Dispatch` / `Delivery` / `Warranty`: project, units, event dates, policy snapshot, customer/project linkage and warranty dates.
- `InstallationJob`: project, schedule/assignee, timestamps, system size, generation-test result, private evidence references and customer signature.
- `ServiceTicket` / `ServiceLine` / `ServiceCharge`: customer/project/equipment, complaint, warranty decision, status, priced parts/labour, calculated charge and customer-confirmation record.
- `ProjectCost`: project, direct material or labour cost and date, plus whether expected inputs are complete; customer service charge and internal cost are distinct values.
- `StaffUser` / session: identity and capabilities for server-side authorization.

Use stable IDs, foreign keys and uniqueness for serial numbers and one-time business actions. Store currency in **integer paise**, not floating-point rupees. Use transactions for confirmation + work creation, dispatch + assignment, and delivery + warranty creation. Repeated requests must not create duplicate orders, assignments, warranties or service charges; use persisted idempotency/unique constraints and test concurrent attempts. Reject invalid transitions on the server.

### UI / API Agreement

- Responses for successful requests use `{ "data": ... }`; expected errors use `{ "error": { "code": "...", "message": "...", "fields": { ... } } }`. Use `fields` for validation errors; omit it when not applicable.
- Suggested status codes: `200` success, `201` created, `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` absent, `409` invalid transition / duplicate conflict, `500` unexpected error. Do not expose raw server errors or secrets.
- **Enquiry:** Create public enquiry; list/read for authorized sales staff; update qualification/follow-up.
- **Survey and quote:** Record/approve survey; create/read quote and immutable line snapshot; explicitly record quote acceptance or manual sending status.
- **Order/project:** Confirm accepted quote; record/list payments; list/read project and installation work; schedule/assign job.
- **Warehouse:** List packing work and inventory; capture/validate serialized units; dispatch; record delivery and retrieve warranties.
- **Installation:** Read/update job and upload/download protected photo/signature evidence.
- **Service:** Search customer/equipment; create/update ticket and lines; calculate applicable charge; record real customer confirmation/close.
- **Dashboard:** Fetch selected-period measures and linked current-state queues from the same database; do not calculate from fixture constants.

At kickoff, the three builders decide exact endpoint paths, request fields, response types, field lengths, allowed values and file size/type limits in a shared contract and commit them. This overview is not a complete API schema; implementation must not silently invent incompatible client/server shapes.

## User Stories and Acceptance Criteria

These are proposed P0 acceptance gates; the **entire set** must be exercised before calling P0 complete.

### Acceptance Criteria

### US-01 — Enquiry reaches company operations

- [AC-01.1] Submit a valid enquiry with a unique synthetic name; the sales queue shows that same saved name and requirements after refresh and server restart.
- [AC-01.2] Submit without a required name, phone or address through the UI and directly to the server; both attempts fail with useful errors and create no enquiry.

### US-02 — Survey and quote integrity

- [AC-02.1] Attempt quote generation for an unapproved survey through UI and server; both are rejected without a quote being created.
- [AC-02.2] Approve that survey and generate the 3 kW synthetic package quote; its customer, price and itemized parts persist and remain unchanged after editing the template.

### US-03 — One order, two company work queues

- [AC-03.1] Accept and confirm the quote once; the same project ID and required parts appear in warehouse and the installation job appears in its queue without a second manual task creation.
- [AC-03.2] Repeat or concurrently request confirmation; at most one project/packing item/installation job exists. Starting installation before a positive payment is recorded is rejected.

### US-04 — Serialized dispatch and delivery-based warranty

- [AC-04.1] With a required inverter serial missing, dispatch is rejected; a scanner-captured valid serial for the correct available item permits dispatch and links it to the project. A duplicate/previously assigned serial is rejected.
- [AC-04.2] Before delivery, no delivery-started warranty is shown; delivery before dispatch or dated earlier than dispatch is rejected. On delivery, each delivered serialized unit with a policy gets one customer/project-linked warranty starting on the recorded delivery date; repeating delivery does not duplicate it.
- [AC-04.3] Warranty status follows the stated start-inclusive/end-exclusive date convention on boundary dates; missing policy or delivery date produces review-required, not a false coverage claim.

### US-05 — Installation proof

- [AC-05.1] After delivery and payment, save an installation with valid start/finish, capacity, a recorded passing generation test, a synthetic roof photo and drawn signature. Reload the project and retrieve both evidence files as an authorized user.
- [AC-05.2] Reject finish-before-start, a missing/failed generation test, missing required evidence, a blank signature and unauthorized evidence downloads; failed upload must not be presented as a completed installation.

### US-06 — Service and customer confirmation

- [AC-06.1] Search by the saved customer or inverter serial; the ticket references the correct customer, equipment and warranty. A covered repair yields a ₹0 customer charge.
- [AC-06.2] For clearly labeled synthetic expired equipment, saved chargeable parts and labour produce one correctly calculated out-of-warranty service charge; retry does not create another.
- [AC-06.3] A ticket cannot close before explicit customer confirmation is recorded; after confirmation, it closes and no longer appears among current open tickets.

### US-07 — Director and event readiness

- [AC-07.1] Record a payment and project direct costs, refresh the overview and project detail, and verify the figures against the underlying records. Clearly flag missing expected costs and distinguish payment receipts from recorded direct margin.
- [AC-07.2] Check today/week/month boundaries in `Asia/Kolkata`; current open-work snapshots are labeled separately from selected-period totals, and counts drill into matching records.
- [AC-07.3] Test the real public enquiry, company navigation and installation form at desktop, tablet and phone widths; show meaningful validation, and verify Git history includes contributions by more than one team member.

## Team Ownership and Integration

Ownership is a starting point, not a restriction on helping another person. No person's preferred technology or exact strength has been assumed.

### Builder A — Shared Foundation and Business Data

- Own initial project skeleton, database/migrations, validation, staff sessions, core domain services and shared API contracts.
- Implement the foundational enquiry/survey/quote/order/payment data path and transactional confirmation with help where needed.
- Publish schema/contract changes early and coordinate with both other builders. Do not become the only person capable of integration.

### Builder B — Company Workspace and Sales/Management UI

- Own common responsive shell/navigation, enquiry entry, sales/survey/quote screens, project details and director overview.
- Connect to real APIs as soon as contracts exist; use temporary local fixtures only while the backend is being built and remove them from completed screens.
- Pair with Builder A on data shapes; support integration instead of building isolated dashboards.

### Builder C — Warehouse, Field and Support

- Own warehouse scanning/dispatch/delivery UI and integration; installation evidence form; equipment lookup and service ticket screens.
- Pair with Builder A on serialized inventory, warranty, upload and service APIs; help implement those server operations where the critical path requires it.
- Validate the scanner and phone/tablet setup early. If no scanner is available, immediately raise the requirement gap.

### Tester — Dedicated to Breaking the Product

- Set up a separate test environment and synthetic data; write an acceptance matrix with actual pass/fail/blocked evidence and reproduction steps.
- Begin testing as soon as the skeleton and first route exist; continuously test changes rather than waiting for a final handoff.
- Attack server-side validation, access, state transitions, duplicate/concurrent actions, warranty boundaries, calculations, data persistence and uploads. Check responsive navigation on real/representative devices.
- Run the full judge journey on the integrated build; own the final blocker list and demo rehearsal. The tester can commit test scripts and reports under their own Git identity.

### Shared Git and Integration Rules

- All three builders commit their own work; the tester can commit tests or test documentation. The event explicitly requires more than one contributor.
- Agree shared contracts and ownership before work branches diverge. Keep branches short, make small reviewable commits and integrate early; avoid everyone editing the same schema/layout simultaneously without coordination.
- The shared `main` branch should stay demoable. Before integration, check the working tree, diff, base revision and affected shared contracts; do not overwrite another person's work. Run the agreed verification checks after each integration.
- Never commit private credentials, database files, customer data or uploads. Record exact setup and test commands once they have been exercised. No pushes or account changes are authorized merely by this planning document.

## 24-Hour Proposed Schedule

Hours are relative to the official start. Each checkpoint is an observable gate, not an assumption that the team will finish by that time. Allow breaks and reassign help to the critical path.

### Hours 0–2 — Alignment and Foundation

- All: agree P0, source ambiguities, synthetic data, API contract outline, environments, ownership and demo hardware.
- A: bootstrap the app, schema/migrations, session skeleton and a persisted enquiry route.
- B: build the responsive shell and public/sales flow against the agreed contract.
- C: prototype actual scanner input and photo/signature handling on intended devices; pair on schema for inventory.
- Tester: start the test matrix, verify independent setup and attempt invalid enquiry submissions.
- **Gate:** A fresh setup can save and reload an enquiry; scanner/network risks have an owner and a fallback disclosure.

### Hours 2–6 — Sales-to-Order Core

- A: survey review gate, package/quote snapshot, order/payment and transaction boundaries.
- B: enquiry/survey/quote/project screens against working routes; integrate incrementally.
- C: stock/unit model, scanning flow and warehouse queue; pair on required server operations.
- Tester: negative validation, unauthorized access, unapproved quote and repeated confirmation.
- **Gate:** One synthetic customer reaches a confirmed order that appears in both company work queues.

### Hours 6–11 — Dispatch, Delivery and Installation

- A + C: transactional dispatch, delivery and warranty creation; protected photo/signature storage; installation actions.
- B: warehouse/project integration and first dashboard backed by live records; assist whichever path blocks the journey.
- Tester: missing/duplicate serials, scanner input, delivery vs dispatch, warranty boundaries and evidence retrieval.
- **Gate:** The same order is dispatched, delivered and completed with retrievable installation proof.

### Hours 11–15 — Service and Financial Views

- C + A: customer/serial lookup, warranty decision, ticket transitions, service charge and confirmation gate.
- B: connect operational queues and director figures to actual records; add period filters and incomplete-cost labels.
- Tester: covered and expired synthetic cases, automatic charge, double submission, closure without confirmation, calculations.
- **Gate:** A complete synthetic customer-to-service journey is possible on the integrated build.

### Hours 15–19 — Stabilize and Test

- Stop adding P1 features until the complete journey is reliable. Fix tester-reported blockers in priority order.
- Run server-level rule tests and the browser journey; restart the application and repeat. Verify the actual demo environment, scanner, phone/tablet form, backups and synthetic fixtures.
- Check that the director can open the records behind the displayed figures and that missing features are accurately disclosed.

### Hours 19–22 — Contingency and Selective P1

- If P0 or event must-haves are failing, continue fixing them. Only if P0 passes should the team add a P1 feature that can be implemented, integrated and tested within the remaining time.
- Prefer completing a meaningful reporting/export, subsidy status or additional package capability over cosmetic expansion, subject to actual team progress.
- Freeze contracts and schema when safe; avoid risky late changes that threaten the demo.

### Hours 22–24 — Release and Rehearsal

- Tester runs the final acceptance matrix on the exact commit/build to be demonstrated; record pass/fail/blocked and unresolved issues.
- Team rehearses the real live journey on the intended machine/device and verifies local assets/network/scanner. Maintain a clearly labeled fallback fixture and, if useful, a recording of a previously working run—never present a recording as live execution.
- Prepare submission materials based only on verified features, note full-brief gaps and check organizer instructions/email.

### Cut Order If Behind

First drop decorative effects, advanced charts, animations, secondary filters and extra templates. Next defer report exports, expanded purchasing, subsidy workflows and fuller accounting/payroll, clearly identifying them as brief gaps. Preserve event must-haves, persistence, the honest customer-to-service core, server-enforced critical rules and a usable company workspace. If the P0 journey itself cannot be completed, shrink it transparently and present only working capabilities; do not fabricate scanning, emails, financial totals, warranty decisions or customer confirmation.

## Test Strategy and Evidence

### Test layers

1. **Domain/integration:** Automated checks against an isolated test database for approval gating, quote snapshots, confirmation atomicity, serial uniqueness, dispatch/delivery order, warranty date math, service charges, closure and period/currency calculations.
2. **API/security:** Anonymous enquiry succeeds; unauthorized staff endpoints/evidence reads fail; invalid input, wrong-role actions, missing prerequisites, missing records, duplicate requests and conflicting writes are rejected.
3. **Browser/end-to-end:** A synthetic customer runs through the real UI; queue entries and dashboard figures change as a result. Use Playwright where available, and supplement with actual manual device checks.
4. **Exploratory:** Tester deliberately skips steps, double-clicks, refreshes, uploads invalid files, tries stale pages and interrupts a save. Verify errors and saved state after restart.
5. **Event/demo:** Check responsive layout/navigation and Git participation; verify actual scanner and local setup. Recording an input value manually is not evidence of scanning.

### Required negative cases

- Empty fields, whitespace-only names, invalid phone/address input, negative/zero payment, unsupported capacity/type and malformed identifiers.
- Unapproved survey; order confirmation retry/concurrency; installation start before positive payment or delivery.
- Wrong-product, missing, duplicated or already allocated serials; repeat dispatch/delivery; no premature warranty.
- Missing warranty policy/date; warranty start/end boundary; covered, expired and review-required cases; retry of charge creation.
- Missing or failed generation test; missing photo, blank signature, invalid file type/size, failed upload, reverse time order and unauthorized evidence download.
- Unconfirmed service closure; missing project costs; date-period boundaries; decimal currency rounding/paise arithmetic; database failure.

### Release evidence

Record each AC's **pass/fail/blocked**, build/commit, test steps and relevant result. Run the actual scripts defined by the project for type checking, lint, tests and production build; do not mark a command green without output. The tester should run the full journey independently from a clean synthetic state. A successful build or static UI snapshot does not establish end-to-end functionality. Use a backup of the demo database **and** uploaded evidence; SQLite WAL/backup handling must be verified for the actual running setup.

### Synthetic fixtures

Keep fixtures clearly labeled and separate from the fresh customer created in the live journey:

- An available inverter and other required serialized units with printable test labels, plus a serial already assigned to another project to exercise the conflict check.
- A customer with a unit delivered 18 months earlier under the example two-year policy, and another with a unit delivered 26 months earlier, to test covered and out-of-warranty service without altering the system clock.
- A project with both material and labour costs recorded, and a project with missing expected costs, to verify that the director view does not mistake missing costs for profit.

Fixtures are test inputs, not proof of performance, actual customer history or real package pricing. The tester also builds a new project through the interface, rather than relying only on prepared records.

## Edge Cases and Integrity

The workflow and test sections define priority failures. Additional rules:

- **Partial writes:** If order confirmation, dispatch or delivery fails partway, the linked records must not appear half-completed. Surface a recoverable error.
- **Corrections:** Do not silently rewrite confirmed prices, delivery dates or assigned serials. Correction/reversal workflows require a policy; if not implemented, disclose the limitation and do not fake reversals.
- **Historical truth:** Warranty uses the policy snapshot applicable to the delivered unit; quote lines use the approved snapshot. Editing the current template must not silently rewrite prior deals.
- **Unclear coverage:** Unknown is not covered, expired or free; send the case for review.
- **Missing financial information:** Show missing costs rather than a misleading full-profit number. Do not count customer service charges as internal costs.
- **Failed persistence:** Do not show a successful save if database or upload storage fails. No unsupported offline claims.
- **Concurrency:** Use database-enforced constraints/transactions for business-critical duplication risks rather than relying on disabled UI buttons.

## Non-Functional Requirements

- **Event compliance:** Dynamic saved data, responsive consistent UI, robust input validation, intuitive navigation and participation in Git by more than one person are mandatory per the supplied event description.
- **Browser widths:** Exercise at representative 360 px phone, 768 px tablet and 1440 px desktop viewports; critical forms and navigation must be usable without horizontal page scrolling. Also test the actual intended devices when available.
- **Security baseline:** Authenticated staff endpoints and protected files enforce server-side authorization; public enquiry cannot enumerate/read company records. Use synthetic data and local-only demo controls.
- **Data integrity:** Currency is integer paise; server validates state transitions; required multi-record changes are transactional; duplicate actions do not duplicate financial or warranty records.
- **Availability:** A disconnected phone is not supported unless explicitly implemented and tested. The offline/local nice-to-have is satisfied only to the extent actually exercised on the demo machine.
- **Accessibility:** Visible labels, keyboard-operable navigation/forms and readable contrast; manually test at least the enquiry and company navigation.
- **Performance:** No production SLO is specified. The tester should record any demo-blocking latency instead of asserting an invented performance target.

## Assumptions & Open Questions

1. **Hardware:** Will there be a USB/Bluetooth scanner, suitable labels and a reliable network at the venue? Without verified real scanning, this explicit requirement remains unmet.
2. **Teams and stack:** The selected stack is Next.js/TypeScript/Drizzle/SQLite. Confirm familiarity and setup on each member's machine.
3. **Policy:** Does any positive advance qualify, who approves surveys, and may internal drafts exist before survey approval? The demo defaults are not production policies.
4. **Packages:** Who can validate 1–5 kW package contents and pricing? Synthetic example components and prices must not be sold as engineered designs.
5. **Panel warranties:** How are non-serialized panels identified, and what product-specific durations and replacement rules apply?
6. **Confirmation:** What constitutes customer confirmation and who may record it? The P0 demo uses an assisted, recorded real interaction rather than claiming an external communication service.
7. **Accounting/payroll/subsidy:** What constitutes recognized revenue, complete project costs, employee pay, tax obligations and subsidy status? These remain larger-brief gaps until specified and implemented.
8. **Event submission:** Are there additional judging criteria, a mandatory Odoo integration, permitted demo-network restrictions or specific submission requirements? The supplied text does not say.

## Revision History and References

- **1.0 proposed:** First concrete execution spec, based on the user's selected customer-to-service-first priority and three-builder/one-tester team. All dates, prices, customers and equipment in a demo must be synthetic.
- **1.1:** User selected Drizzle in place of Prisma; migration and local setup instructions live in the repository README.
- **Overall product brief:** `Solar_Installation_Management_System_SPEC.md` in the same directory.
- **Challenge source:** User-supplied `Solar_Installation_Management_System.pdf`.
- **Hackathon source:** Event description supplied in the conversation; dynamic/real-time data, responsive UI, validation, navigation and multi-member Git are must-haves; backend/local/offline capabilities are nice-to-haves.
- **Technical references to recheck at setup:** Next.js route handlers `https://nextjs.org/docs/app/getting-started/route-handlers`; Next.js installation `https://nextjs.org/docs/app/getting-started/installation`; Drizzle SQLite `https://orm.drizzle.team/docs/get-started/sqlite-new`.
