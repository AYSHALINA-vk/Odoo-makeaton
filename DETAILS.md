# Subscription Management System — Detailed Specification

> Derived from *Subscription_Management_System.pdf*. This document restates the brief as a structured specification: goals, roles, modules, business rules, data model, workflows, non-functional requirements and acceptance criteria. Items marked **[Assumption]** are not stated in the brief and are proposed to fill gaps.

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Business Context: Brightloop Software](#2-business-context-brightloop-software)
3. [Goals and Success Criteria](#3-goals-and-success-criteria)
4. [Users and Roles](#4-users-and-roles)
5. [Functional Requirements](#5-functional-requirements)
   - 5.1 Authentication and Account Management
   - 5.2 Role-Based Access Control
   - 5.3 Product Management
   - 5.4 Plan Management
   - 5.5 Quotation Templates
   - 5.6 Subscription Management
   - 5.7 Invoicing and Billing Runs
   - 5.8 Tax Management
   - 5.9 Discount Management
   - 5.10 Payments
   - 5.11 Customer Portal
   - 5.12 Reporting and Dashboard
6. [Lifecycle State Machines](#6-lifecycle-state-machines)
7. [Data Model](#7-data-model)
8. [Key Business Rules and Invariants](#8-key-business-rules-and-invariants)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Suggested Architecture](#10-suggested-architecture)
11. [Suggested API Surface](#11-suggested-api-surface)
12. [Scenario-to-Feature Traceability](#12-scenario-to-feature-traceability)
13. [Acceptance Criteria](#13-acceptance-criteria)
14. [Assumptions, Gaps and Open Questions](#14-assumptions-gaps-and-open-questions)
15. [Suggested Delivery Phases](#15-suggested-delivery-phases)

---

## 1. Project Summary

**Challenge:** Build one unified software platform that runs the full life of a subscription business: setting up products and plans, creating subscriptions, generating invoices, collecting payments, and reporting revenue.

**Tagline:** *Build one system to run plans, subscriptions and recurring billing in one place.*

**Core idea:** The platform is the digital backbone of a company that earns money every month rather than once. Each "scene" in the brief is a real situation in an ordinary billing month; the system must make each one easy.

---

## 2. Business Context: Brightloop Software

### 2.1 The company
Brightloop sells everything on subscription:

- Business software billed **monthly or yearly**
- **Add-ons** that customers switch on and off
- A few products that come in **variants** (e.g. by brand)

Customers range from **small shops on monthly plans** to **large companies on yearly contracts**.

### 2.2 Internal organisation
| Group | Responsibility |
|---|---|
| Admin | Sets up products, plans, taxes and discounts; controls the whole system |
| Internal team | Handles customers day to day |
| Customers | Want to view and manage their own subscriptions without emailing anyone |

### 2.3 How things run today (pain points)

| Area | Today | Problem |
|---|---|---|
| Customer subscriptions | Tracked in a spreadsheet | No single source of truth |
| Renewals | Remembered by whoever notices first | Missed renewals |
| Invoices | Typed by hand every month | Errors, wasted time |
| Payments | Matched to invoices by scrolling bank statements | Slow, error-prone |
| Revenue reports | Built manually each quarter | Nobody can say what the recurring revenue is |

**Net effect:** renewals get missed, invoices go out wrong, and nobody can state actual recurring revenue.

---

## 3. Goals and Success Criteria

| # | Goal | Measurable outcome |
|---|---|---|
| G1 | Replace spreadsheet tracking | All subscriptions live in the system with a visible status |
| G2 | Eliminate manual invoicing | Invoices generated automatically from subscriptions, with customer details, lines, taxes and totals pre-filled |
| G3 | Never bill twice or skip | Billing runs are idempotent; every due subscription gets exactly one invoice per period |
| G4 | Automate taxes and discounts | Applied from admin-defined rules with no manual step |
| G5 | Reconcile payments easily | Each payment recorded against an invoice; paid/outstanding visible at any moment |
| G6 | Instant financial visibility | One dashboard for active subscriptions, revenue, payments, overdue invoices |
| G7 | Customer self-service | Customers view and manage their own subscriptions and invoices via a portal |
| G8 | Performance | **Every page responds in under 2 seconds** with thousands of subscriptions |

---

## 4. Users and Roles

### 4.1 Role overview

| Role | Description | Scope |
|---|---|---|
| **Admin** | Controls the whole system | Full access |
| **Internal User (Staff)** | Handles day-to-day work | Limited access |
| **Customer (Portal User)** | External customer | Only their own subscriptions and invoices |

### 4.2 Permission matrix (derived from the brief)

| Capability | Admin | Internal User | Customer |
|---|:-:|:-:|:-:|
| Sign up / log in / reset password | ✔ | ✔ | ✔ |
| Create staff accounts | **✔ (only)** | ✘ | ✘ |
| Create/edit products and variants | ✔ | ✘ **[Assumption]** | ✘ |
| Create/edit plans | ✔ | ✘ **[Assumption]** | ✘ |
| Configure taxes | ✔ | ✘ | ✘ |
| Create discount rules | **✔ (only)** | ✘ | ✘ |
| Create quotation templates | ✔ | ✔ **[Assumption]** | ✘ |
| Create/manage subscriptions | ✔ | ✔ | Own only (view/manage) |
| Generate / confirm / cancel / send / print invoices | ✔ | ✔ | View own only |
| Record payments | ✔ | ✔ | Pay own invoices **[Assumption]** |
| View reports and dashboard | ✔ | ✔ (limited) **[Assumption]** | ✘ |
| Manage customers | ✔ | ✔ | Own profile only |

---

## 5. Functional Requirements

### 5.1 Authentication and Account Management
*Scene: "A new customer signs up"*

**FR-AUTH-1 Sign-up**
- A customer creates an account with **email** and **password**.
- **Each email may belong to only one account** (unique constraint, case-insensitive).

**FR-AUTH-2 Password policy**
The password must:
- Be **more than eight characters** (i.e. at least 9)
- Contain at least one **uppercase** letter
- Contain at least one **lowercase** letter
- Contain at least one **special character**

Validation must occur on both client and server, with clear error messages per failed rule.

**FR-AUTH-3 Password reset**
- A "Forgot password" flow sends a **reset link to the registered email**.
- **[Assumption]** Links are single-use, time-limited (e.g. 30–60 minutes), and the response does not reveal whether an email is registered.
- The new password must satisfy FR-AUTH-2.

**FR-AUTH-4 Login/logout and sessions**
- Secure login, session or token handling, logout. **[Assumption]**

**FR-AUTH-5 Staff creation**
- **Only the Admin** can add a new member of staff.
- Public sign-up always creates a Customer account, never staff or admin.

---

### 5.2 Role-Based Access Control
- Three roles: Admin, Internal User, Customer.
- Authorisation is enforced **server-side** on every endpoint, not just by hiding UI.
- Customers can only query records tied to their own customer ID (row-level scoping).
- Internal users have a restricted menu and restricted actions (see §4.2).

---

### 5.3 Product Management
*Scene: "Launching a new plan" (part 1)*

**FR-PROD-1 Product fields**

| Field | Notes |
|---|---|
| Name | Required |
| Type | e.g. service, software, add-on **[Assumption: enumerated list]** |
| Sales price | Price charged to customers |
| Cost price | Internal cost, used for margin reporting |
| Notes | Free text |

**FR-PROD-2 Variants**
- A product can be offered in **variants**, for example **by brand**.
- Each variant value carries an **extra price**. Example from the brief: choosing the **Odoo** brand **adds 560** to the price.
- Effective unit price = product sales price + selected variant extra price.
- A subscription line records the chosen variant and the resulting unit price.

**FR-PROD-3 Lifecycle**
- Products can be edited, and archived/deactivated rather than hard-deleted if referenced by subscriptions **[Assumption]**.

---

### 5.4 Plan Management
*Scene: "Launching a new plan" (part 2)*

**FR-PLAN-1 Plan fields**

| Field | Notes |
|---|---|
| Name | Required |
| Price | Recurring price |
| Billing period | **Daily, Weekly, Monthly, Yearly** |
| Minimum quantity | Smallest quantity allowed on a subscription |
| Available from / to | Dates during which the plan can be sold |

**FR-PLAN-2 Per-plan behavioural options** (the admin decides *plan by plan*)

| Option | Behaviour |
|---|---|
| **Auto-close** | Plan closes on its own when it ends |
| **Closable** | Plan can be closed early by staff |
| **Pausable** | Plan can be paused and resumed |
| **Renewable** | Plan can be renewed |

**FR-PLAN-3 Validation**
- Quantity on a subscription line must be ≥ plan minimum quantity.
- A plan cannot be selected on a new subscription outside its availability dates.
- Actions (close/pause/renew) are only offered when the plan allows them.

---

### 5.5 Quotation Templates
*Scene: "Turning a quote into a subscription" (part 1)*

**FR-QT-1** A sales rep can start an offer from a **quotation template** rather than from scratch.

**FR-QT-2** A template contains:
- A predefined **plan**
- Predefined **product lines** (product, variant, quantity)
- A **validity period in days** (quotation stays valid for N days)

**FR-QT-3** Creating a quotation from a template copies the plan and lines, which remain editable on the quotation. The quotation's expiry = creation date + validity days.

**FR-QT-4** Expired quotations cannot be confirmed without renewal/re-issue **[Assumption]**.

---

### 5.6 Subscription Management
*Scene: "Turning a quote into a subscription" (part 2)*

**FR-SUB-1 Header fields**

| Field | Notes |
|---|---|
| Subscription number | Unique, auto-generated (e.g. `SUB-000123`) |
| Customer | Required |
| Plan | Required |
| Start date | Required |
| Expiry date | Required |
| Payment terms | e.g. Immediate, Net 15, Net 30 **[Assumption: configurable list]** |

**FR-SUB-2 Subscription lines**

| Field | Notes |
|---|---|
| Product (and variant) | |
| Quantity | ≥ plan minimum |
| Unit price | Product price + variant extra |
| Taxes | Resolved from admin tax rules |
| Amount | `qty × unit price − discount + tax` (see §8) |

**FR-SUB-3 Status workflow**
`Draft → Quotation → Confirmed → Active → Closed`
- Anyone on the team can see where a subscription stands (status badge in list and detail views, with status filter).
- Transitions are validated (no skipping or reversing arbitrarily); every transition is logged with user and timestamp **[Assumption]**.

**FR-SUB-4 Plan-driven actions**
Close, pause, resume and renew, available according to FR-PLAN-2.

**FR-SUB-5 Renewals**
Upcoming renewals are surfaced (list/filter/notification) so they are never missed. This directly addresses "renewals remembered by whoever notices first". **[Assumption: renewal reminders by in-app and email notification]**

---

### 5.7 Invoicing and Billing Runs
*Scene: "Billing day"*

**FR-INV-1 Automatic generation**
- Invoices are **created from subscriptions**, never typed by hand.
- Each invoice is pre-filled with **customer details, product lines, taxes and totals**.
- A **billing run** finds all subscriptions due on a given date (potentially hundreds at once) and generates their invoices in bulk.

**FR-INV-2 Exactly-once guarantee**
- **Nothing is billed twice or skipped.**
- Enforce with a unique key on `(subscription_id, billing_period_start, billing_period_end)`, idempotent billing jobs, transactional writes and a per-run audit log (generated / skipped-with-reason / failed).
- Failed items are retryable without duplicating successful ones.

**FR-INV-3 Invoice actions**
Staff can **confirm, cancel, send, or print** any invoice.
- *Send*: email to the customer with a PDF attachment/link **[Assumption]**.
- *Print*: printable/PDF invoice layout.

**FR-INV-4 Invoice status**
`Draft → Confirmed → Paid` (plus Cancelled as an off-path state **[Assumption]**).

**FR-INV-5 Invoice fields**
Invoice number (unique, sequential), customer, subscription reference, invoice date, due date (from payment terms), lines, subtotal, discount total, tax total, grand total, amount paid, balance due, status.

**FR-INV-6 Immutability**
Once Confirmed, an invoice's financial content is locked; corrections happen via cancellation (and re-issue or credit note **[Assumption]**).

---

### 5.8 Tax Management
**FR-TAX-1** The **admin** defines tax rules (e.g. name, rate %, and applicability).
**FR-TAX-2** Taxes are **calculated automatically** on subscription and invoice lines from those rules; users never enter tax amounts by hand.
**FR-TAX-3** Tax applicability may depend on product/product type or customer **[Assumption]**.
**FR-TAX-4** Tax rate changes apply to future invoices; confirmed invoices keep their original tax snapshot.

---

### 5.9 Discount Management
*Scene: "A customer asks for a better price"*

**FR-DISC-1 Creation**
**Only the Admin** can create discount rules.

**FR-DISC-2 Discount rule fields**

| Field | Notes |
|---|---|
| Name | |
| Type | **Fixed amount** or **Percentage** |
| Value | Amount or % |
| Minimum purchase amount | Optional threshold |
| Minimum quantity | Optional threshold |
| Start date / End date | Validity window |
| Usage limit | Maximum number of times the discount can be used |

**FR-DISC-3 Scope**
A discount applies to **specific products** or to **whole subscriptions**.

**FR-DISC-4 Automatic application**
- Once a discount applies, it **appears on the next invoice on its own**; nobody has to remember.
- It **stops** when it **expires** (end date passes) or **runs out** (usage limit reached).
- Each application increments a usage counter, atomically, so concurrent billing cannot exceed the limit.

**FR-DISC-5 Stacking rules** are an open question (see §14).

---

### 5.10 Payments
*Scene: "The money comes in"*

**FR-PAY-1 Recording**
Each payment is recorded with:

| Field | Notes |
|---|---|
| Method | e.g. bank transfer, card, cash, UPI, cheque **[Assumption: configurable list]** |
| Amount | |
| Date | |
| Note | Free text (e.g. bank reference) |
| Invoice | **Linked to the right invoice** |

**FR-PAY-2 Allocation**
- Payments are matched to invoices inside the system, replacing manual bank-statement scrolling.
- **[Assumption]** Partial payments are allowed; invoice becomes **Paid** when total payments ≥ invoice total. Overpayments are flagged.

**FR-PAY-3 Visibility**
At any moment the team can see **which invoices are paid and which are outstanding**; list views filter by status, customer and date.

**FR-PAY-4 Overdue handling**
Invoices past due date and not fully paid are flagged **Overdue** so they can be chased before becoming lost revenue. **[Assumption: derived flag, not a stored status]** Optional reminder emails/dunning.

---

### 5.11 Customer Portal
**FR-PORTAL-1** Customers log in and see **only their own** subscriptions and invoices.
**FR-PORTAL-2** Customers can manage their subscriptions without emailing anyone: view details and status, and perform actions permitted by the plan (pause, close, renew) **[Assumption: subject to plan flags and company policy]**.
**FR-PORTAL-3** Customers can view/download invoices and see payment status; online payment is optional **[Assumption]**.
**FR-PORTAL-4** Profile management (name, billing details, password change).

---

### 5.12 Reporting and Dashboard
*Scene: "The finance lead, at the end of the month"*

The finance lead needs **one place** to answer:

| Question | Metric |
|---|---|
| How many subscriptions are active? | Count of subscriptions in **Active** status |
| How much revenue came in? | Sum of payments received in period |
| How much is still owed? | Sum of outstanding invoice balances |
| Which invoices are overdue? | List of unpaid invoices past due date |

**FR-REP-1** Dashboard with **summary view** (KPI cards) covering active subscriptions, revenue, payments and overdue invoices.
**FR-REP-2** **Filters**: date range, customer, plan, product, status, payment method.
**FR-REP-3** Drill-down from KPIs to underlying records (e.g. click "Overdue" → overdue invoice list).
**FR-REP-4** Export to CSV/PDF **[Assumption]**.
**FR-REP-5** Recurring revenue metrics such as **MRR / ARR** to resolve "nobody can say how much recurring revenue the company has" **[Assumption]**: normalise each active subscription to monthly (yearly ÷ 12, weekly × 52/12, daily × 365/12).
**FR-REP-6** **Performance:** every page loads in **under 2 seconds** with thousands of subscriptions (see §9).

---

## 6. Lifecycle State Machines

### 6.1 Subscription

```
Draft ──► Quotation ──► Confirmed ──► Active ──► Closed
```

| From | To | Trigger |
|---|---|---|
| Draft | Quotation | Offer prepared/sent to customer |
| Quotation | Confirmed | Customer accepts |
| Confirmed | Active | Start date reached or manual activation |
| Active | Closed | Expiry (auto-close if enabled), early close (if closable), or cancellation |
| Active | Paused ⇄ Active | If plan is pausable **[Assumption: sub-state/flag]** |

### 6.2 Invoice

```
Draft ──► Confirmed ──► Paid
   └────────┴──► Cancelled
```

| From | To | Trigger |
|---|---|---|
| Draft | Confirmed | Staff confirms |
| Confirmed | Paid | Payments cover total |
| Draft/Confirmed | Cancelled | Staff cancels (before payment) |

### 6.3 Plan behaviour flags
Auto-close, closable, pausable, renewable, each independently set per plan.

---

## 7. Data Model

### 7.1 Entities

| Entity | Key fields |
|---|---|
| **User** | id, email (unique), password_hash, role, status, created_at |
| **Customer** | id, user_id (nullable), name, company, billing address, phone, tax ID |
| **Product** | id, name, type, sales_price, cost_price, notes, is_active |
| **ProductVariant** | id, product_id, attribute (e.g. Brand), value (e.g. Odoo), extra_price |
| **Plan** | id, name, price, billing_period (daily/weekly/monthly/yearly), min_quantity, available_from, available_to, auto_close, closable, pausable, renewable |
| **QuotationTemplate** | id, name, plan_id, validity_days |
| **QuotationTemplateLine** | id, template_id, product_id, variant_id, quantity |
| **Subscription** | id, number (unique), customer_id, plan_id, start_date, expiry_date, payment_terms_id, status, next_billing_date |
| **SubscriptionLine** | id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount |
| **PaymentTerm** | id, name, days_due |
| **Tax** | id, name, rate, applies_to rules |
| **Discount** | id, name, type (fixed/percent), value, min_purchase, min_quantity, start_date, end_date, usage_limit, times_used, scope (product/subscription), product_id (nullable) |
| **Invoice** | id, number (unique), subscription_id, customer_id, period_start, period_end, invoice_date, due_date, status, subtotal, discount_total, tax_total, total, amount_paid |
| **InvoiceLine** | id, invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, tax_amount, amount |
| **Payment** | id, invoice_id, method, amount, payment_date, note, recorded_by |
| **BillingRun** | id, run_date, started_at, finished_at, generated_count, skipped_count, failed_count |
| **AuditLog** | id, actor_id, entity, entity_id, action, before/after, timestamp |

### 7.2 Key relationships
- Customer 1—N Subscription; Subscription 1—N SubscriptionLine
- Plan 1—N Subscription; QuotationTemplate N—1 Plan
- Subscription 1—N Invoice; Invoice 1—N InvoiceLine; Invoice 1—N Payment
- Product 1—N ProductVariant
- Discount N—M Product (when product-scoped); Discount ↔ Subscription via application records

### 7.3 Key constraints and indexes
- `UNIQUE(user.email)` (case-insensitive)
- `UNIQUE(subscription.number)`, `UNIQUE(invoice.number)`
- `UNIQUE(invoice.subscription_id, period_start, period_end)` for exactly-once billing
- Indexes on `subscription(status, next_billing_date)`, `invoice(status, due_date)`, `invoice(customer_id)`, `payment(invoice_id, payment_date)` to meet the 2-second target
- Money stored as fixed-precision decimals (never floats)

---

## 8. Key Business Rules and Invariants

1. **Unique email:** one account per email address.
2. **Password rule:** length > 8, with uppercase, lowercase and special character.
3. **Staff creation:** admin only. **Discount creation:** admin only.
4. **Variant pricing:** effective price = base sales price + variant extra (e.g. +560 for Odoo).
5. **Minimum quantity:** line quantity ≥ plan minimum quantity.
6. **Plan availability:** plan sellable only within its available-from/to dates.
7. **Plan actions:** auto-close, early close, pause and renew follow the plan's flags.
8. **Line amount calculation (proposed):**
   ```
   line_subtotal   = quantity × unit_price
   discount_amount = fixed value  OR  line_subtotal × percent
   taxable_amount  = line_subtotal − discount_amount
   tax_amount      = taxable_amount × tax_rate
   line_amount     = taxable_amount + tax_amount
   ```
9. **Exactly-once billing:** one invoice per subscription per billing period; reruns are safe.
10. **Invoice immutability:** confirmed invoices are not edited, only cancelled/re-issued.
11. **Discount eligibility:** within start/end dates, thresholds met (minimum purchase and/or quantity), and `times_used < usage_limit`.
12. **Discount expiry:** discount stops automatically on end date or when usage limit is reached.
13. **Payment linkage:** every payment belongs to exactly one invoice.
14. **Paid status:** invoice is Paid only when payments cover the total.
15. **Overdue:** unpaid/partially paid invoice whose due date has passed.
16. **Tenant scoping:** customers can only ever read their own data.

---

## 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | **Every page responds in under 2 seconds**, with thousands of subscriptions. Use pagination, indexed queries, pre-aggregated dashboard metrics or caching, and asynchronous bulk billing |
| **Scalability** | Billing run must handle hundreds of due subscriptions at once via background workers/queues |
| **Reliability / Integrity** | Transactional invoice creation; idempotent jobs; no double-billing; safe retries |
| **Security** | Hashed passwords (bcrypt/argon2), HTTPS, CSRF/XSS/SQL-injection protection, rate limiting on login and reset, server-side RBAC, secure reset tokens |
| **Auditability** | Log status changes, billing runs, payments, discount applications and admin actions |
| **Usability** | Simple, consistent UI; clear status badges; helpful validation messages; responsive layout for the portal |
| **Data accuracy** | Decimal money arithmetic; consistent rounding; stored tax/discount snapshots on invoices |
| **Maintainability** | Modular code, automated tests for billing, tax and discount logic |
| **Observability** | Logs and metrics for billing runs and slow queries **[Assumption]** |
| **Availability** | Backups and recovery plan for financial data **[Assumption]** |

---

## 10. Suggested Architecture

**[Assumption]** The brief does not mandate a stack; this is a reasonable reference design.

- **Frontend:** SPA (React/Vue) or server-rendered UI, with three experiences: Admin console, Staff workspace, Customer portal.
- **Backend:** REST (or GraphQL) API with modular services:
  - Auth & Users
  - Catalog (Products, Variants, Plans, Templates)
  - Subscriptions
  - Billing (Invoices, Taxes, Discounts)
  - Payments
  - Reporting
  - Notifications (email)
- **Database:** Relational (PostgreSQL/MySQL) for transactional integrity and reporting.
- **Background jobs:** Scheduler (cron/queue worker) for the daily billing run, renewal reminders, auto-close, overdue flagging and email sending.
- **Cache / read models:** Cached or materialised dashboard aggregates to guarantee the 2-second target.
- **Document generation:** PDF rendering for invoices.
- **Email service:** SMTP/transactional provider for reset links and invoices.

---

## 11. Suggested API Surface

| Area | Endpoints (illustrative) |
|---|---|
| **Auth** | `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| **Users** | `POST /users/staff` (admin), `GET /users`, `PATCH /users/:id` |
| **Products** | `GET/POST /products`, `GET/PATCH /products/:id`, `POST /products/:id/variants` |
| **Plans** | `GET/POST /plans`, `PATCH /plans/:id` |
| **Templates** | `GET/POST /quotation-templates`, `POST /quotations/from-template/:id` |
| **Subscriptions** | `GET/POST /subscriptions`, `GET/PATCH /subscriptions/:id`, `POST /subscriptions/:id/transition`, `/pause`, `/resume`, `/close`, `/renew` |
| **Invoices** | `GET /invoices`, `GET /invoices/:id`, `POST /invoices/:id/confirm`, `/cancel`, `/send`, `GET /invoices/:id/pdf` |
| **Billing** | `POST /billing/run` (also scheduled), `GET /billing/runs`, `GET /billing/runs/:id` |
| **Taxes** | `GET/POST /taxes`, `PATCH /taxes/:id` (admin) |
| **Discounts** | `GET/POST /discounts`, `PATCH /discounts/:id` (admin) |
| **Payments** | `POST /invoices/:id/payments`, `GET /payments` |
| **Reports** | `GET /reports/summary`, `/reports/active-subscriptions`, `/reports/revenue`, `/reports/payments`, `/reports/overdue-invoices` |
| **Portal** | `GET /me/subscriptions`, `GET /me/invoices`, `POST /me/subscriptions/:id/(pause|close|renew)` |

---

## 12. Scenario-to-Feature Traceability

| Brief scene | Problem solved | Features |
|---|---|---|
| A new customer signs up | Account creation and access control | FR-AUTH-1..5, RBAC |
| Launching a new plan | Catalog setup | FR-PROD-1..3, FR-PLAN-1..3 |
| Turning a quote into a subscription | Faster offers, visible lifecycle | FR-QT-1..4, FR-SUB-1..5 |
| Billing day | No manual invoicing, no duplicates/skips | FR-INV-1..6, FR-TAX-1..4 |
| A customer asks for a better price | Controlled, automatic discounts | FR-DISC-1..5 |
| The money comes in | Payment recording and outstanding visibility | FR-PAY-1..4 |
| The finance lead, at month end | Instant reporting under 2s | FR-REP-1..6, NFR performance |
| Customers manage subscriptions themselves | Self-service | FR-PORTAL-1..4 |

---

## 13. Acceptance Criteria

### Authentication
- [ ] Signing up with an already-registered email is rejected.
- [ ] Passwords of 8 characters or fewer are rejected; passwords missing an uppercase, lowercase or special character are rejected.
- [ ] "Forgot password" sends a reset link to the registered email, and the link sets a new compliant password.
- [ ] Only the admin can create staff; staff/customers attempting it receive a 403.
- [ ] A customer cannot access another customer's subscriptions or invoices, even by guessing IDs.

### Catalog
- [ ] Admin can create a product with name, type, sales price, cost price and notes.
- [ ] Selecting the *Odoo* brand variant adds 560 to the price on a subscription line.
- [ ] Admin can create a plan with price, billing period (daily/weekly/monthly/yearly), minimum quantity and availability dates, and set auto-close/closable/pausable/renewable independently.
- [ ] Quantity below the plan minimum is rejected.

### Subscriptions
- [ ] A quotation can be created from a template with plan, lines and validity days pre-filled.
- [ ] Each subscription gets a unique number and carries customer, plan, start date, expiry date, payment terms and lines (product, quantity, unit price, taxes, amount).
- [ ] Status progresses Draft → Quotation → Confirmed → Active → Closed and is visible to all team members.

### Billing
- [ ] A billing run generates invoices for all due subscriptions with customer, lines, taxes and totals pre-filled.
- [ ] Running the billing job twice for the same date creates **no duplicate** invoices.
- [ ] No due subscription is skipped; any failure is reported and retryable.
- [ ] Staff can confirm, cancel, send and print invoices; statuses move Draft → Confirmed → Paid.
- [ ] Taxes compute automatically from admin rules.

### Discounts
- [ ] Only the admin can create discounts (fixed or percentage, with minimums, dates and usage limit).
- [ ] A qualifying discount appears on the next invoice with no manual action.
- [ ] A discount stops applying after its end date or after hitting its usage limit.

### Payments
- [ ] A payment is recorded with method, amount, date and note against an invoice.
- [ ] Invoice list clearly separates paid from outstanding; overdue invoices are identifiable.

### Reporting and Performance
- [ ] Dashboard shows active subscriptions, revenue, outstanding amounts, payments and overdue invoices with filters and a summary view.
- [ ] With thousands of subscriptions seeded, **every page responds in under 2 seconds** (verified via load test, p95).

---

## 14. Assumptions, Gaps and Open Questions

| # | Topic | Question / Proposed default |
|---|---|---|
| 1 | Tech stack | Not specified. Proposed in §10 |
| 2 | Password rule wording | "More than eight characters" interpreted as ≥ 9 |
| 3 | Special characters | Which characters count as "special"? Default: any non-alphanumeric |
| 4 | Reset-link expiry | Default 30–60 minutes, single use |
| 5 | Product types | Enumerated list not given; default: Service, Software, Add-on |
| 6 | Variant model | Brief shows brand with fixed extra price; default: generic attribute/value with extra price |
| 7 | Plan "renew" semantics | New term from expiry with same lines, or new subscription? Default: extends the same subscription by one term |
| 8 | Pause behaviour | Does billing stop while paused? Default: yes, with no invoices generated |
| 9 | Customer portal permissions | Which actions may customers perform? Default: those permitted by plan flags |
| 10 | Internal user permissions | Exact limits are not defined; defaults in §4.2 |
| 11 | Discount stacking | Multiple discounts on one line? Default: best-single or admin-defined priority |
| 12 | Usage limit definition | Per customer, or global? Default: global, with optional per-customer extension |
| 13 | Minimum purchase vs quantity | Both must be met if both are set (AND) |
| 14 | Partial payments | Allowed by default |
| 15 | Currency | Single currency assumed; multi-currency out of scope |
| 16 | Proration | Mid-cycle changes not mentioned; out of scope by default |
| 17 | Payment gateway | Brief implies manual recording; online gateway optional |
| 18 | Credit notes / refunds | Not mentioned; out of scope by default |
| 19 | Invoice numbering | Sequential, gap-free per year by default |
| 20 | Overdue definition | Due date passed and balance > 0 |
| 21 | Tax rules model | Rate per product/type; compound/inclusive taxes out of scope unless required |

---

## 15. Suggested Delivery Phases

| Phase | Scope | Outcome |
|---|---|---|
| **1. Foundation** | Auth, password policy, reset flow, roles/RBAC, admin staff creation | Secure access |
| **2. Catalog** | Products, variants, plans, taxes, discounts | Admin can launch a plan |
| **3. Subscriptions** | Quotation templates, subscriptions, lines, status workflow | Quote-to-active flow |
| **4. Billing** | Invoice generation, billing run, tax/discount application, confirm/cancel/send/print | Hands-free billing day |
| **5. Payments** | Payment recording, paid/outstanding views, overdue flagging | Reconciliation in-system |
| **6. Portal** | Customer self-service for subscriptions and invoices | Fewer support emails |
| **7. Reporting and Hardening** | Dashboard, filters, exports, performance tuning, audit logs, load tests | Finance visibility under 2s |

---

*End of document.*
