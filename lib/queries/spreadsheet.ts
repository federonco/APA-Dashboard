import {
  fetchPipeDataView,
  fetchBackfillDataView,
  fetchWaterDataView,
} from "@/lib/queries/dataview";
import { getCrewId } from "@/lib/queries/daily";

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
  mockFlags?: { d: boolean; b: boolean; w: boolean };
};

function mockSpreadsheetData(crew: string): SpreadsheetData {
  const today = new Date();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }
  return {
    onsiteD: days.map((date, i) => ({
      date,
      time_lodged: `${9 + (i % 3)}:${i % 2 === 0 ? "15" : "45"}`,
      section: `Section ${i + 1}`,
      pipes_laid: 18 + (i % 5),
      joint_count: 18 + (i % 5),
      crew,
    })),
    onsiteB: days.map((date, i) => ({
      date,
      time_lodged: `${10 + (i % 2)}:${i % 2 === 0 ? "30" : "00"}`,
      section: `Section ${i + 1}`,
      backfill_m3: 70 + (i % 15),
      vehicle_count: 2,
      crew,
    })),
    onsiteW: days.map((date, i) => ({
      date,
      time_lodged: `${8 + (i % 4)}:${String((i * 15) % 60).padStart(2, "0")}`,
      location: `Location ${i + 1}`,
      water_litres: (25 + (i % 10)) * 1000,
      destination: "Site",
      truck_id: `T-${String(i + 1).padStart(2, "0")}`,
    })),
    mockFlags: { d: true, b: true, w: true },
  };
}

export async function getSpreadsheetData(
  crew: string,
  selectedDate?: string
): Promise<SpreadsheetData> {
  try {
    const crewForQueries = crew === "Global" ? "A" : crew;
    const crewId = await getCrewId(crewForQueries);
    const endStr = selectedDate ?? new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Perth" });

    const [pipeRes, backfillRes, waterRes] = await Promise.all([
      fetchPipeDataView(7, crewId ?? undefined, endStr),
      fetchBackfillDataView(7, crewId ?? undefined, endStr),
      fetchWaterDataView(7, crewId ?? undefined, endStr),
    ]);

    const mockFlags = {
      d: pipeRes.isMock,
      b: backfillRes.isMock,
      w: waterRes.isMock,
    };

    if (pipeRes.isMock && backfillRes.isMock && waterRes.isMock) {
      return mockSpreadsheetData(crew);
    }

    const mock = mockSpreadsheetData(crew);
    return {
      onsiteD: pipeRes.isMock ? mock.onsiteD : pipeRes.data.map((r) => ({
        date: r.date,
        time_lodged: r.time_lodged,
        section: r.section,
        pipes_laid: r.pipes_laid,
        crew: r.crew,
      })),
      onsiteB: backfillRes.isMock ? mock.onsiteB : backfillRes.data.map((r) => ({
        date: r.date,
        time_lodged: r.time_lodged,
        section: r.section,
        backfill_m3: r.backfill_m3,
        crew: r.crew,
      })),
      onsiteW: waterRes.isMock ? mock.onsiteW : waterRes.data.map((r) => ({
        date: r.date,
        time_lodged: r.time_lodged,
        location: r.location,
        water_litres: r.water_litres,
        destination: r.destination,
        truck_id: r.truck_id,
      })),
      mockFlags,
    };
  } catch (err) {
    console.error("getSpreadsheetData:", err);
    return mockSpreadsheetData(crew);
  }
}
