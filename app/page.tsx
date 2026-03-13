import {
  getCrewId,
  getTodayPipeProgress,
  getTodayBackfillProgress,
  getTodayWaterByActivity,
  getLast5DaysPipes,
  getLast5DaysBackfill,
  fetchPipesToday,
  fetchBackfillToday,
  fetchWaterToday,
} from "@/lib/queries/daily";
import { getSpreadsheetData } from "@/lib/queries/spreadsheet";
import { Header } from "@/components/dashboard/Header";
import { NavTabs } from "@/components/dashboard/NavTabs";
import { KPISummary } from "@/components/dashboard/KPISummary";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { DailyProgressChart } from "@/components/dashboard/DailyProgressChart";
import { WaterConsumptionChart } from "@/components/dashboard/WaterConsumptionChart";
import { HistoricTrendSection } from "@/components/dashboard/HistoricTrendSection";
import { tokens } from "@/lib/designTokens";
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
  const crewForQueries = crew === "Global" ? "A" : crew;
  const crewId = await getCrewId(crewForQueries);

  const [
    pipesTodayRes,
    backfillTodayRes,
    waterTodayRes,
    pipeProgress,
    backfillProgress,
    waterByActivity,
    last5Pipes,
    last5Backfill,
  ] = await Promise.all([
    fetchPipesToday(crewId ?? undefined),
    fetchBackfillToday(crewId ?? undefined),
    fetchWaterToday(crewId ?? undefined),
    getTodayPipeProgress(crewId ?? undefined),
    getTodayBackfillProgress(crewId ?? undefined),
    getTodayWaterByActivity(crewId ?? undefined),
    getLast5DaysPipes(crewId ?? undefined),
    getLast5DaysBackfill(crewId ?? undefined),
  ]);

  const isCrewEnabled = CREW_TABS.find((t) => t.name === crew)?.enabled ?? false;
  const spreadsheetData =
    isCrewEnabled && view === "spreadsheet" ? await getSpreadsheetData(crew) : null;

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
        ) : view === "spreadsheet" && spreadsheetData ? (
          <SpreadsheetMode data={spreadsheetData} crew={crew} />
        ) : (
          <>
            <KPISummary
              pipesCount={pipesTodayRes.data.count}
              backfillMeters={backfillTodayRes.data.meters}
              waterKL={waterTodayRes.data.totalKL}
            />
            <ProjectProgress />
            <div
              className="grid grid-cols-2 gap-6"
              style={{ gap: tokens.spacing.gap }}
            >
              <DailyProgressChart
                pipeData={pipeProgress}
                backfillData={backfillProgress}
                pipeTarget={18}
                backfillTarget={80}
              />
              <WaterConsumptionChart data={waterByActivity} />
            </div>
            <HistoricTrendSection last5Pipes={last5Pipes} last5Backfill={last5Backfill} />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
