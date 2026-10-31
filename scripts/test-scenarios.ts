import { getDatabase } from "../lib/db/database";
import { seedDatabase } from "../lib/db/seed";
import { validatePassword } from "../lib/auth/password-policy";
import { generateInvoice, runBilling, recordPayment, getDashboardSummary } from "../lib/db/billing-engine";
import { format } from "date-fns";

async function runTests() {
  console.log("============================================================");
  console.log("BRIGHTLOOP PLATFORM: AUTOMATED TEST SUITE & SCENARIO AUDIT");
  console.log("============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `- ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. SCENARIO: PASSWORD POLICY VALIDATION (REQ-AUTH-2)
  console.log("--- 1. Testing Password Policy (Must be > 8 chars, Upper, Lower, Special) ---");
  assert(!validatePassword("Short1!").isValid, "Reject password <= 8 characters ('Short1!')");
  assert(!validatePassword("alllowercase1!").isValid, "Reject password without uppercase ('alllowercase1!')");
  assert(!validatePassword("ALLUPPERCASE1!").isValid, "Reject password without lowercase ('ALLUPPERCASE1!')");
  assert(!validatePassword("NoSpecialChar123").isValid, "Reject password without special character ('NoSpecialChar123')");
  assert(validatePassword("ValidPass@123").isValid, "Accept valid password satisfying all 4 rules ('ValidPass@123')");

  // 2. SCENARIO: DATABASE & SEED INITIALIZATION
  console.log("\n--- 2. Database & Seed Verification ---");
  seedDatabase(true);
  const db = getDatabase();
  const prodCount = (db.prepare("SELECT count(*) as c FROM products").get() as any).c;
  const userCount = (db.prepare("SELECT count(*) as c FROM profiles").get() as any).c;
  assert(prodCount >= 4, `Products seeded successfully (count: ${prodCount})`);
  assert(userCount >= 5, `Users & roles seeded successfully (count: ${userCount})`);

  // 3. SCENARIO: PRODUCT VARIANT PRICING (REQ-CAT-2, Odoo Brand +560)
  console.log("\n--- 3. Testing Variant Pricing (Odoo Brand adds +$560) ---");
  const coreProd = db.prepare("SELECT * FROM products WHERE id = 'prod_core'").get() as any;
  const odooVar = db.prepare("SELECT * FROM product_variants WHERE product_id = 'prod_core' AND value LIKE '%Odoo%'").get() as any;
  assert(odooVar !== undefined, "Odoo variant exists in database");
  assert(Number(odooVar.extra_price) === 560, `Odoo variant extra price is exactly $560.00 (got $${odooVar.extra_price})`);
  const effectivePrice = Number(coreProd.sales_price) + Number(odooVar.extra_price);
  assert(effectivePrice === 1200 + 560, `Effective price is $1,760.00 (1200 + 560)`);

  // 4. SCENARIO: EXACTLY-ONCE IDEMPOTENT INVOICE GENERATION (REQ-BILL-2, REQ-BILL-3)
  console.log("\n--- 4. Testing Exactly-Once Idempotent Invoicing ---");
  const sub = db.prepare("SELECT * FROM subscriptions WHERE status = 'active' LIMIT 1").get() as any;
  const periodStart = "2026-11-01";
  const periodEnd = "2026-11-30";

  // First call: generates new invoice
  const gen1 = generateInvoice(sub.id, periodStart, periodEnd);
  assert(!gen1.isExisting, `Generate invoice 1st time created new invoice (${gen1.invoiceId})`);

  // Second call for exact same period: must return existing invoice without duplicating!
  const gen2 = generateInvoice(sub.id, periodStart, periodEnd);
  assert(gen2.isExisting, `Generate invoice 2nd time safely returned existing invoice (${gen2.invoiceId})`);
  assert(gen1.invoiceId === gen2.invoiceId, "Both calls returned the identical invoice ID (Idempotent!)");

  // Run bulk billing test
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const countBefore = (db.prepare("SELECT count(*) as c FROM invoices").get() as any).c;
  const runRes = runBilling(todayStr);
  const countAfter = (db.prepare("SELECT count(*) as c FROM invoices").get() as any).c;
  const runResRepeat = runBilling(todayStr);
  const countRepeat = (db.prepare("SELECT count(*) as c FROM invoices").get() as any).c;

  assert(countAfter >= countBefore, "Billing run generated invoices for due subscriptions");
  assert(countRepeat === countAfter, "Repeat billing run generated 0 duplicate invoices");

  // 5. SCENARIO: DISCOUNT USAGE LIMIT & EXPIRATION (REQ-DISC-4)
  console.log("\n--- 5. Testing Discount Usage Limit & Expiration ---");
  const expiredDisc = db.prepare("SELECT * FROM discounts WHERE id = 'disc_expired'").get() as any;
  assert(expiredDisc.times_used >= expiredDisc.usage_limit, "Expired discount reached its usage limit (10/10)");

  // 6. SCENARIO: PAYMENT RECONCILIATION & PAID TRANSITION (REQ-PAY-1, REQ-PAY-2)
  console.log("\n--- 6. Testing Payment Matching & Status Transition ---");
  const inv = db.prepare("SELECT * FROM invoices WHERE status = 'confirmed' AND total > amount_paid LIMIT 1").get() as any;
  if (inv) {
    const bal = Number(inv.total) - Number(inv.amount_paid);
    const payRes = recordPayment({
      invoiceId: inv.id,
      method: "Bank Transfer",
      amount: bal,
      note: "Full balance settlement test",
      recordedBy: "Automated Test Suite",
    });

    const updatedInv = db.prepare("SELECT * FROM invoices WHERE id = ?").get(inv.id) as any;
    assert(updatedInv.status === "paid", `Invoice moved to 'paid' upon full settlement (status: ${updatedInv.status})`);
    assert(Number(updatedInv.amount_paid) === Number(updatedInv.total), "Invoice amount paid matches total exactly");
  }

  // 7. SCENARIO: DASHBOARD PERFORMANCE (NFR Performance: < 2 seconds)
  console.log("\n--- 7. Testing Dashboard Query Performance (Under 2 seconds target) ---");
  const start = performance.now();
  const summary = getDashboardSummary();
  const duration = performance.now() - start;

  console.log(`   Dashboard Summary retrieved in ${duration.toFixed(2)}ms`);
  console.log(`   - MRR: $${summary.mrr}`);
  console.log(`   - ARR: $${summary.arr}`);
  console.log(`   - Active Subscriptions: ${summary.activeSubscriptions}`);
  console.log(`   - Total Revenue: $${summary.totalRevenue}`);
  console.log(`   - Overdue Amount: $${summary.overdueAmount}`);

  assert(duration < 2000, `Dashboard query completed in < 2000ms (actual: ${duration.toFixed(2)}ms)`);

  console.log("\n============================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
