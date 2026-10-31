-- ============================================================================
-- Brightloop Plat-form: Subscription Management System
-- Schema, Constraints, Functions, Views, and RLS Policies
-- ============================================================================

-- 1. ENUMS & TYPES
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'customer');
CREATE TYPE product_type AS ENUM ('software', 'service', 'add-on');
CREATE TYPE billing_period_enum AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
CREATE TYPE subscription_status_enum AS ENUM ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed');
CREATE TYPE invoice_status_enum AS ENUM ('draft', 'confirmed', 'paid', 'cancelled');
CREATE TYPE discount_type_enum AS ENUM ('fixed', 'percentage');
CREATE TYPE discount_scope_enum AS ENUM ('subscription', 'product');

-- 2. CORE TABLES

-- User profiles (links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT ('CUST-' || substr(md5(random()::text), 1, 8)),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    billing_address TEXT,
    tax_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products
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

-- Product Variants (e.g. Brand = Odoo -> +560 extra)
CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY DEFAULT ('VAR-' || substr(md5(random()::text), 1, 8)),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute TEXT NOT NULL, -- e.g. 'Brand'
    value TEXT NOT NULL,     -- e.g. 'Odoo'
    extra_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plans
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

-- Payment Terms (e.g. Immediate, Net 15, Net 30)
CREATE TABLE IF NOT EXISTS payment_terms (
    id TEXT PRIMARY KEY DEFAULT ('PT-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    days_due INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Taxes
CREATE TABLE IF NOT EXISTS taxes (
    id TEXT PRIMARY KEY DEFAULT ('TAX-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    applies_to TEXT NOT NULL DEFAULT 'all', -- 'all', 'software', 'service', 'add-on'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Discounts (Admin only)
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

-- Quotation Templates
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

-- Subscriptions
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

-- Subscription Lines
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

-- Invoices
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
    -- Exactly-once billing constraint
    CONSTRAINT uq_invoice_period UNIQUE (subscription_id, period_start, period_end)
);

-- Invoice Lines
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

-- Payments
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

-- Billing Runs
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

-- Audit Log
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

-- 3. INDEXES FOR <2s PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_subs_status_next_billing ON subscriptions (status, next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subs_customer_id ON subscriptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_inv_status_due_date ON invoices (status, due_date);
CREATE INDEX IF NOT EXISTS idx_inv_customer_date ON invoices (customer_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_discounts_dates ON discounts (start_date, end_date);

-- 4. ROW LEVEL SECURITY (RLS)
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

-- Helper functions for RLS
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

-- RLS Policies
CREATE POLICY "Public profiles read own" ON profiles FOR SELECT USING (id = auth.uid() OR is_staff());
CREATE POLICY "Admin manages profiles" ON profiles FOR ALL USING (is_admin());

CREATE POLICY "Staff read/write customers" ON customers FOR ALL USING (is_staff());
CREATE POLICY "Customers read own" ON customers FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Anyone authenticated read products" ON products FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin manages products" ON products FOR ALL USING (is_admin());

CREATE POLICY "Anyone authenticated read variants" ON product_variants FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin manages variants" ON product_variants FOR ALL USING (is_admin());

CREATE POLICY "Anyone authenticated read plans" ON plans FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin manages plans" ON plans FOR ALL USING (is_admin());

CREATE POLICY "Staff read/write templates" ON quotation_templates FOR ALL USING (is_staff());
CREATE POLICY "Staff read/write template lines" ON quotation_template_lines FOR ALL USING (is_staff());

CREATE POLICY "Anyone authenticated read payment terms" ON payment_terms FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin manages payment terms" ON payment_terms FOR ALL USING (is_admin());

CREATE POLICY "Anyone authenticated read taxes" ON taxes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin manages taxes" ON taxes FOR ALL USING (is_admin());

CREATE POLICY "Staff read discounts" ON discounts FOR SELECT USING (is_staff());
CREATE POLICY "Admin only creates/edits discounts" ON discounts FOR ALL USING (is_admin());

CREATE POLICY "Staff manage subscriptions" ON subscriptions FOR ALL USING (is_staff());
CREATE POLICY "Customers read own subscriptions" ON subscriptions FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);

CREATE POLICY "Staff manage sub lines" ON subscription_lines FOR ALL USING (is_staff());
CREATE POLICY "Customers read own sub lines" ON subscription_lines FOR SELECT USING (
    subscription_id IN (
        SELECT id FROM subscriptions WHERE customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Staff manage invoices" ON invoices FOR ALL USING (is_staff());
CREATE POLICY "Customers read own invoices" ON invoices FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);

CREATE POLICY "Staff manage invoice lines" ON invoice_lines FOR ALL USING (is_staff());
CREATE POLICY "Customers read own invoice lines" ON invoice_lines FOR SELECT USING (
    invoice_id IN (
        SELECT id FROM invoices WHERE customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Staff manage payments" ON payments FOR ALL USING (is_staff());
CREATE POLICY "Customers read own payments" ON payments FOR SELECT USING (
    invoice_id IN (
        SELECT id FROM invoices WHERE customer_id IN (
            SELECT id FROM customers WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Staff read billing runs" ON billing_runs FOR SELECT USING (is_staff());
CREATE POLICY "Staff manage billing runs" ON billing_runs FOR ALL USING (is_staff());

CREATE POLICY "Staff read audit logs" ON audit_log FOR SELECT USING (is_staff());
