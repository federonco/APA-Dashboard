/**
 * Returns array of dates for the current month (YYYY-MM-DD).
 * Only working days (excludes weekends).
 */
export function getWorkingDaysInCurrentMonth(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days: string[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(d).padStart(2, "0");
      days.push(`${y}-${m}-${day}`);
    }
  }
  return days;
}

/**
 * Returns last N days (including today), excluding weekends.
 */
export function getLastNWorkingDaysIncludingToday(n: number): string[] {
  const days: string[] = [];
  let date = new Date();

  while (days.length < n) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.unshift(date.toISOString().split("T")[0]);
    }
    date.setDate(date.getDate() - 1);
  }
  return days;
}
