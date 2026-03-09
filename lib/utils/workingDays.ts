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
