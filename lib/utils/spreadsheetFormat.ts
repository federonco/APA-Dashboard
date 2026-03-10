import type {
  SpreadsheetData,
  OnSiteDRow,
  OnSiteBRow,
  OnSiteWRow,
} from "@/lib/queries/spreadsheet";

export type PeriodFilter = "day" | "week" | "month";

function getDaysInRange(startStr: string, endStr: string): string[] {
  const days: string[] = [];
  const [y, m, d] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const endMs = new Date(ey, em - 1, ed).getTime();
  let curr = new Date(y, m - 1, d);
  while (curr.getTime() <= endMs) {
    const yy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, "0");
    const dd = String(curr.getDate()).padStart(2, "0");
    days.push(`${yy}-${mm}-${dd}`);
    curr.setDate(curr.getDate() + 1);
  }
  return days;
}

function expandWithZeroDays<T extends { date: string }>(
  rows: T[],
  allDays: string[],
  defaults: (date: string) => Partial<T>
): T[] {
  const byDate = new Map<string, T[]>();
  for (const r of rows) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }
  const result: T[] = [];
  for (const date of allDays) {
    const existing = byDate.get(date) ?? [];
    if (existing.length > 0) {
      result.push(...existing);
    } else {
      result.push({ date, ...defaults(date) } as T);
    }
  }
  return result;
}

export function filterByPeriod(
  data: SpreadsheetData,
  period: PeriodFilter
): SpreadsheetData {
  const today = new Date();
  const end = today.toISOString().split("T")[0];
  const start = new Date(today);

  if (period === "day") {
    return {
      onsiteD: data.onsiteD.filter((r) => r.date === end),
      onsiteB: data.onsiteB.filter((r) => r.date === end),
      onsiteW: data.onsiteW.filter((r) => r.date === end),
    };
  }

  if (period === "week") {
    start.setDate(start.getDate() - 6);
  } else {
    start.setMonth(start.getMonth() - 1);
  }
  const startStr = start.toISOString().split("T")[0];
  const allDays = getDaysInRange(startStr, end);

  const filteredD = data.onsiteD.filter(
    (r) => r.date >= startStr && r.date <= end
  );
  const filteredB = data.onsiteB.filter(
    (r) => r.date >= startStr && r.date <= end
  );
  const filteredW = data.onsiteW.filter(
    (r) => r.date >= startStr && r.date <= end
  );

  if (period === "week") {
    return {
      onsiteD: expandWithZeroDays(filteredD, allDays, (date) => ({
        section: "—",
        pipes_laid: 0,
        crew: "—",
      })) as OnSiteDRow[],
      onsiteB: expandWithZeroDays(filteredB, allDays, (date) => ({
        location: "—",
        backfill_m: 0,
        crew: "—",
      })) as OnSiteBRow[],
      onsiteW: expandWithZeroDays(filteredW, allDays, (date) => ({
        location: "—",
        water_m3: 0,
        destination: "—",
        crew: "—",
      })) as OnSiteWRow[],
    };
  }

  return {
    onsiteD: filteredD,
    onsiteB: filteredB,
    onsiteW: filteredW,
  };
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
