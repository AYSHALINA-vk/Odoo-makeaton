import { NextResponse } from "next/server";
import { runBilling } from "@/lib/db/billing-engine";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { getDatabase } from "@/lib/db/database";
import { syncRecordToSupabase } from "@/lib/supabase/sync";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isStaff(currentUser.role)) {
    return NextResponse.json({ error: "Unauthorized: Staff access required" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const runDate = body.runDate; // Optional custom date, defaults to today in runBilling

    const result = runBilling(runDate);

    // Sync generated invoices and billing run to Supabase
    const db = getDatabase();
    try {
      const allInvoices = db.prepare(`SELECT * FROM invoices`).all();
      const allLines = db.prepare(`SELECT * FROM invoice_lines`).all();
      const allSubs = db.prepare(`SELECT * FROM subscriptions`).all();
      const allRuns = db.prepare(`SELECT * FROM billing_runs`).all();

      await syncRecordToSupabase("subscriptions", allSubs);
      await syncRecordToSupabase("invoices", allInvoices);
      await syncRecordToSupabase("invoice_lines", allLines);
      await syncRecordToSupabase("billing_runs", allRuns);
    } catch (err: any) {
      console.warn("Could not sync billing run to Supabase:", err.message);
    }

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, after_state)
       VALUES (?, ?, 'billing_runs', ?, 'BILLING_RUN_EXECUTED', ?)`
    ).run(
      currentUser.id,
      currentUser.email,
      result.runId,
      JSON.stringify({
        generated: result.generatedCount,
        skipped: result.skippedCount,
        failed: result.failedCount,
        runDate: result.runDate,
      })
    );

    return NextResponse.json({
      success: true,
      result,
      message: `Billing run complete: ${result.generatedCount} invoice(s) generated, ${result.skippedCount} skipped (already billed), ${result.failedCount} failed.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
