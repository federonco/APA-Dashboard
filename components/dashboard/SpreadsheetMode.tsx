"use client";

import { useRef, useState } from "react";
import type { SpreadsheetData } from "@/lib/queries/spreadsheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  filterByPeriod,
  formatDate,
  type PeriodFilter,
} from "@/lib/utils/spreadsheetFormat";

type SpreadsheetModeProps = {
  data: SpreadsheetData;
  crew: string;
  referenceDate?: string;
};

export function SpreadsheetMode({ data, crew, referenceDate }: SpreadsheetModeProps) {
  const dRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const wRef = useRef<HTMLDivElement>(null);

  const [period, setPeriod] = useState<PeriodFilter>("day");

  const filtered = {
    onsiteD: filterByPeriod(data.onsiteD, period, referenceDate),
    onsiteB: filterByPeriod(data.onsiteB, period, referenceDate),
    onsiteW: filterByPeriod(data.onsiteW, period, referenceDate),
  };

  const crewLabel = crew === "Global" ? "All Crews" : `Crew ${crew}`;
  const now = new Date().toLocaleString("en-AU");

  function printTable(
    ref: React.RefObject<HTMLDivElement | null>,
    title: string
  ) {
    if (!ref.current) return;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - APA Dashboard</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
            body { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; font-size: 12px; padding: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
            th { background: #f0f0f0; }
            .header { margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <p><strong>${title}</strong></p>
            <p>Crew: ${crewLabel} | Period: ${period} | ${now}</p>
          </div>
          ${ref.current.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
    win.print();
    win.close();
  }

  const tableStyles = "overflow-x-auto rounded-lg border border-border bg-[#FCFBFB]";
  const thStyles = "px-4 py-2 text-left text-[11px] font-medium text-zinc-600";
  const tdStyles = "px-4 py-2 text-[13px] text-zinc-800";
  const emptyTdStyles = "px-4 py-6 text-center text-[13px] text-zinc-500";
  const sectionTitleStyles = "text-[11px] font-medium tracking-wide text-zinc-600";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-zinc-600">
          <span className="font-medium">Crew:</span> {crewLabel}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-600">
          <span className="font-medium">Period:</span>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as PeriodFilter)}
          >
            <SelectTrigger className="h-7 min-h-7 min-w-[4.75rem] px-2 py-1 text-[11px] font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <section className="space-y-4">
        {/* OnSite-D only: outer card #EEE4DA; header row #E8D2BF; B/W unchanged */}
        <div className="rounded-xl border border-[#DDD2C8] bg-[#EEE4DA] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className={sectionTitleStyles}>
              OnSite-D (pipes)
              {data.mockFlags?.d && (
                <span className="ml-2 rounded bg-amber-100/90 px-1.5 py-0.5 text-[10px] text-amber-900">
                  mock data
                </span>
              )}
            </h2>
          </div>
          <div
            ref={dRef}
            className="overflow-x-auto rounded-lg border border-[#E3D4C6] bg-[#F3E8DC]"
          >
            <table className="w-full min-w-[400px] table-fixed">
              <thead>
                <tr className="border-b border-[#D4C4B8]/70 bg-[#E8D2BF]">
                  <th className="w-1/5 rounded-tl-lg px-4 py-2 text-left text-[13px] font-medium text-[#4A3F38]">
                    Date
                  </th>
                  <th className="w-1/5 px-4 py-2 text-left text-[13px] font-medium text-[#4A3F38]">
                    Time lodged
                  </th>
                  <th className="w-1/5 px-4 py-2 text-left text-[13px] font-medium text-[#4A3F38]">
                    Section
                  </th>
                  <th className="w-1/5 px-4 py-2 text-left text-[13px] font-medium text-[#4A3F38]">
                    Pipes laid
                  </th>
                  <th className="w-1/5 rounded-tr-lg px-4 py-2 text-left text-[13px] font-medium text-[#4A3F38]">
                    Pipe ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.onsiteD.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="rounded-b-lg bg-[#E8D2BF] px-4 py-6 text-center text-[13px] text-[#6B5A4E]"
                    >
                      No data
                    </td>
                  </tr>
                ) : (
                  filtered.onsiteD.map((row, i) => {
                    const isLast = i === filtered.onsiteD.length - 1;
                    return (
                      <tr
                        key={i}
                        className={
                          isLast ? "" : "border-b border-[#D4C4B8]/50"
                        }
                      >
                        <td
                          className={`bg-[#E8D2BF] px-4 py-2 text-[13px] text-[#3F362F]${isLast ? " rounded-bl-lg" : ""}`}
                        >
                          {formatDate(row.date)}
                        </td>
                        <td className="bg-[#E8D2BF] px-4 py-2 text-[13px] text-[#3F362F]">
                          {row.time_lodged ?? "—"}
                        </td>
                        <td className="bg-[#E8D2BF] px-4 py-2 text-[13px] text-[#3F362F]">
                          {row.section}
                        </td>
                        <td className="bg-[#E8D2BF] px-4 py-2 text-left text-[13px] tabular-nums text-[#3F362F]">
                          {row.pipes_laid}
                        </td>
                        <td
                          className={`bg-[#E8D2BF] px-4 py-2 text-[13px] text-[#3F362F]${isLast ? " rounded-br-lg" : ""}`}
                        >
                          {row.pipe_id ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-xl border border-[#D3DEE7] bg-[#E6EDF3] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className={sectionTitleStyles}>
              OnSite-B (backfill)
              {data.mockFlags?.b && (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                  mock data
                </span>
              )}
            </h2>
          </div>
          <div
            ref={bRef}
            className="overflow-x-auto rounded-lg border border-[#BFCFDD] bg-[#D1DEE9]"
          >
            <table className="w-full min-w-[400px] table-fixed">
              <thead>
                <tr className="border-b border-[#B8CAD9]/70 bg-[#D1DEE9]">
                  <th className="w-1/5 rounded-tl-lg px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Date
                  </th>
                  <th className="w-1/5 px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Time lodged
                  </th>
                  <th className="w-1/5 px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Section
                  </th>
                  <th className="w-1/5 px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Backfill (m)
                  </th>
                  <th className="w-1/5 rounded-tr-lg px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Chainage (Ch)
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.onsiteB.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="rounded-b-lg bg-[#D1DEE9] px-4 py-6 text-center text-[13px] text-[#4B5563]"
                    >
                      No data
                    </td>
                  </tr>
                ) : (
                  filtered.onsiteB.map((row, i) => {
                    const isLast = i === filtered.onsiteB.length - 1;
                    return (
                      <tr
                        key={i}
                        className={
                          isLast ? "" : "border-b border-[#B8CAD9]/55"
                        }
                      >
                        <td
                          className={`bg-[#D1DEE9] px-4 py-2 text-[13px] text-[#1F2937]${isLast ? " rounded-bl-lg" : ""}`}
                        >
                          {formatDate(row.date)}
                        </td>
                        <td className="bg-[#D1DEE9] px-4 py-2 text-[13px] text-[#1F2937]">
                          {row.time_lodged ?? "—"}
                        </td>
                        <td className="bg-[#D1DEE9] px-4 py-2 text-[13px] text-[#1F2937]">
                          {row.section}
                        </td>
                        <td className="bg-[#D1DEE9] px-4 py-2 text-left text-[13px] tabular-nums text-[#1F2937]">
                          {row.backfill_m3}
                        </td>
                        <td
                          className={`bg-[#D1DEE9] px-4 py-2 text-left text-[13px] tabular-nums text-[#1F2937]${isLast ? " rounded-br-lg" : ""}`}
                        >
                          {row.chainage ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-xl border border-[#D6D0E2] bg-[#E6E2EE] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className={sectionTitleStyles}>
              OnSite-W (water)
              {data.mockFlags?.w && (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                  mock data
                </span>
              )}
            </h2>
          </div>
          <div
            ref={wRef}
            className="overflow-x-auto rounded-lg border border-[#C8BEDB] bg-[#DDD6EB]"
          >
            <table className="w-full min-w-[400px] table-fixed">
              <thead>
                <tr className="border-b border-[#BFB3D5]/70 bg-[#DDD6EB]">
                  <th className="w-1/6 rounded-tl-lg px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Date
                  </th>
                  <th className="w-1/6 px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Time lodged
                  </th>
                  <th className="w-1/6 px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Location
                  </th>
                  <th className="w-1/6 px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Water (L)
                  </th>
                  <th className="w-1/6 px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Destination
                  </th>
                  <th className="w-1/6 rounded-tr-lg px-4 py-2 text-left text-[13px] font-medium text-[#374151]">
                    Truck ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.onsiteW.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="rounded-b-lg bg-[#DDD6EB] px-4 py-6 text-center text-[13px] text-[#4B5563]"
                    >
                      No data
                    </td>
                  </tr>
                ) : (
                  filtered.onsiteW.map((row, i) => {
                    const isLast = i === filtered.onsiteW.length - 1;
                    return (
                      <tr
                        key={i}
                        className={isLast ? "" : "border-b border-[#BFB3D5]/55"}
                      >
                        <td
                          className={`bg-[#DDD6EB] px-4 py-2 text-[13px] text-[#1F2937]${isLast ? " rounded-bl-lg" : ""}`}
                        >
                          {formatDate(row.date)}
                        </td>
                        <td className="bg-[#DDD6EB] px-4 py-2 text-[13px] text-[#1F2937]">
                          {row.time_lodged ?? "—"}
                        </td>
                        <td className="bg-[#DDD6EB] px-4 py-2 text-[13px] text-[#1F2937]">
                          {row.location}
                        </td>
                        <td className="bg-[#DDD6EB] px-4 py-2 text-left text-[13px] tabular-nums text-[#1F2937]">
                          {row.water_litres}
                        </td>
                        <td className="bg-[#DDD6EB] px-4 py-2 text-[13px] text-[#1F2937]">
                          {row.destination}
                        </td>
                        <td
                          className={`bg-[#DDD6EB] px-4 py-2 text-[13px] text-[#1F2937]${isLast ? " rounded-br-lg" : ""}`}
                        >
                          {row.truck_id ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
