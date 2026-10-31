import { getDatabase } from "./database";
import { format, addDays, addWeeks, addMonths, addYears, parseISO } from "date-fns";

export interface InvoiceGenerationResult {
  invoiceId: string;
  isExisting: boolean;
  total: number;
}

export interface BillingRunResult {
  runId: string;
  runDate: string;
  generatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ subscriptionId: string; error: string }>;
}

export function generateInvoice(
  subscriptionId: string,
  periodStart: string,
  periodEnd: string
): InvoiceGenerationResult {
  const db = getDatabase();

  // 1. Idempotency check: see if invoice already exists for this exact subscription and period
  const existing = db
    .prepare(
      `SELECT id, total FROM invoices 
       WHERE subscription_id = ? AND period_start = ? AND period_end = ?`
    )
    .get(subscriptionId, periodStart, periodEnd) as { id: string; total: number } | undefined;

  if (existing) {
    return {
      invoiceId: existing.id,
      isExisting: true,
      total: existing.total,
    };
  }

  // 2. Fetch subscription and plan / terms details
  const sub = db
    .prepare(
      `SELECT s.*, pt.days_due 
       FROM subscriptions s
       JOIN payment_terms pt ON s.payment_terms_id = pt.id
       WHERE s.id = ?`
    )
    .get(subscriptionId) as any;

  if (!sub) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  // Generate unique invoice number: INV-000001
  const countRow = db.prepare(`SELECT count(*) as count FROM invoices`).get() as { count: number };
  const nextNum = (countRow.count + 1).toString().padStart(6, "0");
  const invoiceNumber = `INV-${nextNum}`;
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const dueDate = format(addDays(new Date(), sub.days_due || 0), "yyyy-MM-dd");

  // Insert draft invoice
  db.prepare(
    `INSERT INTO invoices (
      id, number, subscription_id, customer_id, period_start, period_end,
      invoice_date, due_date, status, subtotal, discount_total, tax_total, total, amount_paid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, 0, 0, 0, 0)`
  ).run(
    invoiceId,
    invoiceNumber,
    subscriptionId,
    sub.customer_id,
    periodStart,
    periodEnd,
    todayStr,
    dueDate
  );

  // Fetch subscription lines
  const lines = db
    .prepare(
      `SELECT sl.*, p.name as product_name, pv.value as variant_name, pv.extra_price as variant_extra
       FROM subscription_lines sl
       JOIN products p ON sl.product_id = p.id
       LEFT JOIN product_variants pv ON sl.variant_id = pv.id
       WHERE sl.subscription_id = ?`
    )
    .all(subscriptionId) as any[];

  let totalSubtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let grandTotal = 0;

  for (const line of lines) {
    const unitPrice = Number(line.unit_price);
    const qty = Number(line.quantity);
    const lineSubtotal = qty * unitPrice;
    let lineDiscount = 0;

    // Check discount eligibility if configured
    if (line.discount_id) {
      const discount = db
        .prepare(`SELECT * FROM discounts WHERE id = ?`)
        .get(line.discount_id) as any;

      if (
        discount &&
        discount.is_active &&
        (!discount.start_date || todayStr >= discount.start_date) &&
        (!discount.end_date || todayStr <= discount.end_date) &&
        (discount.usage_limit == null || discount.times_used < discount.usage_limit) &&
        (discount.min_quantity == null || qty >= discount.min_quantity) &&
        (discount.min_purchase == null || lineSubtotal >= discount.min_purchase)
      ) {
        if (discount.type === "percentage") {
          lineDiscount = Math.round(lineSubtotal * (Number(discount.value) / 100) * 100) / 100;
        } else {
          lineDiscount = Math.min(Number(discount.value), lineSubtotal);
        }

        // Atomically increment discount usage
        db.prepare(`UPDATE discounts SET times_used = times_used + 1 WHERE id = ?`).run(discount.id);
      }
    }

    // Resolve tax
    let taxRate = 0;
    if (line.tax_id) {
      const taxRow = db.prepare(`SELECT rate FROM taxes WHERE id = ?`).get(line.tax_id) as any;
      if (taxRow) {
        taxRate = Number(taxRow.rate);
      }
    }

    const taxableAmount = Math.max(0, lineSubtotal - lineDiscount);
    const taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
    const lineTotal = taxableAmount + taxAmount;

    const lineId = `il_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const description = line.variant_name
      ? `${line.product_name} (${line.variant_name})`
      : line.product_name;

    db.prepare(
      `INSERT INTO invoice_lines (
        id, invoice_id, product_id, description, quantity, unit_price,
        discount, tax_rate, tax_amount, amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      lineId,
      invoiceId,
      line.product_id,
      description,
      qty,
      unitPrice,
      lineDiscount,
      taxRate,
      taxAmount,
      lineTotal
    );

    totalSubtotal += lineSubtotal;
    totalDiscount += lineDiscount;
    totalTax += taxAmount;
    grandTotal += lineTotal;
  }

  // Update invoice totals
  db.prepare(
    `UPDATE invoices 
     SET subtotal = ?, discount_total = ?, tax_total = ?, total = ?
     WHERE id = ?`
  ).run(
    Math.round(totalSubtotal * 100) / 100,
    Math.round(totalDiscount * 100) / 100,
    Math.round(totalTax * 100) / 100,
    Math.round(grandTotal * 100) / 100,
    invoiceId
  );

  return {
    invoiceId,
    isExisting: false,
    total: Math.round(grandTotal * 100) / 100,
  };
}

export function runBilling(runDateStr?: string): BillingRunResult {
  const db = getDatabase();
  const runDate = runDateStr || format(new Date(), "yyyy-MM-dd");
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startedAt = new Date().toISOString();

  let generatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const errors: Array<{ subscriptionId: string; error: string }> = [];

  // Query due active subscriptions
  const dueSubs = db
    .prepare(
      `SELECT s.*, p.billing_period, p.name as plan_name
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.status = 'active'
         AND s.next_billing_date <= ?`
    )
    .all(runDate) as any[];

  for (const sub of dueSubs) {
    try {
      const periodStart = sub.next_billing_date;
      const startDateObj = parseISO(periodStart);
      let periodEnd: string;
      let nextBillingDate: string;

      switch (sub.billing_period) {
        case "daily":
          periodEnd = periodStart;
          nextBillingDate = format(addDays(startDateObj, 1), "yyyy-MM-dd");
          break;
        case "weekly":
          periodEnd = format(addDays(startDateObj, 6), "yyyy-MM-dd");
          nextBillingDate = format(addWeeks(startDateObj, 1), "yyyy-MM-dd");
          break;
        case "yearly":
          periodEnd = format(addDays(addYears(startDateObj, 1), -1), "yyyy-MM-dd");
          nextBillingDate = format(addYears(startDateObj, 1), "yyyy-MM-dd");
          break;
        case "monthly":
        default:
          periodEnd = format(addDays(addMonths(startDateObj, 1), -1), "yyyy-MM-dd");
          nextBillingDate = format(addMonths(startDateObj, 1), "yyyy-MM-dd");
          break;
      }

      // Generate invoice
      const result = generateInvoice(sub.id, periodStart, periodEnd);

      if (result.isExisting) {
        skippedCount++;
      } else {
        generatedCount++;
        // Advance next billing date on subscription
        db.prepare(
          `UPDATE subscriptions 
           SET next_billing_date = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).run(nextBillingDate, sub.id);
      }
    } catch (err: any) {
      failedCount++;
      errors.push({
        subscriptionId: sub.id,
        error: err.message || "Unknown error generating invoice",
      });
    }
  }

  const finishedAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO billing_runs (
      id, run_date, started_at, finished_at, generated_count, skipped_count, failed_count, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    runId,
    runDate,
    startedAt,
    finishedAt,
    generatedCount,
    skippedCount,
    failedCount,
    JSON.stringify({ errors })
  );

  return {
    runId,
    runDate,
    generatedCount,
    skippedCount,
    failedCount,
    errors,
  };
}

export function recordPayment(params: {
  invoiceId: string;
  method: string;
  amount: number;
  paymentDate?: string;
  note?: string;
  recordedBy?: string;
}): { paymentId: string; newAmountPaid: number; newStatus: string } {
  const db = getDatabase();
  const paymentDate = params.paymentDate || format(new Date(), "yyyy-MM-dd");

  if (params.amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  const inv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(params.invoiceId) as any;
  if (!inv) {
    throw new Error(`Invoice not found: ${params.invoiceId}`);
  }

  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  db.prepare(
    `INSERT INTO payments (id, invoice_id, method, amount, payment_date, note, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    paymentId,
    params.invoiceId,
    params.method,
    params.amount,
    paymentDate,
    params.note || "",
    params.recordedBy || "Staff"
  );

  const newAmountPaid = Math.round((Number(inv.amount_paid) + params.amount) * 100) / 100;
  const isFullyPaid = newAmountPaid >= Number(inv.total);
  const newStatus = isFullyPaid ? "paid" : inv.status;

  db.prepare(
    `UPDATE invoices 
     SET amount_paid = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(newAmountPaid, newStatus, params.invoiceId);

  return {
    paymentId,
    newAmountPaid,
    newStatus,
  };
}

export function closeExpiredSubscriptions(): number {
  const db = getDatabase();
  const today = format(new Date(), "yyyy-MM-dd");

  const toClose = db
    .prepare(
      `SELECT s.id 
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.status = 'active'
         AND p.auto_close = 1
         AND s.expiry_date < ?`
    )
    .all(today) as any[];

  for (const item of toClose) {
    db.prepare(`UPDATE subscriptions SET status = 'closed', updated_at = datetime('now') WHERE id = ?`).run(
      item.id
    );
  }

  return toClose.length;
}

export function getDashboardSummary() {
  const db = getDatabase();
  const today = format(new Date(), "yyyy-MM-dd");

  // 1. Active Subscriptions count
  const activeSubsCount = (
    db.prepare(`SELECT count(*) as count FROM subscriptions WHERE status = 'active'`).get() as any
  ).count;

  // 2. Revenue collected (sum of payments)
  const totalRevenue = (
    db.prepare(`SELECT COALESCE(sum(amount), 0) as total FROM payments`).get() as any
  ).total;

  // 3. Amount Owed / Outstanding (confirmed invoices with balance > 0)
  const amountOwed = (
    db
      .prepare(
        `SELECT COALESCE(sum(total - amount_paid), 0) as owed 
         FROM invoices 
         WHERE status = 'confirmed' AND total > amount_paid`
      )
      .get() as any
  ).owed;

  // 4. Overdue Invoices: confirmed, balance > 0, due_date < today
  const overdueInvoices = db
    .prepare(
      `SELECT i.*, c.name as customer_name, c.company as customer_company
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.status = 'confirmed'
         AND i.total > i.amount_paid
         AND i.due_date < ?
       ORDER BY i.due_date ASC`
    )
    .all(today) as any[];

  const overdueCount = overdueInvoices.length;
  const overdueAmount = overdueInvoices.reduce(
    (sum, inv) => sum + (Number(inv.total) - Number(inv.amount_paid)),
    0
  );

  // 5. Normalized MRR & ARR calculation
  const activeSubs = db
    .prepare(
      `SELECT s.id, p.billing_period, 
              (SELECT COALESCE(sum(amount), 0) FROM subscription_lines WHERE subscription_id = s.id) as sub_total
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.status = 'active'`
    )
    .all() as any[];

  let mrr = 0;
  for (const s of activeSubs) {
    const val = Number(s.sub_total);
    switch (s.billing_period) {
      case "daily":
        mrr += val * 30.41;
        break;
      case "weekly":
        mrr += val * (52 / 12);
        break;
      case "yearly":
        mrr += val / 12;
        break;
      case "monthly":
      default:
        mrr += val;
        break;
    }
  }
  const arr = mrr * 12;

  // 6. Revenue by month
  const monthlyRevenue = db
    .prepare(
      `SELECT strftime('%Y-%m', payment_date) as month, sum(amount) as revenue
       FROM payments
       GROUP BY month
       ORDER BY month ASC
       LIMIT 12`
    )
    .all() as any[];

  // 7. Subscriptions by status
  const subsByStatus = db
    .prepare(
      `SELECT status, count(*) as count
       FROM subscriptions
       GROUP BY status`
    )
    .all() as any[];

  return {
    activeSubscriptions: activeSubsCount,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    amountOwed: Math.round(amountOwed * 100) / 100,
    overdueCount,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    overdueInvoices,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    monthlyRevenue,
    subsByStatus,
  };
}
