import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";
import { getCurrentUser } from "@/lib/auth/session";
import { isCustomer } from "@/lib/auth/rbac";
import { format, addDays, addWeeks, addMonths, addYears, parseISO } from "date-fns";
import { syncRecordToSupabase } from "@/lib/supabase/sync";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action } = await request.json();
    const db = getDatabase();

    const sub = db
      .prepare(
        `SELECT s.*, c.user_id as customer_user_id,
                p.billing_period, p.auto_close, p.closable, p.pausable, p.renewable
         FROM subscriptions s
         JOIN customers c ON s.customer_id = c.id
         JOIN plans p ON s.plan_id = p.id
         WHERE s.id = ?`
      )
      .get(id) as any;

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Customer isolation: Customers can only perform actions if they own the subscription
    if (isCustomer(currentUser.role)) {
      if (sub.customer_user_id !== currentUser.id) {
        return NextResponse.json({ error: "Forbidden: Not your subscription" }, { status: 403 });
      }
    }

    let newStatus = sub.status;
    let newExpiryDate = sub.expiry_date;
    const oldStatus = sub.status;

    switch (action) {
      case "send_quotation":
        if (sub.status !== "draft") {
          return NextResponse.json({ error: "Only draft can be sent as quotation" }, { status: 400 });
        }
        newStatus = "quotation";
        break;

      case "confirm":
        if (sub.status !== "quotation" && sub.status !== "draft") {
          return NextResponse.json({ error: "Can only confirm from draft or quotation" }, { status: 400 });
        }
        newStatus = "confirmed";
        break;

      case "activate":
        if (sub.status !== "confirmed") {
          return NextResponse.json({ error: "Can only activate a confirmed subscription" }, { status: 400 });
        }
        newStatus = "active";
        break;

      case "pause":
        if (!sub.pausable) {
          return NextResponse.json({ error: "This plan does not permit pausing" }, { status: 400 });
        }
        if (sub.status !== "active") {
          return NextResponse.json({ error: "Can only pause an active subscription" }, { status: 400 });
        }
        newStatus = "paused";
        break;

      case "resume":
        if (sub.status !== "paused") {
          return NextResponse.json({ error: "Can only resume a paused subscription" }, { status: 400 });
        }
        newStatus = "active";
        break;

      case "renew":
        if (!sub.renewable) {
          return NextResponse.json({ error: "This plan is not renewable" }, { status: 400 });
        }
        // Extend expiry date by 1 billing period
        const baseDate = parseISO(sub.expiry_date);
        let extendedDate: Date;
        if (sub.billing_period === "daily") extendedDate = addDays(baseDate, 1);
        else if (sub.billing_period === "weekly") extendedDate = addWeeks(baseDate, 1);
        else if (sub.billing_period === "yearly") extendedDate = addYears(baseDate, 1);
        else extendedDate = addMonths(baseDate, 1);

        newExpiryDate = format(extendedDate, "yyyy-MM-dd");
        if (sub.status === "closed") {
          newStatus = "active";
        }
        break;

      case "close":
        if (!sub.closable) {
          return NextResponse.json({ error: "This plan cannot be closed early" }, { status: 400 });
        }
        newStatus = "closed";
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    db.prepare(
      `UPDATE subscriptions 
       SET status = ?, expiry_date = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(newStatus, newExpiryDate, id);

    // Sync to Supabase
    await syncRecordToSupabase("subscriptions", {
      id,
      status: newStatus,
      expiry_date: newExpiryDate,
      updated_at: new Date().toISOString(),
    });

    // Audit log
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_email, entity, entity_id, action, before_state, after_state)
       VALUES (?, ?, 'subscriptions', ?, ?, ?, ?)`
    ).run(
      currentUser.id,
      currentUser.email,
      id,
      `SUBSCRIPTION_${action.toUpperCase()}`,
      JSON.stringify({ status: oldStatus, expiry: sub.expiry_date }),
      JSON.stringify({ status: newStatus, expiry: newExpiryDate })
    );

    return NextResponse.json({
      success: true,
      status: newStatus,
      expiryDate: newExpiryDate,
      message: `Subscription successfully updated to ${newStatus}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
