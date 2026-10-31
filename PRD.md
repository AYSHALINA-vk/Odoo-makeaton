# Product Requirements Document (PRD)

## Subscription Management System for Brightloop Software

| | |
|---|---|
| **Document status** | Draft v1.0 |
| **Product** | Subscription Management System (SMS) |
| **Customer / Stakeholder** | Brightloop Software |
| **Source** | Subscription_Management_System.pdf (challenge brief) |
| **Companion document** | DETAILS.md (detailed functional specification) |
| **Last updated** | October 31, 2026 |

> **Note on assumptions:** Items marked **[Assumption]** are not stated in the brief. They are proposed defaults and should be confirmed with stakeholders (see §15).

---

## 1. Overview

### 1.1 Product vision
One unified platform that runs the full life of a subscription business: setting up products and plans, creating subscriptions, generating invoices automatically, collecting and matching payments, and reporting revenue in one place.

### 1.2 Problem statement
Brightloop Software sells entirely on subscription (monthly and yearly software, switchable add-ons, and variant products), but runs operations on manual processes:

| Area | Today | Consequence |
|---|---|---|
| Customer subscriptions | Spreadsheet | No single source of truth |
| Renewals | Remembered by whoever notices first | Missed renewals, lost revenue |
| Invoices | Typed by hand every month | Wrong invoices, wasted effort |
| Payments | Matched by scrolling bank statements | Slow, error-prone reconciliation |
| Revenue reports | Built manually each quarter | Nobody can say what recurring revenue is |

### 1.3 Proposed solution
A role-based web platform with three experiences:

1. **Admin console:** configure products, plans, taxes, discounts and staff.
2. **Staff workspace:** manage customers, quotations, subscriptions, invoices and payments daily.
3. **Customer portal:** customers view and manage their own subscriptions and invoices without emailing anyone.

Backed by an automated billing engine and a finance dashboard.

---

## 2. Goals and Non-Goals

### 2.1 Goals

| ID | Goal | Success signal |
|---|---|---|
| G1 | Replace spreadsheet tracking with a single system of record | 100% of subscriptions managed in-app, each with a visible status |
| G2 | Eliminate manual invoice creation | Invoices auto-generated with customer, lines, taxes and totals pre-filled |
| G3 | Guarantee no invoice is billed twice or skipped | Zero duplicate or missed invoices per billing period |
| G4 | Automate taxes and discounts | Applied from admin rules with no manual entry |
| G5 | Make payment reconciliation instant | Every payment recorded against an invoice; paid vs outstanding visible at any time |
| G6 | Give finance one-stop visibility | Active subscriptions, revenue, payments, overdue invoices on one dashboard |
| G7 | Enable customer self-service | Customers manage own subscriptions through the portal |
| G8 | Stay fast at scale | All pages respond in under 2 seconds with thousands of subscriptions |

### 2.2 Non-goals (out of scope for v1)

- Multi-currency and multi-entity accounting
- Proration for mid-cycle plan changes
- Credit notes and refunds
- Full accounting/general-ledger features
- Usage-based (metered) billing
- Native mobile apps (responsive web only)
- Third-party integrations such as CRM, ERP, tax filing **[Assumption]**

---

## 3. Users and Personas

| Persona | Role | Needs | Pain today |
|---|---|---|---|
| **Asha, Admin** | System owner | Configure catalog, taxes, discounts; add staff; keep control | Rules live in people's heads |
| **Ravi, Sales Rep** (Internal User) | Prepares offers | Build quotes fast from templates; see subscription status | Builds each offer from scratch |
| **Meera, Billing/Support Staff** (Internal User) | Runs billing day, records payments | Bulk invoices, confirm/send/print, record and match payments, chase overdue | Typing invoices, scrolling bank statements |
| **Nikhil, Finance Lead** | Reviews numbers | One view of active subs, revenue, outstanding, overdue | Reports take days |
| **Priya, Customer** (small shop, monthly plan) or **Large company contact** (yearly contract) | Pays and manages own subscription | See subscriptions and invoices, renew/pause/close without email | Has to email Brightloop for everything |

*Persona names are illustrative.*

---

## 4. User Stories

### 4.1 Accounts and access

| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-01 | Customer | Sign up with email and password | I can access my portal | P0 |
| US-02 | Customer | Be blocked from reusing an email already registered | Each email maps to one account | P0 |
| US-03 | Customer | Be required to create a strong password (more than 8 chars, upper, lower, special) | My account is secure | P0 |
| US-04 | Any user | Receive a reset link at my registered email | I can recover access | P0 |
| US-05 | Admin | Be the only one who can add staff members | Access stays controlled | P0 |
| US-06 | Any user | See only what my role allows | Data stays protected | P0 |

### 4.2 Catalog

| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-10 | Admin | Add a product with name, type, sales price, cost price and notes | The catalog is complete | P0 |
| US-11 | Admin | Offer variants (e.g. brand) with extra prices (Odoo adds 560) | Variant pricing is automatic | P0 |
| US-12 | Admin | Create plans with price, billing period (daily/weekly/monthly/yearly), minimum quantity, availability dates | I can sell recurring offers | P0 |
| US-13 | Admin | Decide per plan whether it auto-closes, can be closed early, paused or renewed | Plans behave as the business intends | P0 |
| US-14 | Admin | Configure tax rules | Taxes compute automatically | P0 |

### 4.3 Quotes and subscriptions

| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-20 | Sales rep | Start a quote from a template with plan and lines prefilled and a validity period | I don't build offers from scratch | P0 |
| US-21 | Sales rep | Create a subscription with number, customer, plan, start/expiry date, payment terms and lines | The deal is captured accurately | P0 |
| US-22 | Any team member | See whether a subscription is Draft, Quotation, Confirmed, Active or Closed | We always know where it stands | P0 |
| US-23 | Staff | See upcoming renewals | No renewal is missed | P1 |

### 4.4 Billing and discounts

| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-30 | Billing staff | Have invoices generated automatically from due subscriptions | Nobody types invoices | P0 |
| US-31 | Billing staff | Be certain nothing is billed twice or skipped | Billing is trustworthy | P0 |
| US-32 | Billing staff | Confirm, cancel, send or print any invoice | I control invoice delivery | P0 |
| US-33 | Billing staff | See invoice status Draft → Confirmed → Paid | I know where each stands | P0 |
| US-34 | Admin | Create discounts (fixed or percentage) with minimum purchase/quantity, dates and usage limit | I can reward volume | P0 |
| US-35 | Admin | Apply a discount to specific products or whole subscriptions | Discounts target the right items | P0 |
| US-36 | Billing staff | Have eligible discounts appear on the next invoice automatically and stop at expiry or usage limit | Nobody must remember | P0 |

### 4.5 Payments and reporting

| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-40 | Billing staff | Record a payment with method, amount, date and note against an invoice | Reconciliation is in-system | P0 |
| US-41 | Staff | See which invoices are paid and which are outstanding | I can chase unpaid ones | P0 |
| US-42 | Finance lead | See active subscriptions, revenue, outstanding amounts, payments and overdue invoices in one place | I can answer month-end questions in minutes | P0 |
| US-43 | Finance lead | Filter and view a summary | I can slice by period, customer, plan | P1 |
| US-44 | Finance lead | See MRR/ARR **[Assumption]** | Recurring revenue is known | P1 |
| US-45 | Finance lead | Export reports **[Assumption]** | I can share outside the app | P2 |

### 4.6 Customer portal

| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-50 | Customer | See only my own subscriptions and invoices | I have clarity and privacy | P0 |
| US-51 | Customer | Manage my subscription (pause, close, renew where the plan allows) | I don't need to email anyone | P1 |
| US-52 | Customer | Download invoices and see payment status | I can handle my own records | P1 |

*Priority key: **P0** = must-have for MVP, **P1** = should-have, **P2** = nice-to-have.*

---

## 5. Product Scope

### 5.1 Feature areas

| # | Feature area | Summary | Priority |
|---|---|---|---|
| F1 | Authentication and RBAC | Sign-up, login, password policy, reset, three roles | P0 |
| F2 | Product and variant management | Products, cost/sales price, variant extras | P0 |
| F3 | Plan management | Billing period, min quantity, availability, plan behaviour flags | P0 |
| F4 | Tax management | Admin-defined rules, automatic calculation | P0 |
| F5 | Discount management | Admin-only rules, auto-application, expiry/limit | P0 |
| F6 | Quotation templates | Reusable plan and product lines with validity days | P0 |
| F7 | Subscription management | Numbering, lines, status workflow, plan actions | P0 |
| F8 | Billing engine | Bulk, idempotent invoice generation | P0 |
| F9 | Invoice management | Confirm, cancel, send, print, status flow | P0 |
| F10 | Payment management | Record, link to invoice, paid/outstanding views | P0 |
| F11 | Customer portal | Self-service view and manage | P0/P1 |
| F12 | Reporting dashboard | KPIs, filters, summary view | P0 |
| F13 | Notifications | Reset email, invoice email, renewal and overdue reminders | P1 |
| F14 | Audit log | Track key changes **[Assumption]** | P1 |

### 5.2 MVP definition
The MVP is complete when a customer can sign up, an admin can configure a plan, staff can create a subscription from a template, a billing run generates correct invoices with tax and discounts, payments are recorded against them, and the finance lead can see the resulting numbers, all within the performance target.

---

## 6. Functional Requirements

*Full field-level detail is in **DETAILS.md**. The key requirements follow.*

### 6.1 Authentication and access control
- **REQ-AUTH-1:** Email is unique per account.
- **REQ-AUTH-2:** Password must be longer than 8 characters and include an uppercase letter, a lowercase letter and a special character.
- **REQ-AUTH-3:** Password reset link is sent to the registered email. **[Assumption]** Link is single-use and expires.
- **REQ-AUTH-4:** Roles: Admin (full), Internal User (limited), Customer (own data only).
- **REQ-AUTH-5:** Only Admin can create staff accounts.
- **REQ-AUTH-6:** Authorisation is enforced server-side.

### 6.2 Catalog
- **REQ-CAT-1:** Product fields: name, type, sales price, cost price, notes.
- **REQ-CAT-2:** Variants add an extra price (e.g. Odoo brand +560).
- **REQ-CAT-3:** Plan fields: name, price, billing period (daily, weekly, monthly, yearly), minimum quantity, available-from and available-to dates.
- **REQ-CAT-4:** Per-plan flags: auto-close, closable, pausable, renewable.
- **REQ-CAT-5:** Subscription quantity must be at least the plan minimum.

### 6.3 Quotes and subscriptions
- **REQ-SUB-1:** Quotation templates hold a plan, product lines and a validity period in days.
- **REQ-SUB-2:** Each subscription has a unique number, customer, plan, start date, expiry date and payment terms.
- **REQ-SUB-3:** Lines show product, quantity, unit price, taxes and amount.
- **REQ-SUB-4:** Status flow: Draft → Quotation → Confirmed → Active → Closed, visible to the whole team.

### 6.4 Billing and invoicing
- **REQ-BILL-1:** Invoices are generated from subscriptions with customer details, lines, taxes and totals prefilled.
- **REQ-BILL-2:** A billing run processes all due subscriptions in bulk.
- **REQ-BILL-3:** Billing is idempotent: one invoice per subscription per period; never duplicated, never skipped; failures are reported and retryable.
- **REQ-BILL-4:** Staff can confirm, cancel, send or print any invoice.
- **REQ-BILL-5:** Invoice status flow: Draft → Confirmed → Paid.
- **REQ-BILL-6:** Taxes are calculated automatically from admin rules.

### 6.5 Discounts
- **REQ-DISC-1:** Only Admin can create discounts.
- **REQ-DISC-2:** Types: fixed amount or percentage; optional minimum purchase and minimum quantity; start and end dates; usage limit.
- **REQ-DISC-3:** Scope: specific products or whole subscriptions.
- **REQ-DISC-4:** Eligible discounts appear on the next invoice automatically and stop on expiry or when the usage limit is reached.

### 6.6 Payments
- **REQ-PAY-1:** Record method, amount, date and note against the correct invoice.
- **REQ-PAY-2:** Paid and outstanding invoices are visible at all times.
- **REQ-PAY-3:** Overdue invoices are identifiable for follow-up.

### 6.7 Reporting
- **REQ-REP-1:** Single view of active subscriptions, revenue, payments and overdue invoices.
- **REQ-REP-2:** Filters and a summary view.
- **REQ-REP-3:** Every page responds in under 2 seconds with thousands of subscriptions.

---

## 7. Key User Flows

### 7.1 Onboarding
`Visit site → Sign up (email + compliant password) → Account created as Customer → Log in → Portal home`
Forgot password: `Request reset → Email with link → Set new password → Log in`

### 7.2 Launch a plan (Admin)
`Create product (+ variants) → Create plan (price, period, min qty, dates, behaviour flags) → Plan available for sale`

### 7.3 Quote to subscription (Sales rep)
`Pick quotation template → Adjust lines/customer → Send as Quotation → Customer accepts → Confirmed → Start date reached → Active`

### 7.4 Billing day (Billing staff)
`Billing run triggered (scheduled or manual) → System finds due subscriptions → Generates invoices (taxes + discounts applied) → Review → Confirm → Send / Print`

### 7.5 Payment collection
`Payment arrives → Record method, amount, date, note → Link to invoice → Invoice becomes Paid → Outstanding list updates`

### 7.6 Month-end review (Finance lead)
`Open dashboard → See active subs, revenue, outstanding, overdue → Filter by period/customer → Drill into overdue invoices`

---

## 8. Business Rules (summary)

1. One account per email.
2. Effective price = product sales price + variant extra.
3. Quantity ≥ plan minimum; plan sellable only within its dates.
4. Plan actions (auto-close, early close, pause, renew) follow the plan's flags.
5. One invoice per subscription per billing period.
6. Confirmed invoices are immutable; corrections via cancel and re-issue.
7. A discount applies only if within dates, thresholds are met and usage count is below the limit.
8. Line amount = (quantity × unit price − discount) + tax.
9. Invoice is Paid only when payments cover the total.
10. Overdue = past due date with a balance remaining.

---

## 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Every page under 2 seconds with thousands of subscriptions (pagination, indexing, caching or pre-aggregated metrics) |
| **Scalability** | Hundreds of simultaneous due subscriptions handled by background billing jobs |
| **Reliability** | Transactional, idempotent billing; safe retries |
| **Security** | Hashed passwords, HTTPS, server-side RBAC, rate-limited login/reset, protection against common web attacks |
| **Auditability** | Log status changes, billing runs, payments, discount use, admin actions |
| **Usability** | Clear status badges, helpful validation, responsive portal |
| **Data accuracy** | Decimal money handling; invoice tax/discount snapshots |
| **Maintainability** | Modular design; automated tests for billing, tax and discount logic |

---

## 10. Success Metrics

| Metric | Baseline (today) | Target |
|---|---|---|
| Time to produce monthly invoices | Manual, hours to days | Minutes via billing run |
| Invoice error rate | Frequent | Near zero (system-generated) |
| Duplicate or missed invoices | Occasional | 0 |
| Missed renewals | Frequent | 0 unnoticed (all surfaced) |
| Time to answer "how many active, how much owed, which overdue" | Days | Under 2 minutes |
| Page response time | n/a | Under 2 seconds (p95) |
| Payment-to-invoice matching effort | Manual statement review | Recorded at entry, no statement scrolling |
| Customer support emails for subscription changes | High | Reduced through self-service (target to be set) |
| Quote creation time | From scratch | Reduced via templates |

---

## 11. Data Overview

Core entities: User, Customer, Product, ProductVariant, Plan, QuotationTemplate (+ Lines), Subscription (+ Lines), PaymentTerm, Tax, Discount, Invoice (+ Lines), Payment, BillingRun, AuditLog.

Key integrity constraints:
- Unique email; unique subscription number; unique invoice number
- Unique invoice per (subscription, billing period)
- Money stored as fixed-precision decimals
- Indexes on subscription status/next billing date and invoice status/due date for performance

*Full schema outline in DETAILS.md §7.*

---

## 12. Assumptions, Dependencies and Constraints

### 12.1 Assumptions
- Single currency and single company.
- Payments are recorded manually by staff (no mandatory payment gateway in v1).
- Invoice emails and password resets rely on an email provider.
- Internal users have limited permissions (exact scope to be confirmed).

### 12.2 Dependencies
- Email delivery service (reset links, invoices, reminders)
- Scheduler/background job runner (billing run, reminders, auto-close)
- PDF generation for invoices
- Relational database

### 12.3 Constraints
- Performance target of under 2 seconds per page is a hard requirement.
- Only Admin may create staff and discounts.
- Billing must be exactly-once.

---

## 13. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Duplicate or skipped invoices during bulk billing | High | Medium | Unique period constraint, idempotent jobs, run audit log, retry |
| Dashboard slow with thousands of subscriptions | High | Medium | Indexes, pagination, cached or materialised aggregates, load testing |
| Discount over-use under concurrent billing | Medium | Medium | Atomic usage counter increments |
| Tax or discount logic errors | High | Medium | Unit tests on calculation rules, invoice snapshots |
| Ambiguous requirements (pause, renew, stacking) | Medium | High | Confirm open questions early (§15) |
| Privilege escalation or data leaks between customers | High | Low | Server-side RBAC, row-level scoping, security tests |
| Data migration from spreadsheets | Medium | Medium | Import tool and validation, parallel run |
| Staff adoption | Medium | Medium | Simple UI, training, phased rollout |

---

## 14. Release Plan

| Phase | Scope | Exit criteria |
|---|---|---|
| **Phase 1: Foundation** | Auth, password policy, reset, RBAC, staff creation | Roles enforced; security tests pass |
| **Phase 2: Catalog** | Products, variants, plans, taxes, discounts | Admin can launch a plan end-to-end |
| **Phase 3: Subscriptions** | Templates, subscriptions, status workflow | Quote-to-active flow works |
| **Phase 4: Billing** | Billing engine, invoices, tax and discount application | Repeat runs create no duplicates; totals verified |
| **Phase 5: Payments** | Record and link payments, paid/outstanding/overdue views | Reconciliation entirely in-app |
| **Phase 6: Portal** | Customer self-service | Customers see only own data |
| **Phase 7: Reporting and hardening** | Dashboard, filters, exports, audit, load tests | All pages under 2 seconds at target data volume |

**Rollout suggestion:** migrate existing subscriptions from the spreadsheet, run one billing cycle in parallel with the manual process, compare results, then cut over.

---

## 15. Open Questions

| # | Question | Proposed default | Owner |
|---|---|---|---|
| 1 | What exactly can Internal Users do versus Admin? | Staff manage customers, subscriptions, invoices, payments; Admin owns catalog, tax, discounts, users | Admin / Product |
| 2 | What does "renew" do: extend the same subscription or create a new one? | Extend the same subscription by one term | Product |
| 3 | Does billing stop while a subscription is paused? | Yes | Finance |
| 4 | Which actions can customers do in the portal? | Those allowed by the plan's flags | Product |
| 5 | Can discounts stack? | One discount per line (best or highest priority) | Admin / Finance |
| 6 | Is the discount usage limit global or per customer? | Global | Admin |
| 7 | Are partial payments allowed? | Yes | Finance |
| 8 | Which payment methods and payment terms are needed? | Configurable lists | Finance |
| 9 | Is online payment required in the portal? | No for v1 | Product |
| 10 | Is a tax per product, per customer region, or both? | Per product/type | Finance |
| 11 | What reminders are required (renewal, overdue)? | Email reminders configurable by admin | Product |
| 12 | Is a data migration from the spreadsheet in scope? | Yes, one-time import | Product |
| 13 | Which tech stack and hosting? | To be decided | Engineering |

---

## 16. Glossary

| Term | Meaning |
|---|---|
| **Plan** | Defines price, billing frequency, minimum quantity and availability window |
| **Subscription** | Agreement between a customer and Brightloop for a plan, with product lines |
| **Quotation template** | Reusable offer with plan, product lines and validity period |
| **Variant** | A product option (e.g. brand) that adds to the base price |
| **Billing run** | Process that generates invoices for all due subscriptions |
| **MRR / ARR** | Monthly / Annual Recurring Revenue |
| **Overdue** | Invoice past its due date with an unpaid balance |
| **Idempotent** | Safe to run repeatedly without creating duplicates |

---

*End of PRD.*
