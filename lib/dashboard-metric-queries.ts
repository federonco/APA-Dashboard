import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MetricKey } from "@/lib/metric-catalogue";
import { getVehicleIdsForCrew } from "@/lib/queries/daily";

function dayStartEndPerth(dateStr: string): { start: string; end: string } {
  return {
    start: `${dateStr}T00:00:00+08:00`,
    end: `${dateStr}T23:59:59.999+08:00`,
  };
}

function monthBoundsPerth(anchorDate: string): { start: string; end: string } {
  const [ys, ms] = anchorDate.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m) {
    const d = new Date();
    return monthBoundsPerth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
    );
  }
  const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return {
    start: `${startStr}T00:00:00+08:00`,
    end: `${endStr}T23:59:59.999+08:00`,
  };
}

function perthTodayUtcRange(): { startUTC: string; endUTC: string } {
  const perthNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Perth" }));
  const todayPerth = perthNow.toISOString().split("T")[0];
  const tomorrowPerth = new Date(perthNow.getTime() + 86400000).toISOString().split("T")[0];
  const startUTC = new Date(`${todayPerth}T00:00:00+08:00`).toISOString();
  const endUTC = new Date(`${tomorrowPerth}T00:00:00+08:00`).toISOString();
  return { startUTC, endUTC };
}

/** How to filter `drainer_pipe_records` for dashboard metrics (pipes / welds). */
export type DrainerPipeScope =
  | { mode: "legacy_section_id"; value: string }
  | { mode: "subsection_id"; value: string }
  | { mode: "unified_section_id"; value: string };

/**
 * Resolves how to query `drainer_pipe_records` for a dashboard card.
 * - Subsection cards: prefer legacy `section_id` (drainer_sections PK) from `subsections.app_config` when present;
 *   otherwise filter by `subsection_id`.
 * - Section-only cards: only pipes on that section's legacy drainer row (no rollup of child subsections).
 */
export async function resolveDrainerScopeForCard(
  admin: SupabaseClient,
  cardConfig: { sectionId: string | null; subsectionId: string | null }
): Promise<DrainerPipeScope | null> {
  const { sectionId, subsectionId } = cardConfig;

  if (subsectionId) {
    const { data: sub, error } = await admin
      .from("subsections")
      .select("app_config")
      .eq("id", subsectionId)
      .maybeSingle();
    if (error || !sub) return null;
    const cfg = (sub as { app_config?: Record<string, unknown> | null }).app_config;
    const leg = cfg?.legacy_id;
    if (leg != null && String(leg).trim() !== "") {
      return { mode: "legacy_section_id", value: String(leg) };
    }
    return { mode: "subsection_id", value: subsectionId };
  }

  if (!sectionId) return null;

  const { data: drDirect } = await admin
    .from("drainer_sections")
    .select("id")
    .eq("id", sectionId)
    .maybeSingle();
  if (drDirect?.id) {
    return { mode: "legacy_section_id", value: sectionId };
  }

  const { data: sec } = await admin
    .from("sections")
    .select("app_config")
    .eq("id", sectionId)
    .maybeSingle();
  const cfg = sec?.app_config as Record<string, unknown> | null;
  const leg = cfg?.legacy_id;
  if (leg != null && String(leg).trim() !== "") {
    return { mode: "legacy_section_id", value: String(leg) };
  }

  return null;
}

function applyDrainerPipeScope<T extends { eq: (c: string, v: string) => T }>(
  q: T,
  scope: DrainerPipeScope
): T {
  if (scope.mode === "legacy_section_id") return q.eq("section_id", scope.value);
  if (scope.mode === "subsection_id") return q.eq("subsection_id", scope.value);
  return q.eq("unified_section_id", scope.value);
}

/** @deprecated Prefer `resolveDrainerScopeForCard` for metrics; kept for callers that only have a unified section id. */
export async function resolveDrainerSectionId(
  admin: SupabaseClient,
  unifiedSectionId: string
): Promise<string | null> {
  const scope = await resolveDrainerScopeForCard(admin, {
    sectionId: unifiedSectionId,
    subsectionId: null,
  });
  if (scope?.mode === "legacy_section_id") return scope.value;
  return null;
}

/** Same crew scoping as fetchWaterByTask / fetchWaterToday (legacy rows: crew_id null + vehicle on crew). */
async function wcWaterLogsCrewFilter(
  crewId: string
): Promise<{ or: string } | { eqCrew: string }> {
  const vehicleIds = await getVehicleIdsForCrew(crewId);
  if (vehicleIds.length > 0) {
    return {
      or: `crew_id.eq.${crewId},and(crew_id.is.null,vehicle_id.in.(${vehicleIds.join(",")}))`,
    };
  }
  return { eqCrew: crewId };
}

export async function getSubsectionChainageRange(
  admin: SupabaseClient,
  subsectionId: string
): Promise<{ min: number; max: number } | null> {
  const { data, error } = await admin
    .from("subsections")
    .select("start_ch, end_ch")
    .eq("id", subsectionId)
    .maybeSingle();
  if (error || !data) return null;
  const a = Number((data as { start_ch?: unknown }).start_ch);
  const b = Number((data as { end_ch?: unknown }).end_ch);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export async function computeMetricValue(
  metricKey: MetricKey,
  opts: {
    sectionId: string | null;
    subsectionId: string | null;
    crewId: string | null;
    dateStr: string;
  }
): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;

  const { sectionId, subsectionId, crewId, dateStr } = opts;

  const resolveLegacySectionId = async (): Promise<string | null> => {
    if (!sectionId) {
      console.warn("[weld/wrap metric] missing section_id", { metric_key: metricKey, section_id: sectionId });
      return null;
    }
    const { data: sec, error } = await admin
      .from("sections")
      .select("app_config")
      .eq("id", sectionId)
      .maybeSingle();
    if (error) {
      console.warn("[weld/wrap metric] failed to resolve legacy_id", {
        metric_key: metricKey,
        section_id: sectionId,
        error: error.message,
      });
      return null;
    }
    const cfg = (sec?.app_config as Record<string, unknown> | null) ?? null;
    const legacySectionId =
      cfg?.legacy_id != null && String(cfg.legacy_id).trim() !== ""
        ? String(cfg.legacy_id).trim()
        : null;
    if (!legacySectionId) {
      console.warn("[weld/wrap metric] legacySectionId missing", {
        metric_key: metricKey,
        section_id: sectionId,
        legacySectionId,
      });
      return null;
    }
    return legacySectionId;
  };

  const pipeScope =
    metricKey === "pipes_today" ||
    metricKey === "pipes_this_month" ||
    metricKey === "pipes_total" ||
    metricKey === "welds_required" ||
    metricKey === "weld_done" ||
    metricKey === "weld_done_today" ||
    metricKey === "weld_cumulative" ||
    metricKey === "wrap_done" ||
    metricKey === "wrap_done_today" ||
    metricKey === "wrap_cumulative"
      ? await resolveDrainerScopeForCard(admin, { sectionId, subsectionId })
      : null;

  switch (metricKey) {
    case "pipes_today": {
      if (!pipeScope) return 0;
      let q = admin
        .from("drainer_pipe_records")
        .select("id", { count: "exact", head: true })
        .eq("date_installed", dateStr);
      q = applyDrainerPipeScope(q, pipeScope);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    case "pipes_this_month": {
      if (!pipeScope) return 0;
      const { start, end } = monthBoundsPerth(dateStr);
      const d0 = start.split("T")[0];
      const d1 = end.split("T")[0];
      let q = admin
        .from("drainer_pipe_records")
        .select("id", { count: "exact", head: true })
        .gte("date_installed", d0)
        .lte("date_installed", d1);
      q = applyDrainerPipeScope(q, pipeScope);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    case "pipes_total": {
      if (!pipeScope) return 0;
      let q = admin.from("drainer_pipe_records").select("id", { count: "exact", head: true });
      q = applyDrainerPipeScope(q, pipeScope);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    case "psp_today": {
      if (!sectionId) return 0;
      const { start, end } = dayStartEndPerth(dateStr);
      let q = admin
        .from("psp_records")
        .select("id", { count: "exact", head: true })
        .eq("unified_section_id", sectionId)
        .gte("recorded_at", start)
        .lte("recorded_at", end);
      if (subsectionId) {
        q = q.eq("subsection_id", subsectionId);
      }
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    case "psp_this_month": {
      if (!sectionId) return 0;
      const { start, end } = monthBoundsPerth(dateStr);
      let q = admin
        .from("psp_records")
        .select("id", { count: "exact", head: true })
        .eq("unified_section_id", sectionId)
        .gte("recorded_at", start)
        .lte("recorded_at", end);
      if (subsectionId) {
        q = q.eq("subsection_id", subsectionId);
      }
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    case "psp_total": {
      if (!sectionId) return 0;
      let q = admin
        .from("psp_records")
        .select("id", { count: "exact", head: true })
        .eq("unified_section_id", sectionId);
      if (subsectionId) {
        q = q.eq("subsection_id", subsectionId);
      }
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    case "welds_required": {
      if (!pipeScope) return 0;
      let q = admin
        .from("drainer_pipe_records")
        .select("id", { count: "exact", head: true })
        .in("joint_type", ["WR", "WB"]);
      q = applyDrainerPipeScope(q, pipeScope);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    case "weld_done": {
      const legacySectionId = await resolveLegacySectionId();
      if (!legacySectionId) return 0;
      const { data: rows, error } = await admin
        .from("drainer_pipe_records")
        .select("joint_type, welded_at, weld_step_e1_at, weld_step_e2_at, weld_step_i1_at, weld_step_i2_at")
        .eq("section_id", legacySectionId)
        .in("joint_type", ["WR", "WB", "Transition+WR"]);
      if (error) throw error;
      const weldUnits = (rows ?? []).reduce((sum, row) => {
        const r = row as {
          joint_type?: string | null;
          welded_at?: string | null;
          weld_step_e1_at?: string | null;
          weld_step_e2_at?: string | null;
          weld_step_i1_at?: string | null;
          weld_step_i2_at?: string | null;
        };
        if (r.joint_type === "WB") {
          const pending = [
            r.weld_step_e1_at,
            r.weld_step_e2_at,
            r.weld_step_i1_at,
            r.weld_step_i2_at,
          ].filter((step) => step == null).length;
          return sum + pending;
        }
        return r.welded_at == null ? sum + 1 : sum;
      }, 0);
      return weldUnits;
    }
    case "weld_done_today": {
      const legacySectionId = await resolveLegacySectionId();
      if (!legacySectionId) return 0;
      const { startUTC, endUTC } = perthTodayUtcRange();
      const { data: rows, error } = await admin
        .from("drainer_pipe_records")
        .select("joint_type, welded_at, weld_step_e1_at, weld_step_e2_at, weld_step_i1_at, weld_step_i2_at")
        .eq("section_id", legacySectionId)
        .in("joint_type", ["WR", "WB", "Transition+WR"]);
      if (error) throw error;
      const weldUnits = (rows ?? []).reduce((sum, row) => {
        const r = row as {
          joint_type?: string | null;
          welded_at?: string | null;
          weld_step_e1_at?: string | null;
          weld_step_e2_at?: string | null;
          weld_step_i1_at?: string | null;
          weld_step_i2_at?: string | null;
        };
        if (r.joint_type === "WB") {
          const completedToday = [
            r.weld_step_e1_at,
            r.weld_step_e2_at,
            r.weld_step_i1_at,
            r.weld_step_i2_at,
          ].filter((step) => step != null && step >= startUTC && step < endUTC).length;
          return sum + completedToday;
        }
        if (r.welded_at != null && r.welded_at >= startUTC && r.welded_at < endUTC) {
          return sum + 1;
        }
        return sum;
      }, 0);
      return weldUnits;
    }
    case "wrap_done": {
      const legacySectionId = await resolveLegacySectionId();
      if (!legacySectionId) return 0;
      const { count, error } = await admin
        .from("drainer_pipe_records")
        .select("id", { count: "exact", head: true })
        .eq("section_id", legacySectionId)
        .in("joint_type", ["WR", "Transition+WR"])
        .not("welded_at", "is", null)
        .is("wrapped_at", null);
      if (error) throw error;
      return count ?? 0;
    }
    case "wrap_done_today": {
      const legacySectionId = await resolveLegacySectionId();
      if (!legacySectionId) return 0;
      const { startUTC, endUTC } = perthTodayUtcRange();
      const { count, error } = await admin
        .from("drainer_pipe_records")
        .select("id", { count: "exact", head: true })
        .eq("section_id", legacySectionId)
        .in("joint_type", ["WR", "Transition+WR"])
        .gte("wrapped_at", startUTC)
        .lt("wrapped_at", endUTC);
      if (error) throw error;
      return count ?? 0;
    }
    case "weld_cumulative": {
      const legacySectionId = await resolveLegacySectionId();
      if (!legacySectionId) return 0;
      const { data: rows, error } = await admin
        .from("drainer_pipe_records")
        .select("joint_type, welded_at, weld_step_e1_at, weld_step_e2_at, weld_step_i1_at, weld_step_i2_at")
        .eq("section_id", legacySectionId)
        .in("joint_type", ["WR", "WB", "Transition+WR"]);
      if (error) throw error;
      return (rows ?? []).reduce((sum, row) => {
        const r = row as {
          joint_type?: string | null;
          welded_at?: string | null;
          weld_step_e1_at?: string | null;
          weld_step_e2_at?: string | null;
          weld_step_i1_at?: string | null;
          weld_step_i2_at?: string | null;
        };
        if (r.joint_type === "WB") {
          const done = [
            r.weld_step_e1_at,
            r.weld_step_e2_at,
            r.weld_step_i1_at,
            r.weld_step_i2_at,
          ].filter((step) => step != null).length;
          return sum + done;
        }
        return r.welded_at != null ? sum + 1 : sum;
      }, 0);
    }
    case "wrap_cumulative": {
      const legacySectionId = await resolveLegacySectionId();
      if (!legacySectionId) return 0;
      const { count, error } = await admin
        .from("drainer_pipe_records")
        .select("id", { count: "exact", head: true })
        .eq("section_id", legacySectionId)
        .in("joint_type", ["WR", "Transition+WR"])
        .not("wrapped_at", "is", null);
      if (error) throw error;
      return count ?? 0;
    }
    case "water_loads_today": {
      if (!crewId) return 0;
      const { start, end } = dayStartEndPerth(dateStr);
      const crewScope = await wcWaterLogsCrewFilter(crewId);
      let q = admin
        .from("wc_water_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start)
        .lte("created_at", end);
      q = "or" in crewScope ? q.or(crewScope.or) : q.eq("crew_id", crewScope.eqCrew);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    case "water_liters_today": {
      if (!crewId) return 0;
      const { start, end } = dayStartEndPerth(dateStr);
      const crewScope = await wcWaterLogsCrewFilter(crewId);
      let q = admin
        .from("wc_water_logs")
        .select("volume_liters")
        .gte("created_at", start)
        .lte("created_at", end);
      q = "or" in crewScope ? q.or(crewScope.or) : q.eq("crew_id", crewScope.eqCrew);
      const { data, error } = await q;
      if (error) throw error;
      const sum = (data ?? []).reduce(
        (s, r) => s + (Number((r as { volume_liters?: number }).volume_liters) || 0),
        0
      );
      return Math.round(sum * 10) / 10;
    }
    default:
      return 0;
  }
}
