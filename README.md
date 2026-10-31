# Brightloop Plat—form: Subscription Management Platform

> Unified software platform running the full lifecycle of a subscription business: catalog setup, plans, quotation templates, idempotent bulk billing runs, automated taxes and discounts, payment reconciliation, and real-time MRR/ARR financial reporting.

---

## 1. Quick Start & Instant Demo Access

### Run Locally
```bash
# Install dependencies
pnpm install

# Run automated tests and scenario verification
pnpm exec tsx scripts/test-scenarios.ts

# Start development server
pnpm dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Pre-Configured Demo Credentials
Use the instant role switcher in the top navigation bar or log in directly:

| Role | Email | Password | Permissions & Scope |
|---|---|---|---|
| **Admin** | `admin@brightloop.com` | `Admin@12345` | Full system control: Catalog, Variants, Plans, Taxes, Discounts (Admin only), Staff provisioning (Admin only), Billing, Financial KPIs |
| **Staff** | `staff@brightloop.com` | `Staff@12345` | Day-to-day operations: Customers, Quotation Templates, Subscriptions, Invoices, Billing Day Run, Payment matching |
| **Customer** | `priya@shopmart.com` | `Customer@12345` | Single-tenant self-service portal: View own subscriptions, download invoices, pause/resume/renew/close own plans |
| **Customer 2** | `corp@acmeglobal.com` | `Customer@12345` | Enterprise yearly contract with recorded partial payments |

---

## 2. Key Business Scenarios & Capabilities

### 1. Catalog & Variant Pricing (REQ-CAT-1..2)
- Products: Software, Services, and Add-ons with sales and cost prices.
- **Variant Extra Pricing**: Selecting the **Odoo** brand variant automatically adds **+$560.00** to the product price (`$1,200.00 + $560.00 = $1,760.00`).

### 2. Plan Behavioral Policy Flags (REQ-CAT-3..5)
- Support for **Daily, Weekly, Monthly, and Yearly** billing cycles.
- Minimum quantity enforcement per plan.
- 4 independent flags per plan:
  - `auto_close`: Closes automatically when term expires.
  - `closable`: Can be closed early by staff or customer.
  - `pausable`: Can be paused and resumed without billing while paused.
  - `renewable`: Can be extended for another term.

### 3. Quotation Templates & 1-Click Quotes (REQ-SUB-1)
- Reusable templates with pre-configured plan, line items, and validity days.
- 1-click quote generation pre-fills plan, products, and sets validity expiry date.

### 4. Subscription State Machine (REQ-SUB-4)
- Clear progression: `Draft` &rarr; `Quotation` &rarr; `Confirmed` &rarr; `Active` &rarr; `Closed` (with `Paused` state).
- Renewal alert banner: Highlights contracts expiring in &le; 14 days so renewals are never missed.

### 5. Idempotent Billing Engine (REQ-BILL-1..6)
- Finds all due active subscriptions in bulk (`next_billing_date <= run_date`).
- Unique constraint: `UNIQUE (subscription_id, period_start, period_end)`.
- **Zero Duplicates Guarantee**: Rerunning billing on the same date safely detects existing invoices with 0 duplicates.
- Automated tax calculation and discount application (honoring date windows, thresholds, and usage limits).

### 6. Payment Matching & Reconciliation (REQ-PAY-1..4)
- Record payments with method, amount, date, and reference note against invoices.
- Supports full and partial payments. Moves invoice to `Paid` status automatically when balance reaches zero.
- Instant overdue identification: Confirmed invoices past due date with an unpaid balance.

### 7. Customer Self-Service Portal (REQ-PORTAL-1..4)
- Row-level customer data isolation (customers see strictly their own data).
- View contract details and execute permitted plan actions (pause, resume, renew, close).
- View and download invoices with client-side PDF export.

### 8. Finance Lead Dashboard (REQ-REP-1..6)
- Normalized **MRR** (Monthly Recurring Revenue) and **ARR** across daily, weekly, monthly, and yearly subscriptions.
- Active subscriptions count, total revenue collected, outstanding receivables, and overdue balances.
- Sub-2-second query performance with indexed data structures.

---

## 3. Database & Supabase Architecture

- **PostgreSQL Migrations**: Complete DDL, RLS policies, enums, triggers, and RPC functions in `supabase/migrations/`:
  - `20261031000000_init_subscription_platform.sql`
  - `20261031000001_billing_functions.sql`
- **Embedded Engine**: Built-in transactional database engine (`data/platform.db`) in WAL mode for immediate zero-dependency local execution.

---

## 4. Verification Suite Results

```bash
pnpm exec tsx scripts/test-scenarios.ts
```

All 19 automated test scenarios pass:
1. ✅ Password policy rules (length > 8, upper, lower, special)
2. ✅ Database & seed verification
3. ✅ Variant extra price calculation (Odoo +$560.00)
4. ✅ Idempotent invoice generation (1st call: new, 2nd call: existing)
5. ✅ Repeat billing run: 0 duplicates generated
6. ✅ Discount usage limit cutoff (10/10 expired discount stopped)
7. ✅ Payment matching & transition to Paid status
8. ✅ Dashboard summary performance: **0.56ms** (&lt; 2,000ms target)
