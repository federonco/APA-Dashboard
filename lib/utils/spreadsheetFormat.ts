export type PeriodFilter = "day" | "week" | "month";

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function filterByPeriod<T extends { date: string }>(
  rows: T[],
  period: PeriodFilter,
  referenceDate?: string
): T[] {
  if (rows.length === 0) return [];
  const ref = referenceDate ? new Date(referenceDate + "T12:00:00") : new Date();
  const today = toLocalDateStr(ref);

  if (period === "day") {
    return rows.filter((r) => r.date === today);
  }

  if (period === "week") {
    const weekStart = new Date(ref);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = toLocalDateStr(weekStart);
    return rows.filter((r) => r.date >= weekStartStr && r.date <= today);
  }

  if (period === "month") {
    const monthStart = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-01`;
    return rows.filter((r) => r.date >= monthStart && r.date <= today);
  }

  return rows;
}
