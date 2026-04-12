import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MetricKey } from "@/lib/metric-catalogue";

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

export async function resolveDrainerSectionId(
  admin: SupabaseClient,
  unifiedSectionId: string
): Promise<string | null> {
  const { data: direct } = await admin
    .from("drainer_sections")
    .select("id")
    .eq("id", unifiedSectionId)
    .maybeSingle();
  if (direct?.id) return direct.id;

  const { data: row } = await admin.from("sections").select("app_config").eq("id", unifiedSectionId).maybeSingle();
  const cfg = row?.app_config as Record<string, unknown> | null;
  const legacy = cfg?.legacy_id;
  if (legacy != null && String(legacy).length > 0) {
    const lid = String(legacy);
    const { data: ds } = await admin.from("drainer_sections").select("id").eq("id", lid).maybeSingle();
    if (ds?.id) return ds.id;
  }
  return null;
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
  const drainerSid = sectionId ? await resolveDrainerSectionId(admin, sectionId) : null;
  const chainageRange =
    subsectionId && drainerSid ? await getSubsectionChainageRange(admin, subsectionId) : null;

  if (
    subsectionId &&
    (metricKey === "pipes_today" || metricKey === "pipes_this_month" || metricKey === "pipes_total") &&
    !chainageRange
  ) {
    return 0;
  }

  switch (metricKey) {
    case "pipes_today": {
      if (!drainerSid) return 0;
      let q = admin
        .from("drainer_pipe_records")
        .select("id", { count: "exact", head: true })
        .eq("section_id", drainerSid)
        .eq("date_installed", dateStr);
      if (chainageRange) {
        q = q.gte("chainage", chainageRange.min).lte("chainage", chainageRange.max);
      }
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    case "pipes_this_month": {
      if (!drainerSid) return 0;
      const { start, end } = monthBoundsPerth(dateStr);
      const d0 = start.split("T")[0];
      const d1 = end.split("T")[0];
      let q = admin
        .from("drainer_pipe_records")
        .select("id", { count: "exact", head: true })
        .eq("section_id", drainerSid)
        .gte("date_installed", d0)
        .lte("date_installed", d1);
      if (chainageRange) {
        q = q.gte("chainage", chainageRange.min).lte("chainage", chainageRange.max);
      }
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    case "pipes_total": {
      if (!drainerSid) return 0;
      let q = admin
        .from("drainer_pipe_records")
        .select("id", { count: "exact", head: true })
        .eq("section_id", drainerSid);
      if (chainageRange) {
        q = q.gte("chainage", chainageRange.min).lte("chainage", chainageRange.max);
      }
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
      if (!drainerSid) return 0;
      const { count, error } = await admin
        .from("drainer_pipe_records")
        .select("id", { count: "exact", head: true })
        .eq("section_id", drainerSid)
        .eq("joint_type", "WR");
      if (error) throw error;
      return count ?? 0;
    }
    case "water_loads_today": {
      if (!crewId) return 0;
      const { start, end } = dayStartEndPerth(dateStr);
      const { count, error } = await admin
        .from("wc_water_logs")
        .select("id", { count: "exact", head: true })
        .eq("crew_id", crewId)
        .gte("created_at", start)
        .lte("created_at", end);
      if (error) throw error;
      return count ?? 0;
    }
    case "water_liters_today": {
      if (!crewId) return 0;
      const { start, end } = dayStartEndPerth(dateStr);
      const { data, error } = await admin
        .from("wc_water_logs")
        .select("volume_liters")
        .eq("crew_id", crewId)
        .gte("created_at", start)
        .lte("created_at", end);
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
