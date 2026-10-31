import { getDatabase } from "./database";
import crypto from "node:crypto";
import { format, subDays, addDays, addMonths, subMonths } from "date-fns";

export function hashPassword(password: string): string {
  // Simple deterministic SHA-256 with salt for mock/embedded auth
  return crypto.createHash("sha256").update(`brightloop_salt_${password}`).digest("hex");
}

export function seedDatabase(force = false) {
  const db = getDatabase();

  const userCount = (db.prepare(`SELECT count(*) as count FROM profiles`).get() as any).count;
  if (userCount > 0 && !force) {
    return { status: "already_seeded" };
  }

  // Clear existing if force
  if (force) {
    db.exec(`
      DELETE FROM audit_log;
      DELETE FROM payments;
      DELETE FROM invoice_lines;
      DELETE FROM invoices;
      DELETE FROM subscription_lines;
      DELETE FROM subscriptions;
      DELETE FROM quotation_template_lines;
      DELETE FROM quotation_templates;
      DELETE FROM discounts;
      DELETE FROM taxes;
      DELETE FROM payment_terms;
      DELETE FROM product_variants;
      DELETE FROM products;
      DELETE FROM plans;
      DELETE FROM customers;
      DELETE FROM profiles;
    `);
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM-dd");
  const nextMonth = format(addMonths(new Date(), 1), "yyyy-MM-dd");
  const pastOverdue = format(subDays(new Date(), 14), "yyyy-MM-dd");

  // 1. PROFILES
  const users = [
    {
      id: "usr_admin_01",
      email: "admin@brightloop.com",
      password: "Admin@12345",
      name: "Asha Sharma (System Admin)",
      role: "admin",
    },
    {
      id: "usr_staff_01",
      email: "staff@brightloop.com",
      password: "Staff@12345",
      name: "Ravi Kumar (Sales & Billing Staff)",
      role: "staff",
    },
    {
      id: "usr_cust_01",
      email: "priya@shopmart.com",
      password: "Customer@12345",
      name: "Priya Patel",
      role: "customer",
    },
    {
      id: "usr_cust_02",
      email: "corp@acmeglobal.com",
      password: "Customer@12345",
      name: "Alexander Vance",
      role: "customer",
    },
    {
      id: "usr_cust_03",
      email: "tech@novasystems.io",
      password: "Customer@12345",
      name: "Elena Rostova",
      role: "customer",
    },
  ];

  for (const u of users) {
    db.prepare(
      `INSERT INTO profiles (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, ?)`
    ).run(u.id, u.email, hashPassword(u.password), u.name, u.role);
  }

  // 2. CUSTOMERS
  const customers = [
    {
      id: "cust_01",
      user_id: "usr_cust_01",
      name: "Priya Patel",
      company: "ShopMart Retail",
      email: "priya@shopmart.com",
      phone: "+1 555-019-2831",
      billing_address: "142 Market Street, Austin, TX 78701",
      tax_id: "US-TAX-883921",
    },
    {
      id: "cust_02",
      user_id: "usr_cust_02",
      name: "Alexander Vance",
      company: "Acme Global Enterprises",
      email: "corp@acmeglobal.com",
      phone: "+1 555-014-9982",
      billing_address: "700 Financial Plaza, New York, NY 10005",
      tax_id: "US-TAX-102948",
    },
    {
      id: "cust_03",
      user_id: "usr_cust_03",
      name: "Elena Rostova",
      company: "Nova Systems Labs",
      email: "tech@novasystems.io",
      phone: "+44 20 7946 0912",
      billing_address: "24 Tech Hub Way, London EC2A 4NE",
      tax_id: "GB-VAT-992819",
    },
    {
      id: "cust_04",
      user_id: null,
      name: "David Chen",
      company: "Apex Global Logistics",
      email: "david@apexlogistics.com",
      phone: "+1 555-018-7711",
      billing_address: "50 Harbor Boulevard, Seattle, WA 98101",
      tax_id: "US-TAX-445829",
    },
  ];

  for (const c of customers) {
    db.prepare(
      `INSERT INTO customers (id, user_id, name, company, email, phone, billing_address, tax_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(c.id, c.user_id, c.name, c.company, c.email, c.phone, c.billing_address, c.tax_id);
  }

  // 3. PAYMENT TERMS
  const paymentTerms = [
    { id: "pt_imm", name: "Immediate Payment", days_due: 0 },
    { id: "pt_15", name: "Net 15 Days", days_due: 15 },
    { id: "pt_30", name: "Net 30 Days", days_due: 30 },
    { id: "pt_60", name: "Net 60 Days", days_due: 60 },
  ];
  for (const pt of paymentTerms) {
    db.prepare(`INSERT INTO payment_terms (id, name, days_due) VALUES (?, ?, ?)`).run(
      pt.id,
      pt.name,
      pt.days_due
    );
  }

  // 4. TAXES
  const taxes = [
    { id: "tax_vat20", name: "Standard VAT (20%)", rate: 20.0, applies_to: "all" },
    { id: "tax_gst18", name: "Software GST (18%)", rate: 18.0, applies_to: "software" },
    { id: "tax_sales8", name: "State Sales Tax (8%)", rate: 8.0, applies_to: "service" },
    { id: "tax_zero", name: "Zero Rated Tax (0%)", rate: 0.0, applies_to: "all" },
  ];
  for (const t of taxes) {
    db.prepare(`INSERT INTO taxes (id, name, rate, applies_to) VALUES (?, ?, ?, ?)`).run(
      t.id,
      t.name,
      t.rate,
      t.applies_to
    );
  }

  // 5. PRODUCTS & VARIANTS
  const products = [
    {
      id: "prod_core",
      name: "BrightCore Cloud Suite",
      type: "software",
      sales_price: 1200.0,
      cost_price: 320.0,
      notes: "Main subscription ERP and CRM core platform",
    },
    {
      id: "prod_sec",
      name: "Security & Compliance Shield",
      type: "add-on",
      sales_price: 250.0,
      cost_price: 50.0,
      notes: "Advanced automated audit logging and zero-trust perimeter",
    },
    {
      id: "prod_sla",
      name: "24/7 Dedicated SLA & Engineering",
      type: "service",
      sales_price: 500.0,
      cost_price: 180.0,
      notes: "15-minute response time SLA and dedicated solution architect",
    },
    {
      id: "prod_ai",
      name: "Predictive Analytics Module",
      type: "software",
      sales_price: 450.0,
      cost_price: 110.0,
      notes: "Machine learning forecasting engine for demand and churn",
    },
  ];

  for (const p of products) {
    db.prepare(
      `INSERT INTO products (id, name, type, sales_price, cost_price, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(p.id, p.name, p.type, p.sales_price, p.cost_price, p.notes);
  }

  // Variants (explicitly showcasing Odoo brand adds 560 extra)
  const variants = [
    {
      id: "var_core_odoo",
      product_id: "prod_core",
      attribute: "Brand",
      value: "Odoo Connector",
      extra_price: 560.0, // Requirements highlight: Odoo brand adds 560
    },
    {
      id: "var_core_std",
      product_id: "prod_core",
      attribute: "Brand",
      value: "Standard Edition",
      extra_price: 0.0,
    },
    {
      id: "var_core_ent",
      product_id: "prod_core",
      attribute: "Brand",
      value: "Enterprise White-label",
      extra_price: 850.0,
    },
    {
      id: "var_sec_hipaa",
      product_id: "prod_sec",
      attribute: "Tier",
      value: "HIPAA & SOC2 Extended",
      extra_price: 150.0,
    },
  ];

  for (const v of variants) {
    db.prepare(
      `INSERT INTO product_variants (id, product_id, attribute, value, extra_price)
       VALUES (?, ?, ?, ?, ?)`
    ).run(v.id, v.product_id, v.attribute, v.value, v.extra_price);
  }

  // 6. PLANS
  const plans = [
    {
      id: "plan_daily",
      name: "Rapid Scale Daily",
      price: 45.0,
      billing_period: "daily",
      min_quantity: 1,
      available_from: "2026-01-01",
      available_to: "2027-12-31",
      auto_close: 0,
      closable: 1,
      pausable: 1,
      renewable: 1,
    },
    {
      id: "plan_weekly",
      name: "Agile Sprint Weekly",
      price: 290.0,
      billing_period: "weekly",
      min_quantity: 1,
      available_from: "2026-01-01",
      available_to: "2027-12-31",
      auto_close: 0,
      closable: 1,
      pausable: 1,
      renewable: 1,
    },
    {
      id: "plan_monthly",
      name: "Professional Monthly",
      price: 1200.0,
      billing_period: "monthly",
      min_quantity: 1,
      available_from: "2026-01-01",
      available_to: "2027-12-31",
      auto_close: 0,
      closable: 1,
      pausable: 1,
      renewable: 1,
    },
    {
      id: "plan_yearly",
      name: "Enterprise Annual Contract",
      price: 12500.0,
      billing_period: "yearly",
      min_quantity: 3,
      available_from: "2026-01-01",
      available_to: "2027-12-31",
      auto_close: 1, // Auto-close when ends
      closable: 1,
      pausable: 0,
      renewable: 1,
    },
  ];

  for (const pl of plans) {
    db.prepare(
      `INSERT INTO plans (
        id, name, price, billing_period, min_quantity, available_from, available_to,
        auto_close, closable, pausable, renewable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      pl.id,
      pl.name,
      pl.price,
      pl.billing_period,
      pl.min_quantity,
      pl.available_from,
      pl.available_to,
      pl.auto_close,
      pl.closable,
      pl.pausable,
      pl.renewable
    );
  }

  // 7. QUOTATION TEMPLATES
  db.prepare(
    `INSERT INTO quotation_templates (id, name, plan_id, validity_days)
     VALUES (?, ?, ?, ?)`
  ).run("qt_smb", "Standard SMB Growth Package", "plan_monthly", 30);

  db.prepare(
    `INSERT INTO quotation_template_lines (id, template_id, product_id, variant_id, quantity)
     VALUES (?, ?, ?, ?, ?)`
  ).run("qtl_1", "qt_smb", "prod_core", "var_core_odoo", 1);
  db.prepare(
    `INSERT INTO quotation_template_lines (id, template_id, product_id, variant_id, quantity)
     VALUES (?, ?, ?, ?, ?)`
  ).run("qtl_2", "qt_smb", "prod_sec", "var_sec_hipaa", 1);

  db.prepare(
    `INSERT INTO quotation_templates (id, name, plan_id, validity_days)
     VALUES (?, ?, ?, ?)`
  ).run("qt_ent", "Enterprise Custom Tier Bundle", "plan_yearly", 45);

  db.prepare(
    `INSERT INTO quotation_template_lines (id, template_id, product_id, variant_id, quantity)
     VALUES (?, ?, ?, ?, ?)`
  ).run("qtl_3", "qt_ent", "prod_core", "var_core_ent", 5);
  db.prepare(
    `INSERT INTO quotation_template_lines (id, template_id, product_id, variant_id, quantity)
     VALUES (?, ?, ?, ?, ?)`
  ).run("qtl_4", "qt_ent", "prod_sla", null, 1);

  // 8. DISCOUNTS (Admin created)
  const discounts = [
    {
      id: "disc_volume",
      name: "Volume Partner 15%",
      type: "percentage",
      value: 15.0,
      min_purchase: 1000.0,
      min_quantity: null,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      usage_limit: 100,
      times_used: 14,
      scope: "subscription",
      product_id: null,
    },
    {
      id: "disc_odoo",
      name: "Odoo Integration Rebate $200",
      type: "fixed",
      value: 200.0,
      min_purchase: 500.0,
      min_quantity: 1,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      usage_limit: 50,
      times_used: 9,
      scope: "product",
      product_id: "prod_core",
    },
    {
      id: "disc_expired",
      name: "Expired Beta Promo 25%",
      type: "percentage",
      value: 25.0,
      min_purchase: null,
      min_quantity: null,
      start_date: "2025-01-01",
      end_date: "2025-12-31", // Expired!
      usage_limit: 10,
      times_used: 10,
      scope: "subscription",
      product_id: null,
    },
  ];

  for (const d of discounts) {
    db.prepare(
      `INSERT INTO discounts (
        id, name, type, value, min_purchase, min_quantity, start_date, end_date,
        usage_limit, times_used, scope, product_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      d.id,
      d.name,
      d.type,
      d.value,
      d.min_purchase,
      d.min_quantity,
      d.start_date,
      d.end_date,
      d.usage_limit,
      d.times_used,
      d.scope,
      d.product_id
    );
  }

  // 9. SUBSCRIPTIONS
  // Sub 1: Active, ShopMart (Priya), Odoo Variant (+560 extra price), Monthly, Due today for billing!
  db.prepare(
    `INSERT INTO subscriptions (
      id, number, customer_id, plan_id, start_date, expiry_date, payment_terms_id, status, next_billing_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "sub_001",
    "SUB-000001",
    "cust_01",
    "plan_monthly",
    lastMonth,
    addMonths(new Date(), 11).toISOString().split("T")[0],
    "pt_15",
    "active",
    today // DUE TODAY FOR BILLING DAY DEMO!
  );

  // Sub 1 lines: Core Odoo (1200 + 560 = 1760), Qty 2 = 3520, Tax 20%
  db.prepare(
    `INSERT INTO subscription_lines (
      id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("sl_001_1", "sub_001", "prod_core", "var_core_odoo", 2, 1760.0, "tax_vat20", "disc_volume", 3590.4);

  db.prepare(
    `INSERT INTO subscription_lines (
      id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("sl_001_2", "sub_001", "prod_sec", "var_sec_hipaa", 2, 400.0, "tax_vat20", null, 960.0);

  // Sub 2: Active, Acme Global, Enterprise Yearly Contract
  db.prepare(
    `INSERT INTO subscriptions (
      id, number, customer_id, plan_id, start_date, expiry_date, payment_terms_id, status, next_billing_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "sub_002",
    "SUB-000002",
    "cust_02",
    "plan_yearly",
    "2026-01-15",
    "2027-01-14",
    "pt_30",
    "active",
    "2027-01-15"
  );

  db.prepare(
    `INSERT INTO subscription_lines (
      id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("sl_002_1", "sub_002", "prod_core", "var_core_ent", 5, 2050.0, "tax_gst18", "disc_volume", 10270.5);

  db.prepare(
    `INSERT INTO subscription_lines (
      id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("sl_002_2", "sub_002", "prod_sla", null, 1, 500.0, "tax_sales8", null, 540.0);

  // Sub 3: Quotation for Nova Systems (Awaiting acceptance)
  db.prepare(
    `INSERT INTO subscriptions (
      id, number, customer_id, plan_id, start_date, expiry_date, payment_terms_id, status, next_billing_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "sub_003",
    "SUB-000003",
    "cust_03",
    "plan_monthly",
    today,
    nextMonth,
    "pt_15",
    "quotation",
    today
  );

  db.prepare(
    `INSERT INTO subscription_lines (
      id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("sl_003_1", "sub_003", "prod_core", "var_core_std", 1, 1200.0, "tax_vat20", null, 1440.0);

  // Sub 4: Draft for Apex Logistics
  db.prepare(
    `INSERT INTO subscriptions (
      id, number, customer_id, plan_id, start_date, expiry_date, payment_terms_id, status, next_billing_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "sub_004",
    "SUB-000004",
    "cust_04",
    "plan_weekly",
    today,
    nextMonth,
    "pt_imm",
    "draft",
    today
  );

  db.prepare(
    `INSERT INTO subscription_lines (
      id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("sl_004_1", "sub_004", "prod_ai", null, 1, 450.0, "tax_gst18", null, 531.0);

  // Sub 5: Paused Subscription
  db.prepare(
    `INSERT INTO subscriptions (
      id, number, customer_id, plan_id, start_date, expiry_date, payment_terms_id, status, next_billing_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "sub_005",
    "SUB-000005",
    "cust_03",
    "plan_monthly",
    "2026-02-01",
    "2026-12-31",
    "pt_30",
    "paused",
    "2026-11-01"
  );

  db.prepare(
    `INSERT INTO subscription_lines (
      id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("sl_005_1", "sub_005", "prod_core", "var_core_std", 1, 1200.0, "tax_vat20", null, 1440.0);

  // Sub 6: Active Subscription expiring in 5 days (Renewal Alert!)
  db.prepare(
    `INSERT INTO subscriptions (
      id, number, customer_id, plan_id, start_date, expiry_date, payment_terms_id, status, next_billing_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "sub_006",
    "SUB-000006",
    "cust_04",
    "plan_monthly",
    "2026-03-05",
    format(addDays(new Date(), 5), "yyyy-MM-dd"), // 5 days left to renew!
    "pt_15",
    "active",
    format(addDays(new Date(), 5), "yyyy-MM-dd")
  );

  db.prepare(
    `INSERT INTO subscription_lines (
      id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, discount_id, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run("sl_006_1", "sub_006", "prod_core", "var_core_odoo", 1, 1760.0, "tax_vat20", null, 2112.0);

  // 10. INVOICES & PAYMENTS
  // Invoice 1: Past Month Invoice for ShopMart (PAID)
  db.prepare(
    `INSERT INTO invoices (
      id, number, subscription_id, customer_id, period_start, period_end,
      invoice_date, due_date, status, subtotal, discount_total, tax_total, total, amount_paid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 4320.0, 528.0, 758.4, 4550.4, 4550.4)`
  ).run(
    "inv_001",
    "INV-000001",
    "sub_001",
    "cust_01",
    subMonths(new Date(), 2).toISOString().split("T")[0],
    subMonths(new Date(), 1).toISOString().split("T")[0],
    subMonths(new Date(), 2).toISOString().split("T")[0],
    subDays(new Date(), 45).toISOString().split("T")[0]
  );

  db.prepare(
    `INSERT INTO invoice_lines (
      id, invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, tax_amount, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "il_001_1",
    "inv_001",
    "prod_core",
    "BrightCore Cloud Suite (Odoo Connector)",
    2,
    1760.0,
    528.0,
    20.0,
    598.4,
    3590.4
  );

  db.prepare(
    `INSERT INTO invoice_lines (
      id, invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, tax_amount, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "il_001_2",
    "inv_001",
    "prod_sec",
    "Security & Compliance Shield (HIPAA & SOC2 Extended)",
    2,
    400.0,
    0.0,
    20.0,
    160.0,
    960.0
  );

  // Payment for Inv 1
  db.prepare(
    `INSERT INTO payments (id, invoice_id, method, amount, payment_date, note, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "pay_001",
    "inv_001",
    "Bank Transfer",
    4550.4,
    subDays(new Date(), 46).toISOString().split("T")[0],
    "Wire transfer ref #TX-984210",
    "Ravi Kumar"
  );

  // Invoice 2: Acme Global Enterprise Contract (CONFIRMED, PARTIALLY PAID)
  db.prepare(
    `INSERT INTO invoices (
      id, number, subscription_id, customer_id, period_start, period_end,
      invoice_date, due_date, status, subtotal, discount_total, tax_total, total, amount_paid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 10750.0, 1537.5, 1658.25, 10870.75, 5000.0)`
  ).run(
    "inv_002",
    "INV-000002",
    "sub_002",
    "cust_02",
    "2026-01-15",
    "2027-01-14",
    "2026-01-15",
    "2026-02-15"
  );

  db.prepare(
    `INSERT INTO invoice_lines (
      id, invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, tax_amount, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "il_002_1",
    "inv_002",
    "prod_core",
    "BrightCore Cloud Suite (Enterprise White-label)",
    5,
    2050.0,
    1537.5,
    18.0,
    1568.25,
    10280.75
  );

  db.prepare(
    `INSERT INTO invoice_lines (
      id, invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, tax_amount, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "il_002_2",
    "inv_002",
    "prod_sla",
    "24/7 Dedicated SLA & Engineering",
    1,
    500.0,
    0.0,
    18.0,
    90.0,
    590.0
  );

  // Partial payment for Inv 2
  db.prepare(
    `INSERT INTO payments (id, invoice_id, method, amount, payment_date, note, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "pay_002",
    "inv_002",
    "Credit Card",
    5000.0,
    "2026-01-20",
    "Stripe charge ch_981249 (50% upfront deposit)",
    "Ravi Kumar"
  );

  // Invoice 3: OVERDUE INVOICE for ShopMart (CONFIRMED, PAST DUE, UNPAID)
  db.prepare(
    `INSERT INTO invoices (
      id, number, subscription_id, customer_id, period_start, period_end,
      invoice_date, due_date, status, subtotal, discount_total, tax_total, total, amount_paid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 3520.0, 528.0, 598.4, 3590.4, 0.0)`
  ).run(
    "inv_003",
    "INV-000003",
    "sub_001",
    "cust_01",
    subMonths(new Date(), 1).toISOString().split("T")[0],
    yesterday,
    subMonths(new Date(), 1).toISOString().split("T")[0],
    pastOverdue // Past due date!
  );

  db.prepare(
    `INSERT INTO invoice_lines (
      id, invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, tax_amount, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "il_003_1",
    "inv_003",
    "prod_core",
    "BrightCore Cloud Suite (Odoo Connector)",
    2,
    1760.0,
    528.0,
    20.0,
    598.4,
    3590.4
  );

  // 11. AUDIT LOG INITIAL EVENTS
  const auditEntries = [
    {
      actor_id: "usr_admin_01",
      actor_email: "admin@brightloop.com",
      entity: "system",
      entity_id: "init",
      action: "PLATFORM_INITIALIZED",
      before_state: null,
      after_state: JSON.stringify({ message: "Brightloop Subscription Platform initial setup" }),
    },
    {
      actor_id: "usr_admin_01",
      actor_email: "admin@brightloop.com",
      entity: "product_variant",
      entity_id: "var_core_odoo",
      action: "VARIANT_CREATED",
      before_state: null,
      after_state: JSON.stringify({ attribute: "Brand", value: "Odoo Connector", extra_price: 560.0 }),
    },
    {
      actor_id: "usr_staff_01",
      actor_email: "staff@brightloop.com",
      entity: "payment",
      entity_id: "pay_001",
      action: "PAYMENT_RECORDED",
      before_state: null,
      after_state: JSON.stringify({ invoice_id: "inv_001", amount: 4550.4, method: "Bank Transfer" }),
    },
  ];

  for (const entry of auditEntries) {
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, before_state, after_state)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entry.actor_id,
      entry.actor_email,
      entry.entity,
      entry.entity_id,
      entry.action,
      entry.before_state,
      entry.after_state
    );
  }

  return { status: "seeded_successfully" };
}
