import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * For each section id, load public.sections.app_id. Fails if a section is missing
 * or has a null/empty app_id (so we never insert section rows without an app_id).
 */
export async function resolveSectionAppPairsForInsert(
  admin: SupabaseClient,
  sectionIds: string[]
): Promise<
  | { ok: true; pairs: { section_id: string; app_id: string }[] }
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

  const pairs: { section_id: string; app_id: string }[] = [];
  for (const sid of ids) {
    const row = byId.get(sid);
    if (!row) {
      return { ok: false, message: `Unknown section: ${sid}` };
    }
    const appId = row.app_id != null ? String(row.app_id).trim() : "";
    if (!appId) {
      return {
        ok: false,
        message: `Section "${sid}" has no app_id; set it in Sections admin first.`,
      };
    }
    pairs.push({ section_id: sid, app_id: appId });
  }

  return { ok: true, pairs };
}

/** Section rows: both app_id and section_id set. App-only rows: app_id set, section_id null. Never both null. */
export function isValidUserAppRoleInsertRow(r: {
  app_id?: string | null;
  section_id?: string | null;
}): boolean {
  const aid = r.app_id != null ? String(r.app_id).trim() : "";
  if (!aid) return false;
  if (r.section_id != null && String(r.section_id).trim() !== "") {
    return true;
  }
  return r.section_id === null;
}
