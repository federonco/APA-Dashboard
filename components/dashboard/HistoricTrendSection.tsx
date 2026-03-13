"use client";

import dynamic from "next/dynamic";
import type { DayValue } from "@/lib/queries/daily";
import { PIPE_LENGTH_M, TARGET_PIPE_METERS_PER_DAY } from "@/lib/constants";

const PipeBackfillTrendCard = dynamic(
  () => import("./PipeBackfillTrendCard").then((m) => m.PipeBackfillTrendCard),
  { ssr: false }
);

type Props = {
  last5Pipes: DayValue[];
  last5Backfill: DayValue[];
};

export function HistoricTrendSection({ last5Pipes, last5Backfill }: Props) {
  const last5PipesMetres: DayValue[] = last5Pipes.map((d) => ({
    day: d.day,
    value: Math.round(d.value * PIPE_LENGTH_M * 10) / 10,
  }));

  return (
    <PipeBackfillTrendCard
      pipeData={last5PipesMetres}
      backfillData={last5Backfill}
      targetMetresPerDay={TARGET_PIPE_METERS_PER_DAY}
    />
  );
}
