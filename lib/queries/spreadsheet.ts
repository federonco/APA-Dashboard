import { supabase } from "@/lib/supabase";

export type OnSiteDRow = {
  date: string;
  section: string;
  pipes_laid: number;
  joint_count?: number;
  crew: string;
};

export type OnSiteBRow = {
  date: string;
  section: string;
  backfill_m3: number;
  vehicle_count?: number;
  crew: string;
};

export type OnSiteWRow = {
  date: string;
  location: string;
  water_m3: number;
  destination: string;
  crew: string;
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
      section: `Section ${i + 1}`,
      pipes_laid: 18 + (i % 5),
      joint_count: 18 + (i % 5),
      crew,
    })),
    onsiteB: days.map((d, i) => ({
      date: `${base}-${d}`,
      section: `Section ${i + 1}`,
      backfill_m3: 70 + (i % 15),
      vehicle_count: 2,
      crew,
    })),
    onsiteW: days.map((d, i) => ({
      date: `${base}-${d}`,
      location: `Location ${i + 1}`,
      water_m3: 25 + (i % 10),
      destination: "Site",
      crew,
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
