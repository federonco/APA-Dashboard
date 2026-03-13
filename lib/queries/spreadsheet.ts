import { supabase } from "@/lib/supabase";

export type OnSiteDRow = {
  date: string;
  time_lodged?: string;
  section: string;
  pipes_laid: number;
  joint_count?: number;
  crew: string;
};

export type OnSiteBRow = {
  date: string;
  time_lodged?: string;
  section: string;
  backfill_m3: number;
  vehicle_count?: number;
  crew: string;
};

export type OnSiteWRow = {
  date: string;
  time_lodged?: string;
  location: string;
  water_litres: number;
  destination: string;
  truck_id?: string;
};

export type SpreadsheetData = {
  onsiteD: OnSiteDRow[];
  onsiteB: OnSiteBRow[];
  onsiteW: OnSiteWRow[];
};

function mockSpreadsheetData(crew: string): SpreadsheetData {
  const base = "2025-03";
  const days = ["03", "04", "05", "06", "07", "10", "11"];
  return {
    onsiteD: days.map((d, i) => ({
      date: `${base}-${d}`,
      time_lodged: `${9 + (i % 3)}:${i % 2 === 0 ? "15" : "45"}`,
      section: `Section ${i + 1}`,
      pipes_laid: 18 + (i % 5),
      joint_count: 18 + (i % 5),
      crew,
    })),
    onsiteB: days.map((d, i) => ({
      date: `${base}-${d}`,
      time_lodged: `${10 + (i % 2)}:${i % 2 === 0 ? "30" : "00"}`,
      section: `Section ${i + 1}`,
      backfill_m3: 70 + (i % 15),
      vehicle_count: 2,
      crew,
    })),
    onsiteW: days.map((d, i) => ({
      date: `${base}-${d}`,
      time_lodged: `${8 + (i % 4)}:${String((i * 15) % 60).padStart(2, "0")}`,
      location: `Location ${i + 1}`,
      water_litres: (25 + (i % 10)) * 1000,
      destination: "Site",
      truck_id: `T-${String(i + 1).padStart(2, "0")}`,
    })),
  };
}

export async function getSpreadsheetData(
  crew: string
): Promise<SpreadsheetData> {
  try {
    // TODO: replace with Supabase queries when schema ready
    return mockSpreadsheetData(crew);
  } catch (err) {
    console.error("getSpreadsheetData:", err);
    return mockSpreadsheetData(crew);
  }
}
