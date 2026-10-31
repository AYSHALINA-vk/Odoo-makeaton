import { createAdminClient } from "./admin";

/**
 * Automatically syncs a single record or array of records to Supabase in the background.
 * Fails gracefully without throwing if offline or missing keys.
 */
export async function syncRecordToSupabase(table: string, record: any) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const supabase = createAdminClient();
    const records = Array.isArray(record) ? record : [record];

    const cleaned = records.map((r) => {
      const clean: any = { ...r };
      for (const k in clean) {
        // SQLite uses 0/1 for booleans; Postgres requires boolean
        if (["is_active", "auto_close", "closable", "pausable", "renewable"].includes(k)) {
          clean[k] = Boolean(clean[k]);
        }
        // customers.user_id must be a valid UUID or null in Postgres
        if (
          k === "user_id" &&
          clean[k] &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean[k])
        ) {
          clean[k] = null;
        }
      }
      return clean;
    });

    const conflictCol =
      table === "invoices"
        ? "number"
        : table === "subscriptions"
        ? "number"
        : table === "profiles"
        ? "email"
        : "id";

    const { error } = await supabase.from(table).upsert(cleaned, { onConflict: conflictCol });
    if (error) {
      console.warn(`[Supabase Sync Warning] ${table}:`, error.message);
    }
  } catch (err: any) {
    console.warn(`[Supabase Sync Skipped] ${table}:`, err.message);
  }
}

/**
 * Syncs a deletion to Supabase
 */
export async function deleteRecordFromSupabase(table: string, id: string) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const supabase = createAdminClient();
    await supabase.from(table).delete().eq("id", id);
  } catch (err: any) {
    console.warn(`[Supabase Delete Skipped] ${table}:`, err.message);
  }
}
