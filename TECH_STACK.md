# Tech Stack Document

## Subscription Management System: Next.js + Supabase

| | |
|---|---|
| **Document status** | Draft v1.0 |
| **Project** | Subscription Management System for Brightloop Software |
| **Related docs** | PRD.md, DETAILS.md |
| **Last updated** | October 31, 2026 |

> Items marked **[Assumption]** are proposed defaults, not requirements from the brief.

---

## 1. Summary

The system is built with **Next.js (App Router, TypeScript)** on the frontend and **Supabase** as the backend platform (Postgres, Auth, Row Level Security, pg_cron, Edge Functions, Storage). Business-critical logic such as billing runs, tax and discount calculation, and payment reconciliation lives **inside Postgres** so it is transactional and enforceable by constraints.

### Why this stack

| Requirement from the brief | How the stack delivers it |
|---|---|
| Unique email per account | Supabase Auth |
| Strong password rule | Auth password settings plus client-side validation |
| Password reset by email | Built-in reset flow |
| Admin / Staff / Customer roles | `profiles.role` plus RLS policies |
| Customers see only their own data | Row Level Security |
| Only admin adds staff and creates discounts | Edge Function and admin-only RLS policies |
| Nothing billed twice or skipped | Unique constraint plus idempotent SQL function |
| Hundreds of invoices on billing day | pg_cron plus a bulk Postgres function |
| Automatic taxes and discounts | Postgres functions and triggers |
| Every page under 2 seconds | Indexes, materialized views, RPC aggregates, server-side pagination |
| Fast build, small team | One platform instead of a separate backend |

---

## 2. Technology Overview

| Layer | Technology | Version guidance |
|---|---|---|
| Framework | **Next.js** (App Router) | Current stable major |
| Language | **TypeScript** | Strict mode on |
| UI library | **React** | Matches Next.js |
| Styling | **Tailwind CSS** | v3 or v4 |
| Components | **shadcn/ui** (Radix UI primitives) | Latest |
| Icons | **lucide-react** | Latest |
| Forms | **React Hook Form** + **Zod** | Latest |
| Server state | **TanStack Query** | v5 |
| Tables | **TanStack Table** | v8 |
| Charts | **Recharts** | Latest |
| Dates | **date-fns** | Latest |
| Backend platform | **Supabase** | Hosted project |
| Database | **PostgreSQL** (via Supabase) | Managed |
| Auth | **Supabase Auth** | Email and password |
| Authorization | **Postgres RLS** | Policy per table |
| Scheduling | **pg_cron** | Supabase extension |
| Serverless | **Supabase Edge Functions** (Deno) | Latest |
| Email | **Resend** (via Edge Function or custom SMTP) | **[Assumption]** |
| File storage | **Supabase Storage** | Optional for PDFs |
| PDF | **@react-pdf/renderer** or print stylesheet | **[Assumption]** |
| Testing | **Vitest**, **Playwright**, **pgTAP**, **k6** | Latest |
| Hosting (web) | **Vercel** | Free or Pro |
| CI/CD | **GitHub Actions** | |
| Monitoring | **Sentry**, Supabase logs | |

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      Next.js App (Vercel)                   │
│  /admin     /staff      /portal      /login /reset          │
│  Server Components · Route Handlers · Middleware (role gate)│
└───────────────┬────────────────────────────────────────────┘
                │ @supabase/ssr  (cookie session)
                ▼
┌────────────────────────── Supabase ────────────────────────┐
│ Auth        signup · login · reset · JWT                    │
│ Postgres    tables · constraints · indexes · RLS            │
│   ├─ Functions (RPC): billing, tax, discounts, payments     │
│   ├─ Triggers: status sync, usage count, audit log          │
│   └─ Views / Materialized views: dashboard aggregates       │
│ pg_cron     daily billing · auto-close · overdue · refresh  │
│ Edge Funcs  create-staff · send-email · invoice-pdf (opt.)  │
│ Storage     invoice PDFs (optional)                         │
└─────────────────────────────────────────────────────────────┘
                │
                ▼
          Resend (email)
```

### 3.1 Request flow principles

1. **Browser** talks to Next.js. Pages are mostly **Server Components** that query Supabase with the user's session, so RLS applies.
2. **Mutations** go through **Server Actions** or Route Handlers that call Supabase RPC functions for multi-step operations.
3. **Privileged operations** (creating staff users) go through an **Edge Function** that verifies the caller is admin, then uses the service role key server-side only.
4. **Scheduled work** runs inside Supabase via **pg_cron**, calling SQL functions directly.

---

## 4. Frontend (Next.js)

### 4.1 Application structure

```
/app
  /(auth)
    /login
    /signup
    /forgot-password
    /reset-password
  /(admin)/admin
    /products  /plans  /taxes  /discounts  /staff  /templates
  /(staff)/staff
    /customers  /subscriptions  /invoices  /payments  /billing-runs
  /(finance)/dashboard
  /(portal)/portal
    /subscriptions  /invoices  /profile
  /api
    /billing/run        (manual trigger, admin/staff)
    /invoices/[id]/pdf
/components      shared UI, tables, forms, status badges
/lib
  /supabase      browser, server, middleware clients
  /validators    Zod schemas (password, subscription, discount, ...)
  /utils         money, dates, formatters
/middleware.ts   session refresh + role-based route protection
```

### 4.2 Key frontend decisions

| Concern | Decision |
|---|---|
| Routing and access | Route groups per role; `middleware.ts` checks session and role, redirects unauthorized users |
| Data fetching | Server Components for lists and detail pages; TanStack Query for interactive tables and filters |
| Pagination | **Server-side pagination** (limit/offset or keyset) on all lists to meet the 2-second target |
| Forms | React Hook Form + Zod; the same Zod schema validates on client and in Server Actions |
| Password UX | Live checklist for length (more than 8), uppercase, lowercase, special character |
| Status display | Reusable `StatusBadge` for Draft / Quotation / Confirmed / Active / Closed and invoice states |
| Money | Handle as integers (minor units) or decimal strings; never JS floats for calculations |
| Loading states | Suspense boundaries and skeletons for dashboard cards |
| Accessibility | Radix primitives via shadcn/ui; keyboard navigable tables and forms |

### 4.3 Supabase client setup

| Client | Package | Use |
|---|---|---|
| Browser client | `@supabase/ssr` `createBrowserClient` | Client components |
| Server client | `@supabase/ssr` `createServerClient` | Server Components, Actions, Route Handlers |
| Middleware client | `@supabase/ssr` | Refresh session, gate routes |
| Service role client | `@supabase/supabase-js` | **Only** in Edge Functions or server-only code; never exposed to the browser |

Generate types with `supabase gen types typescript` and import them across the app.

---

## 5. Backend (Supabase)

### 5.1 Authentication

| Requirement | Implementation |
|---|---|
| One account per email | Supabase Auth enforces unique email |
| Password more than 8 characters, upper, lower, special | Auth settings: minimum length 9, require lowercase, uppercase, symbols; mirrored by Zod on the client and server |
| Reset link by email | `resetPasswordForEmail` with redirect to `/reset-password` |
| Roles | `profiles` table (`id` references `auth.users`, `role`: `admin` \| `staff` \| `customer`) |
| Sign-up creates customers only | Trigger on `auth.users` insert creates a `profiles` row with `role = 'customer'` and a linked `customers` row |
| Staff creation (admin only) | Edge Function `create-staff`: verifies caller's role is admin, calls `auth.admin.createUser`, inserts profile with `role = 'staff'` |
| Role in JWT (optional) | Auth Hook adds `user_role` claim so RLS can avoid extra lookups |

### 5.2 Database (PostgreSQL)

Core tables (see DETAILS.md §7 for field-level detail):

`profiles`, `customers`, `products`, `product_variants`, `plans`, `quotation_templates`, `quotation_template_lines`, `payment_terms`, `taxes`, `discounts`, `discount_products`, `subscriptions`, `subscription_lines`, `invoices`, `invoice_lines`, `payments`, `billing_runs`, `audit_log`.

| Practice | Detail |
|---|---|
| Money | `numeric(12,2)` (never `float`) |
| Enums | Postgres enums for subscription status, invoice status, billing period, discount type, user role |
| Numbering | Sequences for `SUB-000001` and `INV-000001` style numbers |
| Timestamps | `created_at`, `updated_at` with a trigger |
| Soft delete | `is_active` or `archived_at` on products and plans referenced elsewhere |
| Migrations | SQL files in `supabase/migrations`, applied by the Supabase CLI |

**Critical constraints**

```sql
-- Exactly-once billing per period
ALTER TABLE invoices
  ADD CONSTRAINT uq_invoice_period
  UNIQUE (subscription_id, period_start, period_end);

-- Payments always belong to an invoice, amounts positive
ALTER TABLE payments
  ADD CONSTRAINT chk_payment_amount CHECK (amount > 0);

-- Discount usage never exceeds limit (enforced in function + check)
ALTER TABLE discounts
  ADD CONSTRAINT chk_usage CHECK (usage_limit IS NULL OR times_used <= usage_limit);
```

**Performance indexes**

| Index | Purpose |
|---|---|
| `subscriptions (status, next_billing_date)` | Find due subscriptions and active counts |
| `subscriptions (customer_id)` | Portal and customer lists |
| `invoices (status, due_date)` | Outstanding and overdue lists |
| `invoices (customer_id, invoice_date desc)` | Portal invoice history |
| `payments (invoice_id)`, `payments (payment_date)` | Reconciliation and revenue reports |
| `discounts (start_date, end_date)` | Eligibility lookup |

### 5.3 Row Level Security (RLS)

RLS is **enabled on every table**. Policy pattern:

| Table group | Admin | Staff | Customer |
|---|---|---|---|
| `products`, `plans`, `taxes`, `payment_terms` | Full | Read | Read (active only, if needed) |
| `discounts` | Full (**only** role that can insert/update) | Read | None |
| `quotation_templates` | Full | Full **[Assumption]** | None |
| `customers` | Full | Read/write | Own row only |
| `subscriptions`, `subscription_lines` | Full | Read/write | Read (and permitted actions) on own |
| `invoices`, `invoice_lines` | Full | Read/write | Read own |
| `payments` | Full | Insert/read | Read own |
| `profiles` | Full | Read | Own row |
| `audit_log`, `billing_runs` | Read/write | Read | None |

Example customer isolation policy:

```sql
CREATE POLICY "customer reads own invoices"
ON invoices FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);
```

Helper function `is_admin()` / `is_staff()` (security definer) keeps policies readable and fast.

### 5.4 Business logic in Postgres

| Function / trigger | Responsibility |
|---|---|
| `calculate_line_amount(...)` | Applies variant price, discount and tax to a line |
| `apply_discounts(subscription_id, date)` | Finds eligible discounts (dates, thresholds, scope, usage), returns amounts, increments `times_used` atomically |
| `generate_invoice(subscription_id, period_start, period_end)` | Creates invoice and lines with taxes and discounts; **idempotent** via the unique constraint (`ON CONFLICT DO NOTHING`) |
| `run_billing(run_date)` | Selects due active subscriptions, calls `generate_invoice` for each in a loop with per-item error capture, writes a `billing_runs` summary, advances `next_billing_date` |
| `confirm_invoice(id)` / `cancel_invoice(id)` | Validated state transitions; locks financial content after confirmation |
| `record_payment(invoice_id, method, amount, date, note)` | Inserts payment and updates invoice amount paid / status to Paid when covered |
| Trigger: payment insert | Recomputes invoice balance and status |
| Trigger: status change | Writes to `audit_log` |
| `close_expired_subscriptions()` | Auto-closes subscriptions on plans with auto-close when expiry passes |
| Trigger: line insert/update | Enforces quantity at least the plan minimum; plan availability dates |

Lock rows with `FOR UPDATE SKIP LOCKED` in `run_billing` so concurrent runs never double-process.

### 5.5 Scheduled jobs (pg_cron)

| Job | Schedule | Action |
|---|---|---|
| Daily billing run | Daily, early morning (configurable) | `SELECT run_billing(current_date)` |
| Auto-close expired plans | Daily | `SELECT close_expired_subscriptions()` |
| Renewal reminders | Daily | Insert notification rows for subscriptions expiring within N days **[Assumption]** |
| Overdue reminders | Daily | Queue reminder emails for newly overdue invoices **[Assumption]** |
| Refresh dashboard views | Every 5 to 15 minutes | `REFRESH MATERIALIZED VIEW CONCURRENTLY ...` |

### 5.6 Edge Functions

| Function | Purpose | Access |
|---|---|---|
| `create-staff` | Admin creates a staff account | Admin JWT required |
| `send-invoice-email` | Emails invoice (link or PDF) to customer via Resend | Admin/staff |
| `process-email-queue` | Drains a notifications table, sends reminders | Invoked by pg_cron via `pg_net` |
| `invoice-pdf` *(optional)* | Server-side PDF generation if needed | Admin/staff, customer for own |

### 5.7 Storage
Optional bucket `invoices` for generated PDFs, with storage policies matching invoice RLS (customers read only their own files).

---

## 6. Reporting and Performance

Target: **every page under 2 seconds with thousands of subscriptions** (p95).

| Technique | Where |
|---|---|
| Indexes on filter and sort columns | See §5.2 |
| Server-side pagination (default 25 to 50 rows) | All list pages |
| Materialized views for dashboard KPIs | `mv_dashboard_summary`, `mv_revenue_by_month`, `mv_overdue_invoices` |
| RPC functions returning aggregates in one round trip | `get_dashboard_summary(from, to, filters)` |
| Select only needed columns, avoid `select *` | All queries |
| Server Components and streaming | Dashboard cards load independently via Suspense |
| TanStack Query caching | Filter changes reuse cached data |
| Avoid N+1 | Use joins or views, not per-row queries |
| Region alignment | Deploy Vercel functions and Supabase in the same or nearby region |

**Dashboard metrics**

| Metric | Source |
|---|---|
| Active subscriptions | Count where `status = 'active'` |
| Revenue received | Sum of `payments.amount` in period |
| Amount owed | Sum of `invoices.total − amount_paid` for Confirmed invoices |
| Overdue invoices | Confirmed, balance > 0, `due_date < today` |
| MRR / ARR **[Assumption]** | Active subscription totals normalized to monthly |

---

## 7. Security

| Area | Measure |
|---|---|
| Secrets | Service role key only in Edge Functions or server environment variables; never prefixed `NEXT_PUBLIC_` |
| Authorization | RLS on all tables; Edge Functions re-verify role; middleware is a convenience layer, not the security boundary |
| Passwords | Handled by Supabase Auth (hashed); leaked-password protection enabled where available |
| Reset flow | Single-use, expiring links; generic responses that do not reveal whether an email exists |
| Input validation | Zod on client and in Server Actions; DB constraints as last line of defense |
| Rate limiting | Supabase Auth rate limits; additional limiting on Route Handlers (e.g. Upstash Ratelimit) **[Assumption]** |
| Web security | Next.js default escaping, CSP headers, secure cookies via `@supabase/ssr` |
| Auditing | `audit_log` via triggers for status changes, payments, discounts, staff creation |
| Backups | Supabase daily backups (Point-in-time recovery on paid plans) |
| Privilege testing | pgTAP and integration tests for RLS (customer cannot read other customers' data) |

---

## 8. Email and Notifications

| Email | Trigger | Delivery |
|---|---|---|
| Password reset | Forgot password | Supabase Auth through custom SMTP (Resend) |
| Staff invitation / welcome | Admin creates staff | Edge Function |
| Invoice sent | Staff clicks Send | Edge Function `send-invoice-email` |
| Renewal reminder | Expiry approaching | pg_cron → queue → Edge Function |
| Overdue reminder | Invoice becomes overdue | pg_cron → queue → Edge Function |

Supabase's default email service is rate-limited and meant for testing; configure **custom SMTP** before going live.

---

## 9. Invoice PDF and Print

| Option | Pros | Cons |
|---|---|---|
| **Print-optimized HTML page** (`/invoices/[id]/print`) with `window.print()` | Simplest, no dependencies | User-driven save-as-PDF |
| **@react-pdf/renderer** (client or Next.js Route Handler) | True PDF, consistent layout | Adds a dependency, layout code |
| Headless browser service | Pixel-perfect | Does not run well in Edge Functions; extra infrastructure |

**Recommendation:** start with the print-optimized page, add `@react-pdf/renderer` for the "send" attachment, and store generated PDFs in Supabase Storage.

---

## 10. Development Tooling

| Tool | Purpose |
|---|---|
| **pnpm** | Package manager |
| **Supabase CLI** | Local stack in Docker, migrations, type generation, seeding |
| **ESLint + Prettier** | Linting and formatting |
| **Husky + lint-staged** | Pre-commit checks |
| **Zod** | Single source of validation schemas |
| **dotenv / Vercel env** | Environment management |
| **Seed script** | Generates thousands of subscriptions and invoices for performance testing |

### Environments

| Environment | Frontend | Supabase |
|---|---|---|
| Local | `next dev` | Supabase CLI (Docker) |
| Staging | Vercel preview | Separate Supabase project |
| Production | Vercel production | Production Supabase project |

### Environment variables

| Variable | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server/Edge only** |
| `RESEND_API_KEY` | Server/Edge only |
| `NEXT_PUBLIC_APP_URL` | Public (used in email links) |

---

## 11. Testing Strategy

| Level | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Zod schemas (password rules), money and date utilities, formatters |
| Database | **pgTAP** via Supabase CLI | Tax and discount calculation, `generate_invoice` idempotency, `run_billing` double-run safety, discount usage limit, RLS isolation |
| Integration | Vitest + Supabase local | Server Actions and RPC flows |
| End-to-end | **Playwright** | Sign-up, reset, quote to subscription, billing run, payment, dashboard, portal isolation |
| Performance | **k6** or Artillery | p95 under 2 seconds on key pages with seeded data (e.g. 5,000+ subscriptions) |
| Security | Manual and automated checks | Role escalation attempts, cross-customer access, service-key exposure |

**Must-pass scenarios**

1. Run billing twice on the same date: **no duplicate invoices**.
2. Run billing with one failing subscription: others succeed, failure is logged and retryable.
3. Discount at its usage limit is **not** applied on the next invoice.
4. A customer cannot read another customer's subscriptions or invoices.
5. A staff user cannot create discounts or other staff.
6. Password of 8 characters or fewer, or missing a required character type, is rejected.

---

## 12. Deployment and CI/CD

```
Developer push → GitHub
   ├─ PR: lint · typecheck · unit · pgTAP · Playwright (against local Supabase)
   ├─ Preview deploy on Vercel (staging Supabase)
   └─ Merge to main:
        ├─ supabase db push (migrations) to production
        ├─ Deploy Edge Functions
        └─ Vercel production deploy
```

| Concern | Approach |
|---|---|
| Migrations | Versioned SQL; reviewed in PRs; never edited after merge |
| Edge Functions | Deployed with `supabase functions deploy` in CI |
| Rollbacks | Vercel instant rollback for frontend; forward-fix migrations for database |
| Monitoring | Sentry for frontend and Server Actions; Supabase logs and query performance for database |
| Alerts | Notify on failed billing run (`billing_runs.failed_count > 0`) |

---

## 13. Risks and Mitigations (Stack-Specific)

| Risk | Mitigation |
|---|---|
| Complex RLS policies cause data leaks or slow queries | pgTAP tests per role; use `is_admin()` helper; index columns used in policies |
| Billing logic in SQL is harder to debug | Keep functions small and composable; test with pgTAP; log per-subscription results |
| Long billing runs exceed function limits | Run billing as a Postgres function via pg_cron, or in batches |
| Built-in email limits | Custom SMTP (Resend) from day one |
| PDF generation in serverless | Use `@react-pdf/renderer` or print CSS rather than headless Chrome |
| Vendor lock-in | Supabase is open-source Postgres; schema and SQL functions are portable |
| Free-tier pausing and limits | Use a paid plan for production |
| Service role key leakage | Server/Edge only; secret scanning in CI |

---

## 14. Alternatives Considered

| Option | Why not chosen |
|---|---|
| React + NestJS + Postgres + BullMQ | More control, but more infrastructure and slower to build |
| Django + Celery | Strong admin, but splits the stack away from the JS frontend |
| Firebase | NoSQL is a poor fit for relational billing and exactly-once constraints |
| Prisma on Supabase Postgres | Possible, but bypasses RLS unless carefully configured; `supabase-js` keeps RLS in play |

---

## 15. Implementation Order

| Step | Deliverable |
|---|---|
| 1 | Project setup: Next.js, Tailwind, shadcn/ui, Supabase CLI, CI |
| 2 | Auth, `profiles`, role trigger, middleware gating, password rules, reset flow |
| 3 | Schema migrations for all tables, enums, constraints, indexes |
| 4 | RLS policies and `is_admin()` / `is_staff()` helpers, with pgTAP tests |
| 5 | Admin CRUD: products, variants, plans, taxes, discounts, staff (Edge Function) |
| 6 | Quotation templates and subscription workflow |
| 7 | Billing functions, discount and tax logic, `run_billing`, pg_cron schedule |
| 8 | Invoice screens: confirm, cancel, send, print |
| 9 | Payments and paid/outstanding/overdue views |
| 10 | Customer portal |
| 11 | Dashboard views, RPC aggregates, filters |
| 12 | Seed 5,000+ subscriptions, load test, tune indexes |
| 13 | Notifications, audit log, hardening, deployment |

---

## 16. Package List (Starter)

```
# Runtime
next react react-dom typescript
@supabase/supabase-js @supabase/ssr
@tanstack/react-query @tanstack/react-table
react-hook-form zod @hookform/resolvers
tailwindcss class-variance-authority clsx tailwind-merge
lucide-react recharts date-fns
@react-pdf/renderer

# Dev / test
vitest @playwright/test
eslint prettier husky lint-staged
supabase (CLI)
```

---

*End of document.*
