import {
  getTodayPipeProgress,
  getTodayBackfillProgress,
  getTodayWaterByActivity,
  getLast5DaysPipes,
  getLast5DaysBackfill,
} from "@/lib/queries/daily";
import { Header } from "@/components/dashboard/Header";
import { NavTabs } from "@/components/dashboard/NavTabs";
import { KPISummary } from "@/components/dashboard/KPISummary";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { DailyView } from "@/components/dashboard/DailyView";

export default async function DailyViewPage() {
  const [pipeProgress, backfillProgress, waterByActivity, last5Pipes, last5Backfill] =
    await Promise.all([
      getTodayPipeProgress(),
      getTodayBackfillProgress(),
      getTodayWaterByActivity(),
      getLast5DaysPipes(),
      getLast5DaysBackfill(),
    ]);

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <Header />
      <NavTabs />

      <main className="w-full px-10 py-8 space-y-8">
        <KPISummary />
        <ProjectProgress />
        <DailyView
          pipeProgress={pipeProgress}
          backfillProgress={backfillProgress}
          waterByActivity={waterByActivity}
          last5Pipes={last5Pipes}
          last5Backfill={last5Backfill}
        />
      </main>
    </div>
  );
}
