import {
  getTodayPipeProgress,
  getTodayBackfillProgress,
  getTodayWaterByActivity,
  getLast5DaysPipes,
  getLast5DaysBackfill,
} from "@/lib/queries/daily";
import { Header } from "@/components/dashboard/Header";
import { NavTabs } from "@/components/dashboard/NavTabs";
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
    <div className="min-h-screen bg-[#080808]">
      <Header />
      <NavTabs />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
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
