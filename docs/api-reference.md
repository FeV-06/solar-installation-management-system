# WebAPI Reference & Endpoints Catalog

This document catalogs the RESTful HTTP API endpoints exposed by the Sol WebAPI service (`http://localhost:5228`).

---

## 1. Conventions & Standards

- **Error Format:** Every error response strictly adheres to RFC 9457 `ProblemDetails` with a machine-readable `code` extension:
  ```json
  {
    "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
    "title": "Bad Request",
    "status": 400,
    "detail": "The email provided is invalid.",
    "code": "validation_failed"
  }
  ```
- **Time Representation:** All timestamps serialize as ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Authentication:** Dual session cookies (`sol-session` for staff, `sol-customer-session` for customers).

---

## 2. Endpoints Catalog

### 2.1 Customer Authentication (`/api/customer-auth`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/customer-auth/request-otp` | Anonymous | Requests a 6-digit one-time passcode sent via email. Rate-limited. |
| `POST` | `/api/customer-auth/verify-otp` | Anonymous | Verifies OTP and sets `sol-customer-session` cookie on success. |
| `POST` | `/api/customer-auth/verify-signup-otp` | Anonymous | Verifies OTP for new customer account creation. |
| `POST` | `/api/customer-auth/complete-signup` | Anonymous | Finalizes account password and profile for verified customer. |
| `POST` | `/api/customer-auth/login` | Anonymous | Authenticates with email and password, setting customer cookie. |
| `GET` | `/api/customer-auth/me` | Customer | Returns profile details of currently authenticated customer. |
| `POST` | `/api/customer-auth/logout` | Anonymous | Clears customer authentication session cookie. |

### 2.2 Customer Portal (`/api/customer-portal`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/customer-portal` | Customer | Retrieves complete portal state: active lead, installation, and latest proposal. |
| `POST` | `/api/customer-portal/quote-requests` | Customer | Submits a new solar quote request for the logged-in customer. |
| `GET` | `/api/customer-portal/quotes/{quoteId}` | Customer | Retrieves detailed quotation including 9-part BOM line items. |
| `POST` | `/api/customer-portal/quotes/{quoteId}/pay` | Customer | Records advance or full payment (`CustomerPayQuoteRequest`), confirming order. |

### 2.3 Staff Authentication (`/api/auth`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Anonymous | Authenticates staff user; issues `sol-session` HTTP-only cookie. Rate-limited. |
| `POST` | `/api/auth/logout` | Anonymous | Clears staff session cookie. |
| `GET` | `/api/auth/me` | Staff | Returns authenticated user details and active role. |
| `PUT` | `/api/auth/password` | Staff | Allows user to change their own password, rotating session token. |

### 2.4 Leads Management (`/api/leads`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/leads` | Anonymous | Public quote enquiry intake. Rate-limited (`RateLimits.QuoteForm`). |
| `GET` | `/api/leads` | Admin | Lists paginated leads with status filtering (`LeadPageRequest`). |
| `GET` | `/api/leads/{id}` | Admin | Retrieves comprehensive lead details and linked customer/site info. |
| `PUT` | `/api/leads/{id}/status` | Admin | Updates lead status conforming to valid state transitions. |
| `PUT` | `/api/leads/{id}` | Admin | Updates contact information for an open lead. |
| `POST` | `/api/leads/{id}/convert` | Admin | Converts qualified lead into Customer and Installation entities. |

### 2.5 Customers Directory (`/api/customers`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/customers` | Admin | Returns paginated list of customers filtered by search terms. |
| `GET` | `/api/customers/{id}` | Admin | Retrieves customer profile, contact address, and associated installations. |

### 2.6 Installations (`/api/installations`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/installations/{id}` | Admin | Retrieves installation details, site address, and linked customer. |
| `POST` | `/api/installations/{id}/surveys` | Admin | Schedules a new site survey and assigns a technician. |
| `GET` | `/api/installations/{id}/quote` | Staff | Retrieves current proposal and BOM for the installation. |
| `POST` | `/api/installations/{id}/quote` | Admin | Generates or recalculates quote from approved survey data. |
| `GET` | `/api/installations/{id}/packing-order` | Staff | Retrieves warehouse packing order checklist. |

### 2.7 Site Surveys (`/api/surveys`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/surveys` | Staff | Paginated list of surveys; technicians see only their assigned visits. |
| `GET` | `/api/surveys/{id}` | Staff | Retrieves detailed survey visit and findings. |
| `PUT` | `/api/surveys/{id}/schedule` | Admin | Reschedules visit time or reassigns technician. |
| `PUT` | `/api/surveys/{id}/report` | Technician | Submits technical measurements (roof area, tilt, direction, cables). |
| `POST` | `/api/surveys/{id}/review` | Admin | Approves or rejects submitted survey report. |

### 2.8 Quotes & Warehouse Packing (`/api`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `PUT` | `/api/quotes/{quoteId}/send` | Admin | Transitions quote from `Draft` to `Sent`, alerting the customer. |
| `PUT` | `/api/packing-orders/{orderId}/items/{itemId}` | Admin | Updates packed status and records serial number for serialized items. |

### 2.9 Staff Users Management (`/api/users`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | Returns paginated list of staff accounts. |
| `GET` | `/api/users/{id}` | Admin | Retrieves user details. |
| `POST` | `/api/users` | Admin | Creates a new technician or staff account. |
| `PUT` | `/api/users/{id}` | Admin | Updates user name and email. |
| `PUT` | `/api/users/{id}/password` | Admin | Resets a staff member's password. |
| `POST` | `/api/users/{id}/deactivate` | Admin | Deactivates account, immediately invalidating active sessions. |
| `POST` | `/api/users/{id}/reactivate` | Admin | Restores a deactivated account. |

### 2.10 Notification Outbox Diagnostics (`/api/notifications`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/notifications/failed` | Admin | Lists outbox messages that failed delivery after 24 hours of attempts. |
| `POST` | `/api/notifications/{id}/retry` | Admin | Re-queues a failed notification with another 24-hour attempt window. |
| `POST` | `/api/notifications/failed/retry` | Admin | Batch retries all currently failed notifications. |

---

## 3. Interactive Documentation
When running the WebAPI in Development mode (`ASPNETCORE_ENVIRONMENT=Development`), interactive Scalar API documentation is available at:
`http://localhost:5228/scalar/v1`
