import {
  getTodayPipeProgress,
  getTodayBackfillProgress,
  getTodayWaterByActivity,
  getLast5DaysPipes,
  getLast5DaysBackfill,
} from "@/lib/queries/daily";
import { Header } from "@/components/dashboard/Header";
import { NavTabs } from "@/components/dashboard/NavTabs";
import { DailyProgressCard } from "@/components/dashboard/DailyProgressCard";
import { WaterConsumptionCard } from "@/components/dashboard/WaterConsumptionCard";
import { HistoricTrendCard } from "@/components/dashboard/HistoricTrendCard";

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
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DailyProgressCard
            pipeData={pipeProgress}
            backfillData={backfillProgress}
            pipeTarget={18}
            backfillTarget={80}
          />
          <WaterConsumptionCard data={waterByActivity} />
        </section>

        <div className="flex items-center gap-4 py-2">
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            ── 5-Day Historic Trend
          </span>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HistoricTrendCard
            data={last5Pipes}
            title="Pipes / Day — Last 5 Working Days"
            accentColor="#f97316"
            accentColorDark="#9a3412"
            unit="pipes"
            valueLabel="Pipes"
          />
          <HistoricTrendCard
            data={last5Backfill}
            title="Backfill / Day — Last 5 Working Days"
            accentColor="#a78bfa"
            accentColorDark="#6d28d9"
            unit="m"
            valueLabel="Metres"
          />
        </section>
      </main>
    </div>
  );
}
