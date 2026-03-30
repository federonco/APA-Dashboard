export function parseDateOnlyLocal(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const dt = new Date(y, mo - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function calendarSpanInclusiveDays(startDate: string, endDate: string): number {
  const s = parseDateOnlyLocal(startDate);
  const e = parseDateOnlyLocal(endDate);
  if (!s || !e) return 0;
  const ms = e.getTime() - s.getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)) + 1);
}

