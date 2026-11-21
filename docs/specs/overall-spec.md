# Solar Installation Management System — Overall Project Specification

## Status

- **Version:** 0.1 — discussion draft
- **Project:** Unified operations platform for SunPower Solutions
- **Purpose:** Describe the complete problem, company and customer workflows, system capabilities, critical rules, and a proposed 24-hour hackathon slice.
- **Decision status:** Solar was selected by the team. Product choices marked *proposed*, implementation details, and the hackathon slice are not yet approved. No functionality is claimed to be implemented.
- **Sources:** The supplied `Solar_Installation_Management_System.pdf` and the hackathon description shared in the conversation. This document distinguishes brief requirements from proposals and open questions.

## Problem Statement

SunPower Solutions is a growing rooftop solar business whose enquiries, quotes, site registers, equipment serial numbers, photos and financial records are scattered across WhatsApp, calls, spreadsheets, paper and phones. Work gets lost between departments, warranty claims are difficult to verify, and the director cannot reliably see unfinished work or which jobs made money.

The company needs one connected platform that follows each customer and installation from the first enquiry through survey, quote, delivery, installation and long-term service. The platform must help staff **do their daily work**, not merely display charts about it.

The brief describes approximately **40 rooftop projects per month** and a team of **15 technicians**. These are scenario details, not results achieved by the proposed software.

## Product Overview

The system has two connected surfaces backed by shared business data:

1. **Customer-facing entry point:** A responsive way for a prospective customer to submit an enquiry. Customer confirmation and signature are collected where the relevant process requires them; the exact customer-facing interfaces remain a design decision.
2. **Company workspace:** A responsive, role-appropriate operational dashboard where sales, survey, warehouse, installation, support and management staff can find work, take action and follow progress. The director also has reporting views derived from the same underlying records.

This is one connected company workspace, not a set of independent applications with separate copies of customer data. A dashboard is both a **work queue** and a **reporting view**: a staff member must be able to open a task and perform the associated action, while management can drill into the records behind the numbers.

### Product outcome

A member of the company can trace an enquiry to its survey, quote, order, materials, delivery, installation evidence, equipment warranties, service tickets and financial records. Each department sees what requires its attention, and management sees the resulting operational and financial picture.

## Success Criteria

The full product succeeds when:

1. Customer enquiries are recorded and visible to the sales team, with follow-up traceable through to the outcome.
2. A quote cannot be sent to the customer before the relevant survey is approved; approved package selections produce a traceable quote and parts list.
3. A confirmed order gives the warehouse a packing task and makes the installation job visible to the crew/scheduling workflow without a separate phone call.
4. The company can trace applicable equipment serial numbers from inventory through delivery to the correct customer; delivery starts applicable warranty records.
5. Installation evidence and later service work remain connected to the same customer and project, including customer acceptance or confirmation where required.
6. The company workspace shows actionable work and management figures derived from saved records, not fixed dashboard values.
7. The event's required responsive UI, input validation, navigation, dynamic data and multi-member Git participation are addressed.

These are product outcomes, not evidence that the current project has achieved them.

## People and Responsibilities

Role names below are a proposed way to organize the brief; one person may perform multiple roles. Exact permissions and account setup are open design decisions.

- **Prospective customer / customer:** Submits an enquiry; receives a quote; pays or records payment through the company process; accepts installation with an on-screen signature; confirms whether a service issue is resolved.
- **Sales:** Reviews incoming enquiries, follows up, qualifies the customer, arranges surveys, prepares/sends eligible quotes, records the customer decision and follows orders.
- **Survey technician / survey reviewer:** Records site findings, measurements and photos where applicable; submits and approves or rejects the survey according to company policy.
- **Warehouse staff:** Maintains inventory, sees required project parts, prepares and scans equipment, and records dispatch and delivery.
- **Installation coordinator / technician:** Sees assigned or scheduled jobs; records work times, installed size, installation photos and customer signature.
- **Support / service technician:** Finds the customer and equipment, checks warranty, manages repair or replacement, records parts/labour and obtains resolution confirmation.
- **Director / manager:** Reviews operational bottlenecks, project status, financial performance, open repairs, technician pay and subsidy paperwork; accesses supporting records and shares relevant reports.
- **Administrator, if needed:** Manages staff access, product/package definitions and business settings. This is a proposed role, not a separate requirement for a particular authentication provider.

## Company Workspace and Dashboard

### What the company actually does there

The dashboard is the company's control centre. Its home screen should show a concise overview and clear entry points to the work behind it. Department views can be organized as tabs, sections or work queues; their final layout is not yet decided.

- **Sales:** Open enquiries, pending callbacks, surveys awaiting action, quote status and accepted/rejected quotes. Actions: open an enquiry, log a follow-up, record qualification, request a survey, prepare/send an eligible quote, and track the customer response.
- **Surveys:** Pending or completed site visits and surveys awaiting review. Actions: open the customer/site, record findings, submit a survey and approve or reject it if authorized.
- **Projects and scheduling:** Confirmed orders, installation progress, unassigned/scheduled jobs and overdue or blocked steps. Actions: open a project, see dependencies, assign or schedule crew, and update the work record. A newly confirmed order must be visible to the installation workflow even if crew assignment is still pending.
- **Warehouse:** Required kits, stock availability, jobs awaiting packing/dispatch and deliveries. Actions: inspect a project's parts list, record or maintain stock, capture required serials, mark dispatch and record delivery.
- **Field work:** A phone/tablet-friendly view of the technician's assigned work. Actions: open job details, record start/finish and installed capacity, add roof photos and collect the customer's on-screen acceptance signature.
- **Service:** Open tickets, customer and equipment lookup, warranty status and items awaiting customer confirmation. Actions: record a complaint, link the exact equipment, document repairs or replacement and costs, create the appropriate charge, and record customer confirmation.
- **Finance and management:** Sales, receipts, costs, project profitability or loss, invoices, outstanding amounts, technician pay, unfinished work and subsidy status. Actions: open underlying records, record/update business data where authorized, filter reporting periods and share relevant reports.

### Director's overview

The owner should be able to select **today, this week or this month** and view:

- Incoming enquiries and their progress, active/unfinished projects and steps needing attention.
- Open service tickets and repairs, including items awaiting customer confirmation.
- Payments received and invoices/outstanding amounts, distinguished from each other.
- Job-level revenue, recorded material and labour costs, and the resulting profit or loss, with missing cost information made visible.
- Inventory-related purchasing information, technician hours/pay and subsidy-paperwork status where recorded.
- A way to share the relevant numbers; the export/share format remains open.

Metrics must come from saved underlying records. A summary item should lead to its relevant list or record rather than being an isolated, unexplained number. Do not present a quote or an advance received as proof of profit. The precise revenue-recognition, accounting and payroll policies remain to be decided; until then, labels and calculations must state what is included and what is missing.

### Example company day

1. Sales opens a new rooftop enquiry, logs a call and sends it to survey.
2. A technician records roof direction, tilt and cable distance; an authorized reviewer approves the survey.
3. Sales generates a package-based quote and sends it to the customer.
4. The company confirms the order and records the customer's advance or full payment. Warehouse and installation work become visible in their respective queues.
5. Warehouse prepares the parts, scans the required units and records dispatch and delivery; warranties start from delivery.
6. The crew opens the job on a phone or tablet, records the installation and collects the customer's signature.
7. Later, support opens a fault ticket, finds the equipment and warranty, and follows the repair through customer confirmation.
8. The director opens the project to see its status and recorded costs, and reviews open work and financial figures for the selected period.

## End-to-End Business Workflow

The following is a conceptual flow. Exact state names and permitted transitions must be agreed before implementation; they are not a claim that a state machine already exists.

### Enquiry and qualification

- Capture the customer's name, phone, address, requirements, desired system and subsidy interest from the online form; enquiries may also arrive by phone or WhatsApp and must be recordable by staff.
- Make the enquiry visible to sales and keep follow-up history and status. A notification mechanism is not specified; the essential outcome is that work is visible and does not disappear.
- Record qualification details including shadow-free roof space, monthly electricity bill and suitability of the grid connection.
- Arrange a site survey when appropriate. Handling of duplicates, unserviceable enquiries and follow-up timing needs a company policy.

### Survey and approval

- Record the site visit and details including roof direction, tilt and cable distance. Attach relevant evidence where available.
- Make the survey available for review and record its approval or rejection.
- Do not send a customer quote until the survey is approved. The brief does not say whether an internal draft may exist earlier; this remains open.

### Packages, quote and parts

- Maintain reusable package templates for **1–5 kW on-grid and off-grid systems**, plus the hardware-only solar panel set and the installation service described in the brief.
- Select a template to generate a quote and its required parts list, rather than relying on staff to remember individual parts. Staff should be able to understand what the quote and list contain.
- The brief describes the panel set as panels, connectors and wires. It describes the on-grid package as inverter, wiring boxes, battery charge controller, panels, safety earthing and metal stands; the off-grid package adds a large battery. These are **the brief's package descriptions**, not verified engineering instructions. Actual bill-of-material quantities, suitability and electrical design require domain validation.
- Record the customer's decision and version or preserve the quote and parts as agreed for that order. Pricing, taxes and permitted customizations need policy decisions.

### Order, payment and preparation

- Record whether the customer has paid an advance or the full amount before work starts, as described by the brief. The minimum advance, payment verification method and exception handling are not specified.
- Once an order is confirmed, create or expose its required packing work to the warehouse and its installation job to the scheduling/crew workflow. Assignment and scheduling may still need staff action.
- Make the project's parts list, site and customer information accessible to the appropriate people.

### Stock, dispatch and delivery

- Track high-value equipment and the inventory needed for orders; reflect purchases and movements in company records.
- Scan the required unique serial numbers for **inverters, batteries and charge controllers** before they leave the warehouse. Preserve which units were dispatched for which customer and project.
- Record delivery as a distinct event from dispatch. Use the recorded delivery date to start the applicable warranty for delivered equipment, without manual date-register entry.
- Support the brief's inverter/battery and solar-panel warranty examples through configurable product policies rather than treating example durations as universal. The brief does not establish whether every panel is individually serialized: panel identification and warranty linkage need confirmation.

### Installation and customer acceptance

- Make the relevant work accessible on a phone or tablet.
- Capture start time, finish time, confirmed system size, completed-roof photos and the homeowner's on-screen signature.
- Retain this evidence with the customer/project and make it retrievable by authorized staff. Completion versus acceptance states and correction rules require agreement.

### Warranty, support and resolution

- Find the customer and exact equipment record/serial when a complaint arrives; show the associated warranty and its status for the relevant date.
- Open a service ticket and record the issue, work performed, parts, labour and any replacement.
- For a repair covered by the warranty, the brief says the customer should pay nothing; for an out-of-warranty repair, parts and labour should be billed automatically. Coverage exclusions, mixed cases, pricing and any approval process are not specified.
- Track the ticket until the customer confirms that the issue is resolved. Preserve a clear history between the original item and any replacement; replacement warranty policy remains open.

### Finance and management

- Record advances/full payments, invoices, stock purchases, technician hours and pay-related information, and costs against projects where applicable.
- Show which installations made or lost money, which work is unfinished, which repairs remain open, and the status of subsidy paperwork.
- Provide today's, this week's and this month's figures and a way to share them. Financial definitions, tax treatment and regulatory reporting requirements need confirmation before claiming accounting-grade results.

## Scope

### In Scope — Complete Product Brief

All capabilities in the Company Workspace and Dashboard and End-to-End Business Workflow sections are in the overall product scope, including the **company's operational workflow and the director's dashboard**, not only the public enquiry form or installer view. The brief requires invoicing, subsidy-paperwork tracking and technician pay as well as the customer-to-service lifecycle.

### Proposed Hackathon Slice — Not Yet Approved

A coherent first demonstration could use one customer and one project:

1. Submit and save an enquiry; show it to sales.
2. Record and approve a survey; generate a quote and parts list from a chosen template.
3. Confirm an order and record payment; display the associated packing task and installation job in the company workspace.
4. Capture required serials, record dispatch and delivery, and show delivery-based warranty records.
5. Record installation proof and signature; create a service ticket that displays linked equipment and its warranty.
6. Show the project, outstanding work and financial figures derived from records entered during the demo.

This is a **proposed priority**, not an agreement that the rest of the brief is optional or complete. The actual 24-hour scope, team responsibilities and sequencing need team approval. If time forces omissions, explicitly identify those omissions in the final demo.

### Out of Scope — External or Unspecified Commitments

The brief does not require a particular implementation of the following, so do not claim they exist or silently depend on them:

- A specific technology stack, cloud provider, payment gateway, government subsidy API, accounting package, barcode hardware or Odoo integration. The event is associated with Odoo, but the supplied description does not say use of Odoo is mandatory.
- Automatic submission to government systems, guaranteed subsidy eligibility, real payment processing or legally compliant accounting/tax filing.
- A native mobile app, separate customer portal or fully disconnected offline synchronization. A responsive web experience and local operation are possible approaches; they are not yet selected.
- AI features or automated electrical engineering approval. Package contents must be verified by a qualified domain expert for real installations.

These exclusions do **not** remove the brief's requirements to record payments, track subsidy paperwork, maintain financial information or work on mobile/tablet.

## User Stories and Acceptance Criteria

These checks define observable behaviour for the overall product. They are not a complete implementation contract or evidence of completed work.

### Acceptance Criteria

### US-01: Capture and follow an enquiry

As sales staff, I want new enquiries and follow-up history in one place so that a lead is not lost.

- [AC-01.1] Given a valid enquiry, when it is submitted, then its saved record appears in the sales workspace with the submitted customer details and requirements.
- [AC-01.2] Given an enquiry missing a required field, when it is submitted, then the system identifies the invalid field and does not create an incomplete enquiry.

### US-02: Gate the customer quote on survey approval

As a survey reviewer and salesperson, I want the site assessed before a quote is sent.

- [AC-02.1] Given a survey is not approved, when a user attempts to send the associated customer quote, then the system rejects the action and explains the missing approval.
- [AC-02.2] Given an approved survey, when sales generates a quote for a supported package, then the quote and corresponding template-derived parts list are saved against the same customer/project.

### US-03: Move a confirmed order into company workflows

As warehouse and installation staff, I want to see new work when an order is confirmed.

- [AC-03.1] Given a confirmed order, when a warehouse user opens the work queue, then the project's required parts are visible.
- [AC-03.2] Given the same confirmed order, when the installation workflow is opened, then the associated job is visible even if scheduling or assignment is pending.
- [AC-03.3] Given the company has not recorded the required advance or full payment, when staff attempt to start work, then the system indicates the payment prerequisite has not been met. The minimum qualifying advance and exceptions remain open.

### US-04: Trace equipment and start warranties

As warehouse staff, I want traceable serials and delivery-based warranty records.

- [AC-04.1] Given an order contains an inverter, battery or charge controller requiring a unique serial, when dispatch is attempted without that unit's scanned serial, then dispatch is blocked and the missing item is identified.
- [AC-04.2] Given correctly recorded serials and a recorded delivery, when an authorized user opens the delivered equipment, then each applicable serial is linked to the customer/project and its warranty start is the recorded delivery date.
- [AC-04.3] Given dispatch has been recorded but delivery has not, then the system must not present the relevant warranty as having started from that undelivered dispatch.

### US-05: Capture proof of installation

As an installer, I want to document completed work on a phone or tablet.

- [AC-05.1] Given a valid installation record with start and finish times, installed size, roof photos and customer signature, when it is saved, then an authorized user can retrieve the evidence from that project.
- [AC-05.2] Given a finish time earlier than the start time, when the record is saved, then validation rejects it with an actionable error.

### US-06: Resolve a service issue

As support, I want to find equipment and track a claim through confirmation.

- [AC-06.1] Given a customer and recorded equipment serial, when support opens the equipment record, then the system shows its associated warranty information and status.
- [AC-06.2] Given a repair is covered, the customer charge is zero; given a repair is out of warranty, recorded parts and labour produce the applicable bill automatically, subject to agreed pricing rules.
- [AC-06.3] Given the customer has not confirmed that the problem is resolved, when closure is attempted, then the ticket remains open and shows confirmation is pending.

### US-07: Operate and understand the business

As the director, I want actionable queues and transparent figures backed by the company's records.

- [AC-07.1] Given saved operational records, the relevant company queues show the matching enquiries, projects, warehouse jobs and open service work; selecting an item opens its underlying record.
- [AC-07.2] Given saved income, cost and project records, the selected-period reporting view displays figures calculated from those records, separately labels receipts and project profitability, and identifies missing cost data rather than inventing a complete profit value.
- [AC-07.3] Given a selected period, an authorized user can share the relevant report in a format to be decided.

## Edge Cases and Integrity

The final detailed design must resolve policy-dependent cases; the baseline system should avoid silently losing or corrupting data.

- **Invalid or missing input:** Reject invalid data on the server as well as showing useful form errors. Required fields, permissible limits and validation formats need a shared contract.
- **Repeated submissions:** Avoid duplicate effects on payment, dispatch, delivery, warranty creation or ticket closure when an action is retried. How potential duplicate customer enquiries are identified requires a policy.
- **Survey rejection or change:** A rejected or unapproved survey must not result in a customer quote being sent. Define how re-surveys and changes after a quote are reviewed.
- **Stock and serial conflicts:** Do not let the same physical serial be assigned to multiple active deliveries. Show missing or unavailable required stock instead of claiming it was packed. Define corrections, returns and replacement handling.
- **Delivery errors:** Define who can correct an incorrect delivery date, how warranty dates are recalculated and how the correction is recorded; do not silently create multiple warranties from repeat delivery actions.
- **Warranty ambiguity:** A missing product policy, unknown delivery date or unclear equipment identification must be shown as requiring review, not automatically labeled covered or expired.
- **Service completion:** Failed or partial repair must not be represented as customer-confirmed resolution. Mixed-coverage claims and replacement warranty rules require company policy.
- **Financial incompleteness:** An incomplete cost record is not proof a project was profitable. Missing data and the calculation basis must remain visible.
- **Device/network failure:** Do not report a save as successful when persistence fails. Full disconnected operation and synchronization are not yet specified.
- **Access and privacy:** Customer contact data, signatures, photos, payroll and financial records must be limited to appropriate authorized company users; exact role permissions and retention policies require design.

## Non-Functional Requirements

- **Dynamic data:** Operational screens and reports use data created or updated through the system and persisted in a data store. Static JSON may be used for initial prototyping, not as the finished system's sole source of business data.
- **Responsive interaction:** The public enquiry, company workspace and technician forms must be usable at relevant phone, tablet and desktop sizes; verify the actual supported views on each form factor.
- **Consistent, intuitive UI:** Navigation, labels, layout and visual language must be coherent and allow users to find their relevant work. The exact design is to be established with the team.
- **Input integrity:** Validate and enforce important business preconditions on the server, not only through disabled buttons or browser-side checks. Preserve meaningful error messages.
- **Security and privacy:** Define staff authentication and authorization, protect sensitive records and uploads, and avoid exposing credentials. No particular security standard or production-readiness claim is assumed.
- **Reliability:** Persist saved data and surface failures. Avoid partial updates where a single business action must create linked records together; choose a concrete transaction/retry design during implementation.
- **Accessibility:** Use readable contrast, labels for form controls and keyboard-accessible interactions; test key forms and navigation.
- **Local/offline:** The event encourages local or offline alternatives. A local server/database can reduce dependence on cloud services, but does not alone allow a disconnected phone to keep working. Offline behavior is undecided.
- **Version control:** More than one team member must contribute to the Git repository. Agree on collaboration and integration practices; the actual assignments are undecided.
- **Performance:** The brief does not define response-time or availability targets. Set measurable targets and test conditions when architecture and demo environment are chosen; do not invent production guarantees.

## Conceptual Data and Interfaces

This section defines **relationships and responsibilities**, not final database tables or API contracts.

- **Customer / enquiry:** Contact and site details, requirements, source, status and follow-up history.
- **Survey:** Customer/site link, qualification findings, visit measurements, review state and evidence.
- **Package / product / parts template:** System type and capacity, line items, quantities, prices or pricing references, and applicable warranty policy.
- **Quote / order / project:** Approved survey and customer links, agreed quote and parts snapshot, order/payment status, schedule and progress.
- **Inventory / equipment / movements:** Products, quantities, purchases, required serials, assignment, dispatch and delivery history.
- **Warranty:** Product/equipment and customer/project association, delivery-based start, policy duration and status; panel identification approach remains open.
- **Installation record:** Project, assigned crew, times, system size, photo references, acceptance signature and status.
- **Service ticket:** Customer/project/equipment links, fault, warranty decision, parts/labour, charge, progress and customer confirmation.
- **Finance / administration:** Payments, invoices, job costs, technician hours/pay, subsidy-paperwork status and reporting periods.
- **Staff / permissions:** Users, assigned responsibilities and access to relevant data and actions; exact permission model remains open.

Logical interfaces to define later include customer enquiry submission, internal reads/actions, file/photo/signature storage, reporting/export, and any notifications. For parallel implementation, the team must agree actual field schemas, state transitions, authorization, error responses and event/retry semantics before components are built independently.

## Assumptions & Open Questions

1. **Hackathon deliverable:** Are there additional round-specific submission rules, judging weights, mandatory integrations or an Odoo requirement? The supplied event text does not answer this.
2. **Team and 24-hour scope:** What are the actual team size, skills and available working setup? Which vertical slice and omissions does the team approve?
3. **Quote policy:** Can an internal draft be prepared before survey approval, provided it is not sent? Who is allowed to approve a survey and send a quote?
4. **Packages:** What are the accurate, approved parts and quantities for each capacity/type, and what customizations are allowed? The brief's package descriptions require domain review.
5. **Payment:** What minimum advance counts as sufficient, who verifies payment, and are exceptions permitted? Does the demo only record payments or need real payment integration?
6. **Scheduling:** Are dates and technician assignments required immediately at order confirmation, or may the created job remain unassigned until scheduled?
7. **Warranty:** How are panels identified and linked to a customer? What are actual product-specific durations, exclusions, expiry boundaries, replacement terms and delivery-date correction rules?
8. **Service billing:** How are parts and labour priced, and how are partially covered or disputed repairs handled? How is customer confirmation captured?
9. **Finance and payroll:** Which accounting basis, revenue and cost definitions, technician pay rules, tax details and reporting/export formats are required?
10. **Subsidies:** Which information and statuses must be tracked, and who performs or verifies the actual government paperwork?
11. **Access and hosting:** Which staff may see or edit each category of data? Is a shared local network enough for the demo, or is true disconnected device operation required?
12. **Customer interactions:** How are quotes delivered, payments recorded and installation/service confirmations obtained? Are a customer portal or external messaging integrations actually needed?

## Source and Revision Notes

- **Primary problem statement:** User-supplied `Solar_Installation_Management_System.pdf`, sections 1–3.
- **Event constraints:** Hackathon description supplied in the conversation: 24 hours; teams of up to four; mandatory dynamic/real-time data, responsive and consistent UI, validation, intuitive navigation, and Git participation by more than one member; local/offline and backend/database capabilities are described as nice-to-haves.
- **Selected problem:** Solar Installation Management System, explicitly chosen by the user.
- **Version 0.1:** Initial overall discussion draft. Proposed role structure, dashboard layout and hackathon slice require team review. Detailed architecture, API contracts, test plans and task ownership remain to be developed.
