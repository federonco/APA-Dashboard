import { supabase } from "@/lib/supabase";
import { getLastNWorkingDays } from "@/lib/utils/workingDays";

export type HourlyPipeProgress = { hour: string; pipes: number };
export type HourlyBackfillProgress = { hour: string; metres: number };
export type WaterByActivity = { activity: string; litres: number };
export type DayValue = { day: string; value: number };

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

/** Mock: hourly cumulative pipe progress for today (7am-5pm) */
function mockTodayPipeProgress(): HourlyPipeProgress[] {
  return [
    { hour: "07", pipes: 0 },
    { hour: "08", pipes: 2 },
    { hour: "09", pipes: 5 },
    { hour: "10", pipes: 9 },
    { hour: "11", pipes: 12 },
    { hour: "12", pipes: 14 },
    { hour: "13", pipes: 15 },
    { hour: "14", pipes: 17 },
    { hour: "15", pipes: 18 },
    { hour: "16", pipes: 20 },
    { hour: "17", pipes: 22 },
  ];
}

/** Mock: hourly cumulative backfill progress for today */
function mockTodayBackfillProgress(): HourlyBackfillProgress[] {
  return [
    { hour: "07", metres: 0 },
    { hour: "08", metres: 8 },
    { hour: "09", metres: 18 },
    { hour: "10", metres: 30 },
    { hour: "11", metres: 42 },
    { hour: "12", metres: 50 },
    { hour: "13", metres: 55 },
    { hour: "14", metres: 62 },
    { hour: "15", metres: 70 },
    { hour: "16", metres: 75 },
    { hour: "17", metres: 80 },
  ];
}

/** Mock: water by activity for today */
function mockTodayWaterByActivity(): WaterByActivity[] {
  return [
    { activity: "Pipe jointing", litres: 12000 },
    { activity: "Dust suppression", litres: 8000 },
    { activity: "Testing", litres: 5000 },
    { activity: "Other", litres: 3000 },
  ];
}

/** Mock: pipes per day for last 5 working days */
function mockLast5DaysPipes(): DayValue[] {
  return [
    { day: "Mon 3", value: 18 },
    { day: "Tue 4", value: 22 },
    { day: "Wed 5", value: 20 },
    { day: "Thu 6", value: 16 },
    { day: "Fri 7", value: 24 },
  ];
}

/** Mock: backfill per day for last 5 working days */
function mockLast5DaysBackfill(): DayValue[] {
  return [
    { day: "Mon 3", value: 72 },
    { day: "Tue 4", value: 85 },
    { day: "Wed 5", value: 78 },
    { day: "Thu 6", value: 90 },
    { day: "Fri 7", value: 82 },
  ];
}

export async function getTodayPipeProgress(): Promise<HourlyPipeProgress[]> {
  try {
    const today = getToday();
    // TODO: replace mock with real query
    // Assumed schema: drainer_pipe_records(id, date, chainage, section_id, pipe_count or similar)
    // const { data, error } = await supabase
    //   .from('drainer_pipe_records')
    //   .select('date, pipe_count') // TODO: verify column name against actual schema
    //   .eq('date', today);
    // Group by hour and sum pipe_count
    return mockTodayPipeProgress();
  } catch (err) {
    console.error("getTodayPipeProgress:", err);
    return mockTodayPipeProgress();
  }
}

export async function getTodayBackfillProgress(): Promise<
  HourlyBackfillProgress[]
> {
  try {
    const today = getToday();
    // TODO: replace mock with real query
    // Assumed schema: backfill_records(id, date, chainage, section_id, length_m)
    // const { data, error } = await supabase
    //   .from('backfill_records')
    //   .select('date, length_m')
    //   .eq('date', today);
    return mockTodayBackfillProgress();
  } catch (err) {
    console.error("getTodayBackfillProgress:", err);
    return mockTodayBackfillProgress();
  }
}

export async function getTodayWaterByActivity(): Promise<WaterByActivity[]> {
  try {
    const today = getToday();
    // TODO: replace mock with real query
    // Assumed schema: water_logs(id, date, litres, destination_site, activity or task)
    // const { data, error } = await supabase
    //   .from('water_logs')
    //   .select('activity, litres') // TODO: verify column name (activity vs task)
    //   .eq('date', today);
    // Group by activity, sum(litres)
    return mockTodayWaterByActivity();
  } catch (err) {
    console.error("getTodayWaterByActivity:", err);
    return mockTodayWaterByActivity();
  }
}

export async function getLast5DaysPipes(): Promise<DayValue[]> {
  try {
    const days = getLastNWorkingDays(5);
    // TODO: replace mock with real query
    // SELECT date, COUNT(*) as pipes FROM drainer_pipe_records
    // WHERE date >= days[0] AND date <= days[days.length-1]
    // GROUP BY date ORDER BY date
    return mockLast5DaysPipes();
  } catch (err) {
    console.error("getLast5DaysPipes:", err);
    return mockLast5DaysPipes();
  }
}

export async function getLast5DaysBackfill(): Promise<DayValue[]> {
  try {
    const days = getLastNWorkingDays(5);
    // TODO: replace mock with real query
    // SELECT date, SUM(length_m) as metres FROM backfill_records
    // WHERE date >= days[0] ... GROUP BY date ORDER BY date
    return mockLast5DaysBackfill();
  } catch (err) {
    console.error("getLast5DaysBackfill:", err);
    return mockLast5DaysBackfill();
  }
}
