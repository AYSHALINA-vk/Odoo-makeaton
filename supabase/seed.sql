-- ============================================================================
-- Supabase Seed Data for Brightloop Plat-form
-- ============================================================================

-- 1. PROFILES & DEMO USERS
-- Notice: In Supabase, auth.users contains system users.
-- We insert standard profiles with UUIDs that can be linked to auth.users.
INSERT INTO profiles (id, email, full_name, role) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@brightloop.com', 'Asha Sharma (System Admin)', 'admin'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'staff@brightloop.com', 'Ravi Kumar (Sales & Billing Staff)', 'staff'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'priya@shopmart.com', 'Priya Patel', 'customer'),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'corp@acmeglobal.com', 'Alexander Vance', 'customer'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'tech@novasystems.io', 'Elena Rostova', 'customer')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- 2. CUSTOMERS
INSERT INTO customers (id, user_id, name, company, email, phone, billing_address, tax_id) VALUES
  ('cust_01', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Priya Patel', 'ShopMart Retail', 'priya@shopmart.com', '+1 555-019-2831', '142 Market Street, Austin, TX 78701', 'US-TAX-883921'),
  ('cust_02', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Alexander Vance', 'Acme Global Enterprises', 'corp@acmeglobal.com', '+1 555-014-9982', '700 Financial Plaza, New York, NY 10005', 'US-TAX-102948'),
  ('cust_03', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Elena Rostova', 'Nova Systems Labs', 'tech@novasystems.io', '+44 20 7946 0912', '24 Tech Hub Way, London EC2A 4NE', 'GB-VAT-992819'),
  ('cust_04', NULL, 'David Chen', 'Apex Global Logistics', 'david@apexlogistics.com', '+1 555-018-7711', '50 Harbor Boulevard, Seattle, WA 98101', 'US-TAX-445829')
ON CONFLICT (id) DO NOTHING;

-- 3. PAYMENT TERMS
INSERT INTO payment_terms (id, name, days_due) VALUES
  ('pt_imm', 'Immediate Payment', 0),
  ('pt_15', 'Net 15 Days', 15),
  ('pt_30', 'Net 30 Days', 30),
  ('pt_60', 'Net 60 Days', 60)
ON CONFLICT (id) DO NOTHING;

-- 4. TAX RULES
INSERT INTO taxes (id, name, rate, applies_to) VALUES
  ('tax_vat20', 'Standard VAT (20%)', 20.00, 'all'),
  ('tax_gst18', 'Software GST (18%)', 18.00, 'software'),
  ('tax_sales8', 'State Sales Tax (8%)', 8.00, 'service'),
  ('tax_zero', 'Zero Rated Tax (0%)', 0.00, 'all')
ON CONFLICT (id) DO NOTHING;

-- 5. PRODUCTS & VARIANTS
INSERT INTO products (id, name, type, sales_price, cost_price, notes) VALUES
  ('prod_core', 'BrightCore Cloud Suite', 'software', 1200.00, 320.00, 'Main subscription ERP and CRM core platform'),
  ('prod_sec', 'Security & Compliance Shield', 'add-on', 250.00, 50.00, 'Advanced automated audit logging and zero-trust perimeter'),
  ('prod_sla', '24/7 Dedicated SLA & Engineering', 'service', 500.00, 180.00, '15-minute response time SLA and dedicated architect'),
  ('prod_ai', 'Predictive Analytics Module', 'software', 450.00, 110.00, 'Machine learning forecasting engine for demand and churn')
ON CONFLICT (id) DO NOTHING;

-- Odoo Variant explicitly adding +560
INSERT INTO product_variants (id, product_id, attribute, value, extra_price) VALUES
  ('var_core_odoo', 'prod_core', 'Brand', 'Odoo Connector', 560.00),
  ('var_core_std', 'prod_core', 'Brand', 'Standard Edition', 0.00),
  ('var_core_ent', 'prod_core', 'Brand', 'Enterprise White-label', 850.00),
  ('var_sec_hipaa', 'prod_sec', 'Tier', 'HIPAA & SOC2 Extended', 150.00)
ON CONFLICT (id) DO NOTHING;

-- 6. PLANS
INSERT INTO plans (id, name, price, billing_period, min_quantity, available_from, available_to, auto_close, closable, pausable, renewable) VALUES
  ('plan_daily', 'Rapid Scale Daily', 45.00, 'daily', 1, '2026-01-01', '2027-12-31', FALSE, TRUE, TRUE, TRUE),
  ('plan_weekly', 'Agile Sprint Weekly', 290.00, 'weekly', 1, '2026-01-01', '2027-12-31', FALSE, TRUE, TRUE, TRUE),
  ('plan_monthly', 'Professional Monthly', 1200.00, 'monthly', 1, '2026-01-01', '2027-12-31', FALSE, TRUE, TRUE, TRUE),
  ('plan_yearly', 'Enterprise Annual Contract', 12500.00, 'yearly', 3, '2026-01-01', '2027-12-31', TRUE, TRUE, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 7. QUOTATION TEMPLATES
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

-- 8. DISCOUNTS (Admin-only rules)
INSERT INTO discounts (id, name, type, value, min_purchase, min_quantity, start_date, end_date, usage_limit, times_used, scope, product_id) VALUES
  ('disc_volume', 'Volume Partner 15%', 'percentage', 15.00, 1000.00, NULL, '2026-01-01', '2026-12-31', 100, 14, 'subscription', NULL),
  ('disc_odoo', 'Odoo Integration Rebate $200', 'fixed', 200.00, 500.00, 1, '2026-01-01', '2026-12-31', 50, 9, 'product', 'prod_core'),
  ('disc_expired', 'Expired Beta Promo 25%', 'percentage', 25.00, NULL, NULL, '2025-01-01', '2025-12-31', 10, 10, 'subscription', NULL)
ON CONFLICT (id) DO NOTHING;

-- 9. SUBSCRIPTIONS
INSERT INTO subscriptions (id, number, customer_id, plan_id, start_date, expiry_date, payment_terms_id, status, next_billing_date) VALUES
  ('sub_001', 'SUB-000001', 'cust_01', 'plan_monthly', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '335 days', 'pt_15', 'active', CURRENT_DATE),
  ('sub_002', 'SUB-000002', 'cust_02', 'plan_yearly', '2026-01-15', '2027-01-14', 'pt_30', 'active', '2027-01-15'),
  ('sub_003', 'SUB-000003', 'cust_03', 'plan_monthly', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'pt_15', 'quotation', CURRENT_DATE),
  ('sub_004', 'SUB-000004', 'cust_04', 'plan_weekly', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'pt_imm', 'draft', CURRENT_DATE),
  ('sub_005', 'SUB-000005', 'cust_03', 'plan_monthly', '2026-02-01', '2026-12-31', 'pt_30', 'paused', '2026-11-01'),
  ('sub_006', 'SUB-000006', 'cust_04', 'plan_monthly', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '5 days', 'pt_15', 'active', CURRENT_DATE + INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- Sub 1 lines: Core Odoo (1200 + 560 = 1760) * 2 = 3520
INSERT INTO subscription_lines (id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount) VALUES
  ('sl_001_1', 'sub_001', 'prod_core', 'var_core_odoo', 2, 1760.00, 'tax_vat20', 'disc_volume', 3590.40),
  ('sl_001_2', 'sub_001', 'prod_sec', 'var_sec_hipaa', 2, 400.00, 'tax_vat20', NULL, 960.00),
  ('sl_002_1', 'sub_002', 'prod_core', 'var_core_ent', 5, 2050.00, 'tax_gst18', 'disc_volume', 10270.50),
  ('sl_002_2', 'sub_002', 'prod_sla', NULL, 1, 500.00, 'tax_sales8', NULL, 540.00),
  ('sl_003_1', 'sub_003', 'prod_core', 'var_core_std', 1, 1200.00, 'tax_vat20', NULL, 1440.00),
  ('sl_004_1', 'sub_004', 'prod_ai', NULL, 1, 450.00, 'tax_gst18', NULL, 531.00),
  ('sl_005_1', 'sub_005', 'prod_core', 'var_core_std', 1, 1200.00, 'tax_vat20', NULL, 1440.00),
  ('sl_006_1', 'sub_006', 'prod_core', 'var_core_odoo', 1, 1760.00, 'tax_vat20', NULL, 2112.00)
ON CONFLICT (id) DO NOTHING;

-- 10. INVOICES
INSERT INTO invoices (id, number, subscription_id, customer_id, period_start, period_end, invoice_date, due_date, status, subtotal, discount_total, tax_total, total, amount_paid) VALUES
  ('inv_001', 'INV-000001', 'sub_001', 'cust_01', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '31 days', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '45 days', 'paid', 4320.00, 528.00, 758.40, 4550.40, 4550.40),
  ('inv_002', 'INV-000002', 'sub_002', 'cust_02', '2026-01-15', '2027-01-14', '2026-01-15', '2026-02-15', 'confirmed', 10750.00, 1537.50, 1658.25, 10870.75, 5000.00),
  ('inv_003', 'INV-000003', 'sub_001', 'cust_01', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '15 days', 'confirmed', 3520.00, 528.00, 598.40, 3590.40, 0.00)
ON CONFLICT (id) DO NOTHING;

-- Invoice Lines
INSERT INTO invoice_lines (id, invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, tax_amount, amount) VALUES
  ('il_001_1', 'inv_001', 'prod_core', 'BrightCore Cloud Suite (Odoo Connector)', 2, 1760.00, 528.00, 20.00, 598.40, 3590.40),
  ('il_001_2', 'inv_001', 'prod_sec', 'Security & Compliance Shield (HIPAA & SOC2 Extended)', 2, 400.00, 0.00, 20.00, 160.00, 960.00),
  ('il_002_1', 'inv_002', 'prod_core', 'BrightCore Cloud Suite (Enterprise White-label)', 5, 2050.00, 1537.50, 18.00, 1568.25, 10280.75),
  ('il_002_2', 'inv_002', 'prod_sla', '24/7 Dedicated SLA & Engineering', 1, 500.00, 0.00, 18.00, 90.00, 590.00),
  ('il_003_1', 'inv_003', 'prod_core', 'BrightCore Cloud Suite (Odoo Connector)', 2, 1760.00, 528.00, 20.00, 598.40, 3590.40)
ON CONFLICT (id) DO NOTHING;

-- 11. PAYMENTS
INSERT INTO payments (id, invoice_id, method, amount, payment_date, note, recorded_by) VALUES
  ('pay_001', 'inv_001', 'Bank Transfer', 4550.40, CURRENT_DATE - INTERVAL '46 days', 'Wire transfer ref #TX-984210', 'Ravi Kumar'),
  ('pay_002', 'inv_002', 'Credit Card', 5000.00, '2026-01-20', 'Stripe charge ch_981249 (50% upfront deposit)', 'Ravi Kumar')
ON CONFLICT (id) DO NOTHING;

-- 12. INITIAL AUDIT LOG
INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@brightloop.com', 'system', 'init', 'PLATFORM_INITIALIZED', '{"status": "ready"}'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@brightloop.com', 'product_variant', 'var_core_odoo', 'VARIANT_CREATED', '{"attribute": "Brand", "value": "Odoo Connector", "extra_price": 560.0}'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'staff@brightloop.com', 'payments', 'pay_001', 'PAYMENT_RECORDED', '{"invoice_id": "inv_001", "amount": 4550.40}');
