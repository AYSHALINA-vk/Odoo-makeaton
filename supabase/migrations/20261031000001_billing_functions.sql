-- ============================================================================
-- Brightloop Plat-form: Billing & Payment Business Logic Functions (Postgres)
-- ============================================================================

-- 1. Helper function to compute line amounts
CREATE OR REPLACE FUNCTION calculate_line_amount(
    p_quantity INTEGER,
    p_unit_price NUMERIC,
    p_discount_val NUMERIC,
    p_tax_rate NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_subtotal NUMERIC;
    v_discount NUMERIC;
    v_taxable NUMERIC;
    v_tax NUMERIC;
    v_total NUMERIC;
BEGIN
    v_subtotal := p_quantity * p_unit_price;
    v_discount := COALESCE(p_discount_val, 0.00);
    IF v_discount > v_subtotal THEN
        v_discount := v_subtotal;
    END IF;
    v_taxable := v_subtotal - v_discount;
    v_tax := ROUND(v_taxable * (COALESCE(p_tax_rate, 0.00) / 100.0), 2);
    v_total := v_taxable + v_tax;

    RETURN jsonb_build_object(
        'subtotal', v_subtotal,
        'discount', v_discount,
        'taxable', v_taxable,
        'tax', v_tax,
        'total', v_total
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Idempotent Invoice Generation Function
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
    v_tax RECORD;
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
    -- Check if invoice already exists for this exact period (idempotent)
    SELECT id INTO v_invoice_id FROM invoices
    WHERE subscription_id = p_subscription_id
      AND period_start = p_period_start
      AND period_end = p_period_end;

    IF v_invoice_id IS NOT NULL THEN
        RETURN v_invoice_id; -- Already generated, return existing invoice ID safely
    END IF;

    -- Fetch subscription details
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

    -- Insert draft invoice header
    INSERT INTO invoices (
        id, subscription_id, customer_id, period_start, period_end,
        invoice_date, due_date, status, subtotal, discount_total, tax_total, total, amount_paid
    ) VALUES (
        v_invoice_id, p_subscription_id, v_sub.customer_id, p_period_start, p_period_end,
        CURRENT_DATE, v_due_date, 'draft', 0, 0, 0, 0, 0
    );

    -- Process lines
    FOR v_line IN
        SELECT sl.*, p.name AS product_name, pv.value AS variant_name, pv.extra_price AS variant_extra
        FROM subscription_lines sl
        JOIN products p ON sl.product_id = p.id
        LEFT JOIN product_variants pv ON sl.variant_id = pv.id
        WHERE sl.subscription_id = p_subscription_id
    LOOP
        v_unit_price := v_line.unit_price;
        v_line_subtotal := v_line.quantity * v_unit_price;
        v_discount_amt := 0.00;

        -- Check line discount if set
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

                -- Increment usage atomically
                UPDATE discounts SET times_used = times_used + 1 WHERE id = v_discount.id;
            END IF;
        END IF;

        -- Resolve tax
        v_tax_rate := 0.00;
        IF v_line.tax_id IS NOT NULL THEN
            SELECT rate INTO v_tax_rate FROM taxes WHERE id = v_line.tax_id;
        END IF;

        v_tax_amt := ROUND((v_line_subtotal - v_discount_amt) * (v_tax_rate / 100.0), 2);
        v_line_total := (v_line_subtotal - v_discount_amt) + v_tax_amt;

        -- Insert invoice line
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

    -- Update invoice totals
    UPDATE invoices
    SET subtotal = v_total_subtotal,
        discount_total = v_total_discount,
        tax_total = v_total_tax,
        total = v_grand_total
    WHERE id = v_invoice_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Bulk Billing Run Function
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

            -- Calculate period end & next billing date based on billing period
            IF v_sub.billing_period = 'daily' THEN
                v_period_end := v_period_start;
                v_next_date := v_period_start + INTERVAL '1 day';
            ELSIF v_sub.billing_period = 'weekly' THEN
                v_period_end := v_period_start + INTERVAL '6 days';
                v_next_date := v_period_start + INTERVAL '7 days';
            ELSIF v_sub.billing_period = 'yearly' THEN
                v_period_end := v_period_start + INTERVAL '1 year' - INTERVAL '1 day';
                v_next_date := v_period_start + INTERVAL '1 year';
            ELSE -- monthly default
                v_period_end := v_period_start + INTERVAL '1 month' - INTERVAL '1 day';
                v_next_date := v_period_start + INTERVAL '1 month';
            END IF;

            -- Call idempotent invoice generator
            PERFORM generate_invoice(v_sub.id, v_period_start, v_period_end);

            -- Advance next billing date
            UPDATE subscriptions
            SET next_billing_date = v_next_date,
                updated_at = NOW()
            WHERE id = v_sub.id;

            v_generated := v_generated + 1;

        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
            v_errors := v_errors || jsonb_build_object(
                'subscription_id', v_sub.id,
                'error', SQLERRM
            );
        END LOOP;

    UPDATE billing_runs
    SET finished_at = NOW(),
        generated_count = v_generated,
        skipped_count = v_skipped,
        failed_count = v_failed,
        details = jsonb_build_object('errors', v_errors)
    WHERE id = v_run_id;

    RETURN jsonb_build_object(
        'run_id', v_run_id,
        'generated', v_generated,
        'skipped', v_skipped,
        'failed', v_failed
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Payment Recording and Status Update
CREATE OR REPLACE FUNCTION record_payment(
    p_invoice_id TEXT,
    p_method TEXT,
    p_amount NUMERIC,
    p_date DATE,
    p_note TEXT,
    p_recorded_by TEXT
) RETURNS TEXT AS $$
DECLARE
    v_pay_id TEXT;
    v_inv RECORD;
    v_new_amount_paid NUMERIC;
BEGIN
    SELECT * INTO v_inv FROM invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;

    v_pay_id := 'PAY-' || substr(md5(random()::text), 1, 8);

    INSERT INTO payments (id, invoice_id, method, amount, payment_date, note, recorded_by)
    VALUES (v_pay_id, p_invoice_id, p_method, p_amount, p_date, p_note, p_recorded_by);

    v_new_amount_paid := v_inv.amount_paid + p_amount;

    UPDATE invoices
    SET amount_paid = v_new_amount_paid,
        status = CASE WHEN v_new_amount_paid >= total THEN 'paid'::invoice_status_enum ELSE status END,
        updated_at = NOW()
    WHERE id = p_invoice_id;

    RETURN v_pay_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Auto-close Expired Subscriptions
CREATE OR REPLACE FUNCTION close_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE subscriptions s
        SET status = 'closed',
            updated_at = NOW()
        FROM plans p
        WHERE s.plan_id = p.id
          AND p.auto_close = TRUE
          AND s.status = 'active'
          AND s.expiry_date < CURRENT_DATE
        RETURNING s.id
    )
    SELECT COUNT(*) INTO v_count FROM updated;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
