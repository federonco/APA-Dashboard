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
      <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.6fr_0.72fr]">
        <DailyProgressCard
          pipeData={pipeProgress}
          backfillData={backfillProgress}
          pipeTarget={18}
          backfillTarget={80}
        />
        <WaterConsumptionCard data={waterByActivity} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HistoricTrendCard
          data={last5Pipes}
          title="Pipes / Day - Last 5 working days"
          accentColor="#D06A3A"
          accentColorDark="#c45a26"
          unit="pipes"
          valueLabel="Pipes"
        />
        <HistoricTrendCard
          data={last5Backfill}
          title="Backfill / Day - Last 5 working days"
          accentColor="#4F7FB3"
          accentColorDark="#3a7ab8"
          unit="m"
          valueLabel="Metres"
        />
      </section>
    </>
  );
}
