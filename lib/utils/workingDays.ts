/**
 * Returns an array of the last N working days (excluding weekends).
 * Each day is formatted as YYYY-MM-DD.
 */
export function getLastNWorkingDays(n: number): string[] {
  const days: string[] = [];
  let date = new Date();

  while (days.length < n) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(date.toISOString().split("T")[0]);
    }
    date.setDate(date.getDate() - 1);
  }

  return days.reverse();
}

function isWorkingDay(dateStr: string): boolean {
  const dow = new Date(dateStr + "T12:00:00").getDay();
  return dow !== 0 && dow !== 6;
}

/** If date is weekend, returns previous working day; otherwise returns date. */
export function toWorkingDay(dateStr: string): string {
  if (isWorkingDay(dateStr)) return dateStr;
  const d = new Date(dateStr + "T12:00:00");
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString().split("T")[0];
}

/** Working days (Mon–Fri) from startStr to endStr inclusive. */
export function getWorkingDaysInRange(startStr: string, endStr: string): string[] {
  const arr: string[] = [];
  const d = new Date(startStr + "T12:00:00");
  const end = new Date(endStr + "T12:00:00");
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      arr.push(d.toISOString().split("T")[0]);
    }
    d.setDate(d.getDate() + 1);
  }
  return arr;
}
