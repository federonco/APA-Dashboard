import {
  getCrewId,
  getTodayWaterByActivity,
  getActiveVehicleCount,
  getCurrentMonthDailyProgress,
  getHistoricMonthlyProgress,
  getSectionsForCrew,
  getSectionProgressForCrew,
  getSectionChainageProgress,
  type SectionProgressData,
} from "@/lib/queries/daily";
import { getSpreadsheetData } from "@/lib/queries/spreadsheet";
import { Header } from "@/components/dashboard/Header";
import { NavTabs } from "@/components/dashboard/NavTabs";
import { MetricCardsDisplay } from "@/components/dashboard/MetricCardsDisplay";
import { MonthlyProgressChart } from "@/components/dashboard/MonthlyProgressChart";
import { WaterConsumptionChart } from "@/components/dashboard/WaterConsumptionChart";
import { PlannerGanttCard } from "@/components/dashboard/PlannerGanttCard";
import { DaySelector } from "@/components/dashboard/DaySelector";
import { SectionPortfolioView } from "@/components/dashboard/SectionPortfolioView";
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

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="my-2 flex items-center gap-3">
      <span
        className="whitespace-nowrap text-xs font-bold uppercase tracking-widest"
        style={{
          color: "#f97316",
          fontFamily: "var(--font-barlow), sans-serif",
          letterSpacing: "0.18em",
        }}
      >
        {label}
      </span>
      <div className="h-px flex-1" style={{ backgroundColor: "#e4e4e7" }} />
    </div>
  );
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const crew = (params?.crew as string) || "A";
  const view = (params?.view as string) || "dashboard";
  const adminMode = (params?.admin as string) === "1";
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
  const [waterByActivity, activeVehicleCount, currentMonthProgress, historicProgress] =
    await Promise.all([
      getTodayWaterByActivity(crewForQueries, selectedDate),
      getActiveVehicleCount(crewForQueries, selectedDate),
      getCurrentMonthDailyProgress(crewId ?? undefined),
      getHistoricMonthlyProgress(crewId ?? undefined),
    ]);

  const sections = crewId ? await getSectionsForCrew(crewId) : [];
  const sectionProgressRows = crewId ? await getSectionProgressForCrew(crewId) : [];
  const sectionProgressById = Object.fromEntries(sectionProgressRows.map((r) => [r.id, r]));
  const sectionDailySeriesBase = crewId
    ? await Promise.all(
        sections.map(async (section) => ({
          id: section.id,
          name: section.name,
          data: await getCurrentMonthDailyProgress(crewId, [section.id]),
        }))
      )
    : [];

  const perSectionProgress: Record<string, SectionProgressData> = {};
  if (crewId && sections.length > 0) {
    const results = await Promise.all(
      sections.map((s) =>
        getSectionChainageProgress(s.id).then((p) => ({ id: s.id, p }))
      )
    );
    for (const { id, p } of results) {
      if (p) perSectionProgress[id] = p;
    }
  }

  const sectionDailySeries = sections.map((section) => {
    const base = sectionDailySeriesBase.find((s) => s.id === section.id) ?? {
      id: section.id,
      name: section.name,
      data: [],
    };
    const summary = sectionProgressById[section.id];
    const sectionProgress = perSectionProgress[section.id];
    const direction = section.direction ?? "onwards";
    const currentFront = sectionProgress?.installedChainage ?? section.startCh;
    const isComplete =
      direction === "backwards" ? currentFront <= section.endCh : currentFront >= section.endCh;
    const excludeFromSelector = section.name.trim().toLowerCase() === "section 4";
    return {
      ...base,
      isComplete,
      excludeFromSelector,
      guideBased: summary?.guideBased ?? false,
      totalFittings: summary?.totalFittings,
      startCh: section.startCh,
      endCh: section.endCh,
    };
  });

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
            <MetricCardsDisplay date={selectedDate} adminMode={adminMode} />
            <SectionDivider label="Pipeline" />
            <SectionPortfolioView
              sections={sections}
              progress={perSectionProgress}
              sectionProgress={sectionProgressById}
              crewCode={crewForQueries}
            />
            <div
              className="mb-6 grid grid-cols-5 items-stretch gap-6"
              style={{ gap: tokens.spacing.gap }}
            >
              <div className="col-span-4 h-full">
                <MonthlyProgressChart
                  data={currentMonthProgress}
                  historicData={historicProgress}
                  sectionSeries={sectionDailySeries}
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
