"use client";

import dynamic from "next/dynamic";
import type {
  HourlyPipeProgress,
  HourlyBackfillProgress,
  WaterByActivity,
  DayValue,
} from "@/lib/queries/daily";

const DailyProgressCard = dynamic(
  () =>
    import("./DailyProgressCard").then((m) => m.DailyProgressCard),
  { ssr: false }
);

const WaterConsumptionCard = dynamic(
  () =>
    import("./WaterConsumptionCard").then((m) => m.WaterConsumptionCard),
  { ssr: false }
);

const HistoricTrendCard = dynamic(
  () =>
    import("./HistoricTrendCard").then((m) => m.HistoricTrendCard),
  { ssr: false }
);

type DailyViewProps = {
  pipeProgress: HourlyPipeProgress[];
  backfillProgress: HourlyBackfillProgress[];
  waterByActivity: WaterByActivity[];
  last5Pipes: DayValue[];
  last5Backfill: DayValue[];
};

export function DailyView({
  pipeProgress,
  backfillProgress,
  waterByActivity,
  last5Pipes,
  last5Backfill,
}: DailyViewProps) {
  return (
    <>
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
    </>
  );
}
