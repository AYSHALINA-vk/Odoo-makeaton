-- ============================================================================
-- BRIGHTLOOP PLAT-FORM: COMPLETE SUPABASE SETUP SCRIPT (ALL-IN-ONE)
-- Run this in your Supabase Project -> SQL Editor -> Click "Run"
-- ============================================================================

-- PART 1: ENUMS & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'staff', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('software', 'service', 'add-on');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE billing_period_enum AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status_enum AS ENUM ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status_enum AS ENUM ('draft', 'confirmed', 'paid', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discount_type_enum AS ENUM ('fixed', 'percentage');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discount_scope_enum AS ENUM ('subscription', 'product');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PART 2: CORE TABLES & CONSTRAINTS

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT ('CUST-' || substr(md5(random()::text), 1, 8)),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    billing_address TEXT,
    tax_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT ('PROD-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    type product_type NOT NULL DEFAULT 'software',
    sales_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY DEFAULT ('VAR-' || substr(md5(random()::text), 1, 8)),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute TEXT NOT NULL,
    value TEXT NOT NULL,
    extra_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY DEFAULT ('PLAN-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    billing_period billing_period_enum NOT NULL DEFAULT 'monthly',
    min_quantity INTEGER NOT NULL DEFAULT 1,
    available_from DATE,
    available_to DATE,
    auto_close BOOLEAN NOT NULL DEFAULT FALSE,
    closable BOOLEAN NOT NULL DEFAULT TRUE,
    pausable BOOLEAN NOT NULL DEFAULT TRUE,
    renewable BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_terms (
    id TEXT PRIMARY KEY DEFAULT ('PT-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    days_due INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taxes (
    id TEXT PRIMARY KEY DEFAULT ('TAX-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    applies_to TEXT NOT NULL DEFAULT 'all',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discounts (
    id TEXT PRIMARY KEY DEFAULT ('DISC-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    type discount_type_enum NOT NULL DEFAULT 'percentage',
    value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    min_purchase NUMERIC(12,2) DEFAULT NULL,
    min_quantity INTEGER DEFAULT NULL,
    start_date DATE,
    end_date DATE,
    usage_limit INTEGER DEFAULT NULL,
    times_used INTEGER NOT NULL DEFAULT 0,
    scope discount_scope_enum NOT NULL DEFAULT 'subscription',
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_usage CHECK (usage_limit IS NULL OR times_used <= usage_limit)
);

CREATE TABLE IF NOT EXISTS quotation_templates (
    id TEXT PRIMARY KEY DEFAULT ('QT-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    validity_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_template_lines (
    id TEXT PRIMARY KEY DEFAULT ('QTL-' || substr(md5(random()::text), 1, 8)),
    template_id TEXT NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS sub_number_seq START 1;

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY DEFAULT ('SUB-ID-' || substr(md5(random()::text), 1, 8)),
    number TEXT NOT NULL UNIQUE DEFAULT ('SUB-' || LPAD(nextval('sub_number_seq')::text, 6, '0')),
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    payment_terms_id TEXT NOT NULL REFERENCES payment_terms(id) ON DELETE RESTRICT,
    status subscription_status_enum NOT NULL DEFAULT 'draft',
    next_billing_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_lines (
    id TEXT PRIMARY KEY DEFAULT ('SL-' || substr(md5(random()::text), 1, 8)),
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_id TEXT REFERENCES taxes(id) ON DELETE SET NULL,
    discount_id TEXT REFERENCES discounts(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS inv_number_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY DEFAULT ('INV-ID-' || substr(md5(random()::text), 1, 8)),
    number TEXT NOT NULL UNIQUE DEFAULT ('INV-' || LPAD(nextval('inv_number_seq')::text, 6, '0')),
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status invoice_status_enum NOT NULL DEFAULT 'draft',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_invoice_period UNIQUE (subscription_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS invoice_lines (
    id TEXT PRIMARY KEY DEFAULT ('IL-' || substr(md5(random()::text), 1, 8)),
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT ('PAY-' || substr(md5(random()::text), 1, 8)),
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    recorded_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_runs (
    id TEXT PRIMARY KEY DEFAULT ('RUN-' || substr(md5(random()::text), 1, 8)),
    run_date DATE NOT NULL DEFAULT CURRENT_DATE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    generated_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_id TEXT,
    actor_email TEXT,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subs_status_next_billing ON subscriptions (status, next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subs_customer_id ON subscriptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_inv_status_due_date ON invoices (status, due_date);
CREATE INDEX IF NOT EXISTS idx_inv_customer_date ON invoices (customer_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (payment_date);

-- PART 3: STORED FUNCTIONS FOR BILLING & PAYMENTS

CREATE OR REPLACE FUNCTION generate_invoice(
    p_subscription_id TEXT,
    p_period_start DATE,
    p_period_end DATE
) RETURNS TEXT AS $$
DECLARE
    v_sub RECORD;
    v_invoice_id TEXT;
    v_due_date DATE;
    v_line RECORD;
    v_discount RECORD;
    v_unit_price NUMERIC;
    v_discount_amt NUMERIC;
    v_tax_rate NUMERIC;
    v_tax_amt NUMERIC;
    v_line_subtotal NUMERIC;
    v_line_total NUMERIC;
    v_total_subtotal NUMERIC := 0.00;
    v_total_discount NUMERIC := 0.00;
    v_total_tax NUMERIC := 0.00;
    v_grand_total NUMERIC := 0.00;
BEGIN
    SELECT id INTO v_invoice_id FROM invoices
    WHERE subscription_id = p_subscription_id
      AND period_start = p_period_start
      AND period_end = p_period_end;

    IF v_invoice_id IS NOT NULL THEN
        RETURN v_invoice_id;
    END IF;

    SELECT s.*, pt.days_due
    INTO v_sub
    FROM subscriptions s
    JOIN payment_terms pt ON s.payment_terms_id = pt.id
    WHERE s.id = p_subscription_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
    END IF;

    v_due_date := CURRENT_DATE + (v_sub.days_due || ' days')::INTERVAL;
    v_invoice_id := 'INV-ID-' || substr(md5(random()::text), 1, 8);

    INSERT INTO invoices (
        id, subscription_id, customer_id, period_start, period_end,
        invoice_date, due_date, status, subtotal, discount_total, tax_total, total, amount_paid
    ) VALUES (
        v_invoice_id, p_subscription_id, v_sub.customer_id, p_period_start, p_period_end,
        CURRENT_DATE, v_due_date, 'draft', 0, 0, 0, 0, 0
    );

    FOR v_line IN
        SELECT sl.*, p.name AS product_name, pv.value AS variant_name
        FROM subscription_lines sl
        JOIN products p ON sl.product_id = p.id
        LEFT JOIN product_variants pv ON sl.variant_id = pv.id
        WHERE sl.subscription_id = p_subscription_id
    LOOP
        v_unit_price := v_line.unit_price;
        v_line_subtotal := v_line.quantity * v_unit_price;
        v_discount_amt := 0.00;

        IF v_line.discount_id IS NOT NULL THEN
            SELECT * INTO v_discount FROM discounts WHERE id = v_line.discount_id;
            IF v_discount.is_active
               AND (v_discount.start_date IS NULL OR CURRENT_DATE >= v_discount.start_date)
               AND (v_discount.end_date IS NULL OR CURRENT_DATE <= v_discount.end_date)
               AND (v_discount.usage_limit IS NULL OR v_discount.times_used < v_discount.usage_limit)
               AND (v_discount.min_quantity IS NULL OR v_line.quantity >= v_discount.min_quantity)
               AND (v_discount.min_purchase IS NULL OR v_line_subtotal >= v_discount.min_purchase)
            THEN
                IF v_discount.type = 'percentage' THEN
                    v_discount_amt := ROUND(v_line_subtotal * (v_discount.value / 100.0), 2);
                ELSE
                    v_discount_amt := LEAST(v_discount.value, v_line_subtotal);
                END IF;

                UPDATE discounts SET times_used = times_used + 1 WHERE id = v_discount.id;
            END IF;
        END IF;

        v_tax_rate := 0.00;
        IF v_line.tax_id IS NOT NULL THEN
            SELECT rate INTO v_tax_rate FROM taxes WHERE id = v_line.tax_id;
        END IF;

        v_tax_amt := ROUND((v_line_subtotal - v_discount_amt) * (v_tax_rate / 100.0), 2);
        v_line_total := (v_line_subtotal - v_discount_amt) + v_tax_amt;

        INSERT INTO invoice_lines (
            invoice_id, product_id, description, quantity, unit_price,
            discount, tax_rate, tax_amount, amount
        ) VALUES (
            v_invoice_id,
            v_line.product_id,
            v_line.product_name || COALESCE(' (' || v_line.variant_name || ')', ''),
            v_line.quantity,
            v_unit_price,
            v_discount_amt,
            v_tax_rate,
            v_tax_amt,
            v_line_total
        );

        v_total_subtotal := v_total_subtotal + v_line_subtotal;
        v_total_discount := v_total_discount + v_discount_amt;
        v_total_tax := v_total_tax + v_tax_amt;
        v_grand_total := v_grand_total + v_line_total;
    END LOOP;

    UPDATE invoices
    SET subtotal = v_total_subtotal,
        discount_total = v_total_discount,
        tax_total = v_total_tax,
        total = v_grand_total
    WHERE id = v_invoice_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION run_billing(p_run_date DATE)
RETURNS JSONB AS $$
DECLARE
    v_run_id TEXT;
    v_sub RECORD;
    v_period_start DATE;
    v_period_end DATE;
    v_next_date DATE;
    v_generated INTEGER := 0;
    v_skipped INTEGER := 0;
    v_failed INTEGER := 0;
    v_errors JSONB := '[]'::jsonb;
BEGIN
    v_run_id := 'RUN-' || substr(md5(random()::text), 1, 8);

    INSERT INTO billing_runs (id, run_date, started_at)
    VALUES (v_run_id, p_run_date, NOW());

    FOR v_sub IN
        SELECT s.*, p.billing_period
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.status = 'active'
          AND s.next_billing_date <= p_run_date
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            v_period_start := v_sub.next_billing_date;

            IF v_sub.billing_period = 'daily' THEN
                v_period_end := v_period_start;
                v_next_date := v_period_start + INTERVAL '1 day';
            ELSIF v_sub.billing_period = 'weekly' THEN
                v_period_end := v_period_start + INTERVAL '6 days';
                v_next_date := v_period_start + INTERVAL '7 days';
            ELSIF v_sub.billing_period = 'yearly' THEN
                v_period_end := v_period_start + INTERVAL '1 year' - INTERVAL '1 day';
                v_next_date := v_period_start + INTERVAL '1 year';
            ELSE
                v_period_end := v_period_start + INTERVAL '1 month' - INTERVAL '1 day';
                v_next_date := v_period_start + INTERVAL '1 month';
            END IF;

            PERFORM generate_invoice(v_sub.id, v_period_start, v_period_end);

            UPDATE subscriptions
            SET next_billing_date = v_next_date,
                updated_at = NOW()
            WHERE id = v_sub.id;

            v_generated := v_generated + 1;
        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
            v_errors := v_errors || jsonb_build_object('subscription_id', v_sub.id, 'error', SQLERRM);
        END;
    END LOOP;

    UPDATE billing_runs
    SET finished_at = NOW(),
        generated_count = v_generated,
        skipped_count = v_skipped,
        failed_count = v_failed,
        details = jsonb_build_object('errors', v_errors)
    WHERE id = v_run_id;

    RETURN jsonb_build_object('run_id', v_run_id, 'generated', v_generated, 'skipped', v_skipped, 'failed', v_failed);
END;
$$ LANGUAGE plpgsql;

-- PART 4: SEED INITIAL WORKING DATA
-- (Inserts products with Odoo +560 variant, plans, quotation templates, customers, and active subscriptions)

INSERT INTO products (id, name, type, sales_price, cost_price, notes) VALUES
  ('prod_core', 'BrightCore Cloud Suite', 'software', 1200.00, 320.00, 'Main subscription ERP and CRM core platform'),
  ('prod_sec', 'Security & Compliance Shield', 'add-on', 250.00, 50.00, 'Advanced automated audit logging and zero-trust perimeter'),
  ('prod_sla', '24/7 Dedicated SLA & Engineering', 'service', 500.00, 180.00, '15-minute response time SLA and dedicated architect'),
  ('prod_ai', 'Predictive Analytics Module', 'software', 450.00, 110.00, 'Machine learning forecasting engine for demand and churn')
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, attribute, value, extra_price) VALUES
  ('var_core_odoo', 'prod_core', 'Brand', 'Odoo Connector', 560.00),
  ('var_core_std', 'prod_core', 'Brand', 'Standard Edition', 0.00),
  ('var_core_ent', 'prod_core', 'Brand', 'Enterprise White-label', 850.00),
  ('var_sec_hipaa', 'prod_sec', 'Tier', 'HIPAA & SOC2 Extended', 150.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO plans (id, name, price, billing_period, min_quantity, available_from, available_to, auto_close, closable, pausable, renewable) VALUES
  ('plan_daily', 'Rapid Scale Daily', 45.00, 'daily', 1, '2026-01-01', '2027-12-31', FALSE, TRUE, TRUE, TRUE),
  ('plan_weekly', 'Agile Sprint Weekly', 290.00, 'weekly', 1, '2026-01-01', '2027-12-31', FALSE, TRUE, TRUE, TRUE),
  ('plan_monthly', 'Professional Monthly', 1200.00, 'monthly', 1, '2026-01-01', '2027-12-31', FALSE, TRUE, TRUE, TRUE),
  ('plan_yearly', 'Enterprise Annual Contract', 12500.00, 'yearly', 3, '2026-01-01', '2027-12-31', TRUE, TRUE, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_terms (id, name, days_due) VALUES
  ('pt_imm', 'Immediate Payment', 0),
  ('pt_15', 'Net 15 Days', 15),
  ('pt_30', 'Net 30 Days', 30),
  ('pt_60', 'Net 60 Days', 60)
ON CONFLICT (id) DO NOTHING;

INSERT INTO taxes (id, name, rate, applies_to) VALUES
  ('tax_vat20', 'Standard VAT (20%)', 20.00, 'all'),
  ('tax_gst18', 'Software GST (18%)', 18.00, 'software'),
  ('tax_sales8', 'State Sales Tax (8%)', 8.00, 'service'),
  ('tax_zero', 'Zero Rated Tax (0%)', 0.00, 'all')
ON CONFLICT (id) DO NOTHING;

INSERT INTO discounts (id, name, type, value, min_purchase, min_quantity, start_date, end_date, usage_limit, times_used, scope) VALUES
  ('disc_volume', 'Volume Partner 15%', 'percentage', 15.00, 1000.00, NULL, '2026-01-01', '2026-12-31', 100, 14, 'subscription'),
  ('disc_odoo', 'Odoo Integration Rebate $200', 'fixed', 200.00, 500.00, 1, '2026-01-01', '2026-12-31', 50, 9, 'product')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quotation_templates (id, name, plan_id, validity_days) VALUES
  ('qt_smb', 'Standard SMB Growth Package', 'plan_monthly', 30),
  ('qt_ent', 'Enterprise Custom Tier Bundle', 'plan_yearly', 45)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quotation_template_lines (id, template_id, product_id, variant_id, quantity) VALUES
  ('qtl_1', 'qt_smb', 'prod_core', 'var_core_odoo', 1),
  ('qtl_2', 'qt_smb', 'prod_sec', 'var_sec_hipaa', 1),
  ('qtl_3', 'qt_ent', 'prod_core', 'var_core_ent', 5),
  ('qtl_4', 'qt_ent', 'prod_sla', NULL, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, name, company, email, phone, billing_address, tax_id) VALUES
  ('cust_01', 'Priya Patel', 'ShopMart Retail', 'priya@shopmart.com', '+1 555-019-2831', '142 Market Street, Austin, TX 78701', 'US-TAX-883921'),
  ('cust_02', 'Alexander Vance', 'Acme Global Enterprises', 'corp@acmeglobal.com', '+1 555-014-9982', '700 Financial Plaza, New York, NY 10005', 'US-TAX-102948')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions (id, number, customer_id, plan_id, start_date, expiry_date, payment_terms_id, status, next_billing_date) VALUES
  ('sub_001', 'SUB-000001', 'cust_01', 'plan_monthly', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'pt_15', 'active', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscription_lines (id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount) VALUES
  ('sl_001_1', 'sub_001', 'prod_core', 'var_core_odoo', 2, 1760.00, 'tax_vat20', 'disc_volume', 3590.40)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- PART 5: ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- ============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_template_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 2. Security Definier Helper Functions for fast RLS checks
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'staff')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Profiles Policies
DROP POLICY IF EXISTS "Public profiles read own" ON profiles;
CREATE POLICY "Public profiles read own" ON profiles FOR SELECT USING (id = auth.uid() OR is_staff());

DROP POLICY IF EXISTS "Admin manages profiles" ON profiles;
CREATE POLICY "Admin manages profiles" ON profiles FOR ALL USING (is_admin());

-- 4. Customers Policies
DROP POLICY IF EXISTS "Staff read/write customers" ON customers;
CREATE POLICY "Staff read/write customers" ON customers FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Customers read own profile" ON customers;
CREATE POLICY "Customers read own profile" ON customers FOR SELECT USING (user_id = auth.uid());

-- 5. Products & Variants Policies (Public/Anon can view active for landing page pricing)
DROP POLICY IF EXISTS "Public read active products" ON products;
CREATE POLICY "Public read active products" ON products FOR SELECT USING (is_active = TRUE OR is_staff());

DROP POLICY IF EXISTS "Admin manages products" ON products;
CREATE POLICY "Admin manages products" ON products FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Public read variants" ON product_variants;
CREATE POLICY "Public read variants" ON product_variants FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admin manages variants" ON product_variants;
CREATE POLICY "Admin manages variants" ON product_variants FOR ALL USING (is_admin());

-- 6. Plans Policies (Public can view active for landing page and signup)
DROP POLICY IF EXISTS "Public read active plans" ON plans;
CREATE POLICY "Public read active plans" ON plans FOR SELECT USING (is_active = TRUE OR is_staff());

DROP POLICY IF EXISTS "Admin manages plans" ON plans;
CREATE POLICY "Admin manages plans" ON plans FOR ALL USING (is_admin());

-- 7. Payment Terms Policies
DROP POLICY IF EXISTS "Anyone read active payment terms" ON payment_terms;
CREATE POLICY "Anyone read active payment terms" ON payment_terms FOR SELECT USING (is_active = TRUE OR is_staff());

DROP POLICY IF EXISTS "Admin manages payment terms" ON payment_terms;
CREATE POLICY "Admin manages payment terms" ON payment_terms FOR ALL USING (is_admin());

-- 8. Taxes Policies
DROP POLICY IF EXISTS "Anyone read active taxes" ON taxes;
CREATE POLICY "Anyone read active taxes" ON taxes FOR SELECT USING (is_active = TRUE OR is_staff());

DROP POLICY IF EXISTS "Admin manages taxes" ON taxes;
CREATE POLICY "Admin manages taxes" ON taxes FOR ALL USING (is_admin());

-- 9. Discounts Policies (Admin only creates/edits; staff can read for quoting)
DROP POLICY IF EXISTS "Staff read discounts" ON discounts;
CREATE POLICY "Staff read discounts" ON discounts FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS "Admin manages discounts" ON discounts;
CREATE POLICY "Admin manages discounts" ON discounts FOR ALL USING (is_admin());

-- 10. Quotation Templates Policies
DROP POLICY IF EXISTS "Staff manage quotation templates" ON quotation_templates;
CREATE POLICY "Staff manage quotation templates" ON quotation_templates FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Staff manage quotation template lines" ON quotation_template_lines;
CREATE POLICY "Staff manage quotation template lines" ON quotation_template_lines FOR ALL USING (is_staff());

-- 11. Subscriptions & Lines Policies (Isolated per customer)
DROP POLICY IF EXISTS "Staff manage subscriptions" ON subscriptions;
CREATE POLICY "Staff manage subscriptions" ON subscriptions FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Customers read own subscriptions" ON subscriptions;
CREATE POLICY "Customers read own subscriptions" ON subscriptions FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Staff manage subscription lines" ON subscription_lines;
CREATE POLICY "Staff manage subscription lines" ON subscription_lines FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Customers read own subscription lines" ON subscription_lines;
CREATE POLICY "Customers read own subscription lines" ON subscription_lines FOR SELECT USING (
    subscription_id IN (
        SELECT id FROM subscriptions WHERE customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    )
);

-- 12. Invoices & Lines Policies (Isolated per customer)
DROP POLICY IF EXISTS "Staff manage invoices" ON invoices;
CREATE POLICY "Staff manage invoices" ON invoices FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Customers read own invoices" ON invoices;
CREATE POLICY "Customers read own invoices" ON invoices FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Staff manage invoice lines" ON invoice_lines;
CREATE POLICY "Staff manage invoice lines" ON invoice_lines FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Customers read own invoice lines" ON invoice_lines;
CREATE POLICY "Customers read own invoice lines" ON invoice_lines FOR SELECT USING (
    invoice_id IN (
        SELECT id FROM invoices WHERE customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    )
);

-- 13. Payments Policies
DROP POLICY IF EXISTS "Staff manage payments" ON payments;
CREATE POLICY "Staff manage payments" ON payments FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Customers read own payments" ON payments;
CREATE POLICY "Customers read own payments" ON payments FOR SELECT USING (
    invoice_id IN (
        SELECT id FROM invoices WHERE customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    )
);

-- 14. Billing Runs & Audit Logs Policies
DROP POLICY IF EXISTS "Staff manage billing runs" ON billing_runs;
CREATE POLICY "Staff manage billing runs" ON billing_runs FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Staff read audit logs" ON audit_log;
CREATE POLICY "Staff read audit logs" ON audit_log FOR SELECT USING (is_staff());
