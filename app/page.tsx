import {
  getTodayPipeProgress,
  getTodayBackfillProgress,
  getTodayWaterByActivity,
  getLast5DaysPipes,
  getLast5DaysBackfill,
} from "@/lib/queries/daily";
import { getSpreadsheetData } from "@/lib/queries/spreadsheet";
import { Header } from "@/components/dashboard/Header";
import { NavTabs } from "@/components/dashboard/NavTabs";
import { KPISummary } from "@/components/dashboard/KPISummary";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { DailyView } from "@/components/dashboard/DailyView";
import { UnifiedHistoricTrend } from "@/components/dashboard/UnifiedHistoricTrend";
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

  const [
    pipeProgress,
    backfillProgress,
    waterByActivity,
    last5Pipes,
    last5Backfill,
  ] = await Promise.all([
    getTodayPipeProgress(),
    getTodayBackfillProgress(),
    getTodayWaterByActivity(),
    getLast5DaysPipes(),
    getLast5DaysBackfill(),
  ]);

  const isCrewEnabled = CREW_TABS.find((t) => t.name === crew)?.enabled ?? false;
  const spreadsheetData =
    isCrewEnabled && view === "spreadsheet" ? await getSpreadsheetData(crew) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#080808]">
      <Header crew={crew} />
      <NavTabs crew={crew} view={view} />

      <main className="flex-1 px-6 py-6">
        {!isCrewEnabled ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <span className="rounded bg-[#f97316] px-4 py-2 font-barlow text-sm font-bold uppercase text-white">
              Coming soon
            </span>
          </div>
        ) : view === "spreadsheet" && spreadsheetData ? (
          <SpreadsheetMode data={spreadsheetData} crew={crew} />
        ) : (
          <>
            <KPISummary />
            <ProjectProgress />
            <DailyView
              pipeProgress={pipeProgress}
              backfillProgress={backfillProgress}
              waterByActivity={waterByActivity}
              last5Pipes={last5Pipes}
              last5Backfill={last5Backfill}
            />
            <div className="mt-6">
              <UnifiedHistoricTrend
                pipesData={last5Pipes}
                backfillData={last5Backfill}
              />
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
