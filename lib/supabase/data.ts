import { createAdminClient } from "./admin";
import { getDatabase } from "@/lib/db/database";
import { format } from "date-fns";

export function isSupabaseActive(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("supabase.co")
  );
}

// ----------------------------------------------------------------------------
// PRODUCTS & VARIANTS
// ----------------------------------------------------------------------------
export async function fetchProducts() {
  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("*, variants:product_variants(*)")
        .order("name", { ascending: true });

      if (!pErr && products) {
        return products.map((p) => ({
          ...p,
          variants: p.variants || [],
        }));
      }
    } catch (err: any) {
      console.warn("[Live Provider] Supabase fetchProducts fallback:", err.message);
    }
  }

  // SQLite Fallback
  const db = getDatabase();
  const products = db.prepare(`SELECT * FROM products ORDER BY name ASC`).all() as any[];
  const variants = db.prepare(`SELECT * FROM product_variants ORDER BY attribute, value`).all() as any[];
  return products.map((p) => ({
    ...p,
    variants: variants.filter((v) => v.product_id === p.id),
  }));
}

// ----------------------------------------------------------------------------
// PLANS
// ----------------------------------------------------------------------------
export async function fetchPlans() {
  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price", { ascending: true });

      if (!error && data) return data;
    } catch (err: any) {
      console.warn("[Live Provider] Supabase fetchPlans fallback:", err.message);
    }
  }

  const db = getDatabase();
  return db.prepare(`SELECT * FROM plans ORDER BY price ASC`).all();
}

// ----------------------------------------------------------------------------
// TAXES
// ----------------------------------------------------------------------------
export async function fetchTaxes() {
  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("taxes")
        .select("*")
        .order("rate", { ascending: true });

      if (!error && data) return data;
    } catch (err: any) {
      console.warn("[Live Provider] Supabase fetchTaxes fallback:", err.message);
    }
  }

  const db = getDatabase();
  return db.prepare(`SELECT * FROM taxes ORDER BY rate ASC`).all();
}

// ----------------------------------------------------------------------------
// DISCOUNTS
// ----------------------------------------------------------------------------
export async function fetchDiscounts() {
  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("discounts")
        .select("*, product:products(name)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map((d: any) => ({
          ...d,
          product_name: d.product?.name || null,
        }));
      }
    } catch (err: any) {
      console.warn("[Live Provider] Supabase fetchDiscounts fallback:", err.message);
    }
  }

  const db = getDatabase();
  return db
    .prepare(
      `SELECT d.*, p.name as product_name
       FROM discounts d
       LEFT JOIN products p ON d.product_id = p.id
       ORDER BY d.created_at DESC`
    )
    .all();
}

// ----------------------------------------------------------------------------
// CUSTOMERS
// ----------------------------------------------------------------------------
export async function fetchCustomers(userId?: string) {
  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("customers").select("*, subscriptions(id, status), invoices(id)");
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query.order("name", { ascending: true });
      if (!error && data) {
        return data.map((c: any) => ({
          ...c,
          active_subs_count: c.subscriptions?.filter((s: any) => s.status === "active").length || 0,
          total_invoices_count: c.invoices?.length || 0,
        }));
      }
    } catch (err: any) {
      console.warn("[Live Provider] Supabase fetchCustomers fallback:", err.message);
    }
  }

  const db = getDatabase();
  let query = `
    SELECT c.*, 
           (SELECT count(*) FROM subscriptions WHERE customer_id = c.id AND status = 'active') as active_subs_count,
           (SELECT count(*) FROM invoices WHERE customer_id = c.id) as total_invoices_count
    FROM customers c
    WHERE 1=1
  `;
  const params: any[] = [];
  if (userId) {
    query += ` AND c.user_id = ?`;
    params.push(userId);
  }
  query += ` ORDER BY c.name ASC`;
  return db.prepare(query).all(...params);
}

// ----------------------------------------------------------------------------
// SUBSCRIPTIONS
// ----------------------------------------------------------------------------
export async function fetchSubscriptions(filter?: {
  userId?: string;
  customerId?: string;
  status?: string;
}) {
  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("subscriptions").select(`
        *,
        customer:customers(id, name, company, email, user_id),
        plan:plans(name, billing_period, price, auto_close, closable, pausable, renewable),
        payment_terms:payment_terms(name, days_due),
        lines:subscription_lines(amount)
      `);

      if (filter?.userId) {
        query = query.eq("customer.user_id", filter.userId);
      }
      if (filter?.customerId) {
        query = query.eq("customer_id", filter.customerId);
      }
      if (filter?.status && filter.status !== "all") {
        query = query.eq("status", filter.status);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((s: any) => ({
          ...s,
          customer_name: s.customer?.name,
          customer_company: s.customer?.company,
          customer_email: s.customer?.email,
          plan_name: s.plan?.name,
          billing_period: s.plan?.billing_period,
          plan_price: s.plan?.price,
          auto_close: s.plan?.auto_close,
          closable: s.plan?.closable,
          pausable: s.plan?.pausable,
          renewable: s.plan?.renewable,
          payment_terms_name: s.payment_terms?.name,
          days_due: s.payment_terms?.days_due,
          sub_total: (s.lines || []).reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0),
        }));
      }
    } catch (err: any) {
      console.warn("[Live Provider] Supabase fetchSubscriptions fallback:", err.message);
    }
  }

  const db = getDatabase();
  let query = `
    SELECT s.*, 
           c.name as customer_name, c.company as customer_company, c.email as customer_email,
           p.name as plan_name, p.billing_period, p.price as plan_price,
           p.auto_close, p.closable, p.pausable, p.renewable,
           pt.name as payment_terms_name, pt.days_due,
           (SELECT COALESCE(sum(amount), 0) FROM subscription_lines WHERE subscription_id = s.id) as sub_total
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN plans p ON s.plan_id = p.id
    JOIN payment_terms pt ON s.payment_terms_id = pt.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (filter?.userId) {
    query += ` AND c.user_id = ?`;
    params.push(filter.userId);
  } else if (filter?.customerId) {
    query += ` AND s.customer_id = ?`;
    params.push(filter.customerId);
  }
  if (filter?.status && filter.status !== "all") {
    query += ` AND s.status = ?`;
    params.push(filter.status);
  }
  query += ` ORDER BY s.created_at DESC`;
  return db.prepare(query).all(...params);
}

// ----------------------------------------------------------------------------
// INVOICES
// ----------------------------------------------------------------------------
export async function fetchInvoices(filter?: {
  userId?: string;
  customerId?: string;
  status?: string;
}) {
  const today = format(new Date(), "yyyy-MM-dd");

  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("invoices").select(`
        *,
        customer:customers(id, name, company, email, user_id),
        subscription:subscriptions(number)
      `);

      if (filter?.userId) {
        query = query.eq("customer.user_id", filter.userId);
      }
      if (filter?.customerId) {
        query = query.eq("customer_id", filter.customerId);
      }
      if (filter?.status && filter.status !== "all") {
        if (filter.status === "overdue") {
          query = query.eq("status", "confirmed").lt("due_date", today);
        } else if (filter.status === "outstanding") {
          query = query.eq("status", "confirmed");
        } else {
          query = query.eq("status", filter.status);
        }
      }

      const { data, error } = await query.order("invoice_date", { ascending: false });
      if (!error && data) {
        return data.map((i: any) => {
          const tot = Number(i.total) || 0;
          const paid = Number(i.amount_paid) || 0;
          return {
            ...i,
            customer_name: i.customer?.name,
            customer_company: i.customer?.company,
            customer_email: i.customer?.email,
            subscription_number: i.subscription?.number,
            balance_due: tot - paid,
            is_overdue: i.status === "confirmed" && tot > paid && i.due_date < today ? 1 : 0,
          };
        });
      }
    } catch (err: any) {
      console.warn("[Live Provider] Supabase fetchInvoices fallback:", err.message);
    }
  }

  const db = getDatabase();
  let query = `
    SELECT i.*, 
           c.name as customer_name, c.company as customer_company, c.email as customer_email,
           s.number as subscription_number,
           (i.total - i.amount_paid) as balance_due,
           CASE 
             WHEN i.status = 'confirmed' AND i.total > i.amount_paid AND i.due_date < ? THEN 1 
             ELSE 0 
           END as is_overdue
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    JOIN subscriptions s ON i.subscription_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [today];
  if (filter?.userId) {
    query += ` AND c.user_id = ?`;
    params.push(filter.userId);
  } else if (filter?.customerId) {
    query += ` AND i.customer_id = ?`;
    params.push(filter.customerId);
  }
  if (filter?.status && filter.status !== "all") {
    if (filter.status === "overdue") {
      query += ` AND i.status = 'confirmed' AND i.total > i.amount_paid AND i.due_date < ?`;
      params.push(today);
    } else if (filter.status === "outstanding") {
      query += ` AND i.status = 'confirmed' AND i.total > i.amount_paid`;
    } else {
      query += ` AND i.status = ?`;
      params.push(filter.status);
    }
  }
  query += ` ORDER BY i.invoice_date DESC`;
  return db.prepare(query).all(...params);
}

// ----------------------------------------------------------------------------
// PAYMENTS
// ----------------------------------------------------------------------------
export async function fetchPayments(userId?: string) {
  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from("payments").select(`
        *,
        invoice:invoices(number, total, status, customer_id, customer:customers(name, company, user_id))
      `);

      if (userId) {
        query = query.eq("invoice.customer.user_id", userId);
      }

      const { data, error } = await query.order("payment_date", { ascending: false });
      if (!error && data) {
        return data.map((p: any) => ({
          ...p,
          invoice_number: p.invoice?.number,
          invoice_total: p.invoice?.total,
          invoice_status: p.invoice?.status,
          customer_name: p.invoice?.customer?.name,
          customer_company: p.invoice?.customer?.company,
        }));
      }
    } catch (err: any) {
      console.warn("[Live Provider] Supabase fetchPayments fallback:", err.message);
    }
  }

  const db = getDatabase();
  let query = `
    SELECT p.*, 
           i.number as invoice_number, i.total as invoice_total, i.status as invoice_status,
           c.name as customer_name, c.company as customer_company
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN customers c ON i.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (userId) {
    query += ` AND c.user_id = ?`;
    params.push(userId);
  }
  query += ` ORDER BY p.payment_date DESC, p.created_at DESC`;
  return db.prepare(query).all(...params);
}

// ----------------------------------------------------------------------------
// DASHBOARD SUMMARY
// ----------------------------------------------------------------------------
export async function fetchDashboardSummary() {
  const today = format(new Date(), "yyyy-MM-dd");

  if (isSupabaseActive()) {
    try {
      const supabase = createAdminClient();

      const [
        { data: activeSubs },
        { data: payments },
        { data: invoices },
      ] = await Promise.all([
        supabase.from("subscriptions").select(`
          id, status, plan:plans(billing_period),
          lines:subscription_lines(amount)
        `).eq("status", "active"),
        supabase.from("payments").select("amount, payment_date"),
        supabase.from("invoices").select(`
          id, number, status, total, amount_paid, due_date,
          customer:customers(name, company)
        `),
      ]);

      if (activeSubs && payments && invoices) {
        // Calculate Total Revenue
        const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Amount Owed
        const confirmedInvoices = invoices.filter(
          (i) => i.status === "confirmed" && (Number(i.total) || 0) > (Number(i.amount_paid) || 0)
        );
        const amountOwed = confirmedInvoices.reduce(
          (sum, i) => sum + ((Number(i.total) || 0) - (Number(i.amount_paid) || 0)),
          0
        );

        // Overdue
        const overdueInvoices = confirmedInvoices
          .filter((i) => i.due_date < today)
          .map((i: any) => ({
            ...i,
            customer_name: i.customer?.name,
            customer_company: i.customer?.company,
          }));
        const overdueAmount = overdueInvoices.reduce(
          (sum, i) => sum + ((Number(i.total) || 0) - (Number(i.amount_paid) || 0)),
          0
        );

        // Normalized MRR
        let mrr = 0;
        for (const s of activeSubs as any[]) {
          const val = (s.lines || []).reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
          const period = s.plan?.billing_period || "monthly";
          switch (period) {
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

        // Revenue by month
        const monthlyMap = new Map<string, number>();
        for (const p of payments) {
          if (p.payment_date) {
            const m = p.payment_date.substring(0, 7);
            monthlyMap.set(m, (monthlyMap.get(m) || 0) + (Number(p.amount) || 0));
          }
        }
        const monthlyRevenue = Array.from(monthlyMap.entries())
          .map(([month, revenue]) => ({ month, revenue }))
          .sort((a, b) => a.month.localeCompare(b.month));

        // Subscriptions by status
        const { data: allSubs } = await supabase.from("subscriptions").select("status");
        const statusMap = new Map<string, number>();
        for (const s of allSubs || []) {
          statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);
        }
        const subsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
          status,
          count,
        }));

        return {
          activeSubscriptions: activeSubs.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          amountOwed: Math.round(amountOwed * 100) / 100,
          overdueCount: overdueInvoices.length,
          overdueAmount: Math.round(overdueAmount * 100) / 100,
          overdueInvoices,
          mrr: Math.round(mrr * 100) / 100,
          arr: Math.round(arr * 100) / 100,
          monthlyRevenue,
          subsByStatus,
        };
      }
    } catch (err: any) {
      console.warn("[Live Provider] Supabase fetchDashboardSummary fallback:", err.message);
    }
  }

  // SQLite Fallback
  const { getDashboardSummary } = await import("@/lib/db/billing-engine");
  return getDashboardSummary();
}
