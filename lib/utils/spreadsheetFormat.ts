export type PeriodFilter = "day" | "week" | "month";

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function filterByPeriod<T extends { date: string }>(
  rows: T[],
  period: PeriodFilter
): T[] {
  if (rows.length === 0) return [];
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (period === "day") {
    return rows.filter((r) => r.date === today);
  }

  if (period === "week") {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    return rows.filter((r) => r.date >= weekStartStr && r.date <= today);
  }

  if (period === "month") {
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    return rows.filter((r) => r.date >= monthStart && r.date <= today);
  }

  return rows;
}
