import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * For each section id, load public.sections.app_id (optional).
 * Global/shared sections may have app_id null — returned as null, not an error.
 */
export async function resolveSectionAppPairsForInsert(
  admin: SupabaseClient,
  sectionIds: string[]
): Promise<
  | { ok: true; pairs: { section_id: string; app_id: string | null }[] }
  | { ok: false; message: string }
> {
  const ids = [...new Set(sectionIds.map((id) => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { ok: true, pairs: [] };
  }

  const { data, error } = await admin.from("sections").select("id, app_id").in("id", ids);

  if (error) {
    return { ok: false, message: error.message };
  }

  const byId = new Map<string, { id: string; app_id: string | null }>();
  for (const r of data ?? []) {
    const row = r as { id: string; app_id: string | null };
    byId.set(row.id, row);
  }

  const pairs: { section_id: string; app_id: string | null }[] = [];
  for (const sid of ids) {
    const row = byId.get(sid);
    if (!row) {
      return { ok: false, message: `Unknown section: ${sid}` };
    }
    const raw = row.app_id != null ? String(row.app_id).trim() : "";
    pairs.push({
      section_id: sid,
      app_id: raw === "" ? null : raw,
    });
  }

  return { ok: true, pairs };
}

/**
 * Allowed rows:
 * - Section access: section_id set; app_id nullable (global sections).
 * - App access: app_id set; section_id null.
 * Rejects only: both app_id and section_id null/empty.
 */
export function isValidUserAppRoleInsertRow(r: {
  app_id?: string | null;
  section_id?: string | null;
}): boolean {
  const sid = r.section_id != null ? String(r.section_id).trim() : "";
  const hasSection = sid.length > 0;
  const aid = r.app_id != null ? String(r.app_id).trim() : "";
  const hasApp = aid.length > 0;
  if (hasSection) return true;
  return r.section_id === null && hasApp;
}
