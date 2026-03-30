import {
  getCrewId,
  getTodayWaterByActivity,
  getActiveVehicleCount,
  fetchPipesToday,
  fetchBackfillToday,
  fetchWaterToday,
  getCurrentMonthDailyProgress,
  getHistoricMonthlyProgress,
  getSectionsForCrew,
  getSectionChainageProgress,
} from "@/lib/queries/daily";
import { getSpreadsheetData } from "@/lib/queries/spreadsheet";
import { Header } from "@/components/dashboard/Header";
import { NavTabs } from "@/components/dashboard/NavTabs";
import { KPISummary } from "@/components/dashboard/KPISummary";
import { SectionProgress } from "@/components/dashboard/SectionProgress";
import { MonthlyProgressChart } from "@/components/dashboard/MonthlyProgressChart";
import { WaterConsumptionChart } from "@/components/dashboard/WaterConsumptionChart";
import { PlannerGanttCard } from "@/components/dashboard/PlannerGanttCard";
import { DaySelector } from "@/components/dashboard/DaySelector";
import { tokens } from "@/lib/designTokens";
import { toWorkingDay } from "@/lib/utils/workingDays";
import { SpreadsheetMode } from "@/components/dashboard/SpreadsheetMode";
import { Footer } from "@/components/dashboard/Footer";
import { CREW_TABS } from "@/lib/constants/crew-tabs";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = {
  title: "Alkimos Pipeline Alliance - DN1600 Trunk Main",
  description: "Engineering dashboard for Water Corp DN1600 MSCL pipeline",
};

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const crew = (params?.crew as string) || "A";
  const view = (params?.view as string) || "dashboard";
  const rawDate =
    (params?.date as string) ||
    new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Perth" });
  const selectedDate = toWorkingDay(rawDate);
  const crewForQueries = crew === "Global" ? "A" : crew;
  const isCrewEnabled = CREW_TABS.find((t) => t.name === crew)?.enabled ?? false;

  // Data View: only fetch OnSite-D (pipes); B/W load on expand
  if (view === "spreadsheet" && isCrewEnabled) {
    const spreadsheetData = await getSpreadsheetData(crew, selectedDate, ["d"]);
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ background: tokens.theme.background }}
      >
        <Header crew={crew} />
        <NavTabs crew={crew} view={view} />
        <main className="flex-1" style={{ padding: tokens.spacing.section }}>
          <DaySelector currentDate={rawDate} />
          <SpreadsheetMode data={spreadsheetData} crew={crew} referenceDate={selectedDate} />
        </main>
        <Footer />
      </div>
    );
  }

  // Dashboard: fetch all dashboard data
  const crewId = await getCrewId(crewForQueries);
  const [
    pipesTodayRes,
    backfillTodayRes,
    waterTodayRes,
    waterByActivity,
    activeVehicleCount,
    currentMonthProgress,
    historicProgress,
  ] = await Promise.all([
    fetchPipesToday(crewId ?? undefined, selectedDate),
    fetchBackfillToday(crewId ?? undefined, selectedDate),
    fetchWaterToday(crewForQueries, selectedDate),
    getTodayWaterByActivity(crewForQueries, selectedDate),
    getActiveVehicleCount(crewForQueries, selectedDate),
    getCurrentMonthDailyProgress(crewId ?? undefined),
    getHistoricMonthlyProgress(crewId ?? undefined),
  ]);

  const sections = crewId ? await getSectionsForCrew(crewId) : [];
  const progressBySection: Record<string, Awaited<ReturnType<typeof getSectionChainageProgress>>> = {};
  await Promise.all(
    sections.map(async (s) => {
      progressBySection[s.id] = await getSectionChainageProgress(s.id);
    })
  );

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: tokens.theme.background }}
    >
      <Header crew={crew} />
      <NavTabs crew={crew} view={view} />

      <main
        className="flex-1"
        style={{
          padding: tokens.spacing.section,
        }}
      >
        {!isCrewEnabled ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <span
              style={{
                fontSize: tokens.typography.label,
                color: tokens.text.muted,
              }}
            >
              Coming soon
            </span>
          </div>
        ) : (
          <>
            <DaySelector currentDate={rawDate} />
            <KPISummary
              pipesCount={pipesTodayRes.data.count}
              backfillMeters={backfillTodayRes.data.meters}
              waterKL={waterTodayRes.data.totalKL}
            />
            <SectionProgress sections={sections} progressBySection={progressBySection} />
            <div
              className="grid grid-cols-3 gap-6 items-stretch"
              style={{ gap: tokens.spacing.gap }}
            >
              <div className="col-span-2 h-full">
                <MonthlyProgressChart
                  data={currentMonthProgress}
                  historicData={historicProgress}
                />
              </div>
              <div className="col-span-1 h-full">
                <WaterConsumptionChart data={waterByActivity} activeVehicles={activeVehicleCount} />
              </div>
            </div>
            <PlannerGanttCard />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
