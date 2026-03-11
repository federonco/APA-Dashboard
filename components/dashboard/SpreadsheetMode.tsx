"use client";

import { useState, useRef } from "react";
import type { SpreadsheetData } from "@/lib/queries/spreadsheet";
import {
  filterByPeriod,
  formatDate,
  type PeriodFilter,
} from "@/lib/utils/spreadsheetFormat";

type SpreadsheetModeProps = {
  data: SpreadsheetData;
  crew: string;
};

export function SpreadsheetMode({ data, crew }: SpreadsheetModeProps) {
  const [period, setPeriod] = useState<PeriodFilter>("week");
  const dRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const wRef = useRef<HTMLDivElement>(null);

  const filtered = {
    onsiteD: filterByPeriod(data.onsiteD, period),
    onsiteB: filterByPeriod(data.onsiteB, period),
    onsiteW: filterByPeriod(data.onsiteW, period),
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
            body { font-family: monospace; font-size: 12px; padding: 20px; }
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
          className="rounded border border-[#1e1e1e] bg-[#0e0e0e] px-3 py-2 font-mono text-sm text-white"
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-barlow text-sm font-bold uppercase tracking-wider text-[#999]">
            OnSite-D (Pipes)
          </h2>
          <button
            type="button"
            onClick={() => printTable(dRef, "OnSite-D Pipes")}
            className="rounded border border-[#1e1e1e] px-3 py-1 font-mono text-xs text-[#999] hover:bg-[#1e1e1e] hover:text-white"
          >
            Print OnSite-D
          </button>
        </div>
        <div
          ref={dRef}
          className="overflow-x-auto rounded border border-[#1e1e1e] bg-[#0e0e0e]"
        >
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                <th className="px-4 py-2 text-left font-mono text-xs text-[#999]">
                  Date
                </th>
                <th className="px-4 py-2 text-left font-mono text-xs text-[#999]">
                  Section
                </th>
                <th className="px-4 py-2 text-right font-mono text-xs text-[#999]">
                  Pipes Laid
                </th>
                <th className="px-4 py-2 text-left font-mono text-xs text-[#999]">
                  Crew
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.onsiteD.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center font-mono text-sm text-[#666]"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                filtered.onsiteD.map((row, i) => (
                  <tr key={i} className="border-b border-[#1e1e1e]/50">
                    <td className="px-4 py-2 font-mono text-sm">{formatDate(row.date)}</td>
                    <td className="px-4 py-2 font-mono text-sm">{row.section}</td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {row.pipes_laid}
                    </td>
                    <td className="px-4 py-2 font-mono text-sm">{row.crew}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-barlow text-sm font-bold uppercase tracking-wider text-[#999]">
            OnSite-B (Backfill)
          </h2>
          <button
            type="button"
            onClick={() => printTable(bRef, "OnSite-B Backfill")}
            className="rounded border border-[#1e1e1e] px-3 py-1 font-mono text-xs text-[#999] hover:bg-[#1e1e1e] hover:text-white"
          >
            Print OnSite-B
          </button>
        </div>
        <div
          ref={bRef}
          className="overflow-x-auto rounded border border-[#1e1e1e] bg-[#0e0e0e]"
        >
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                <th className="px-4 py-2 text-left font-mono text-xs text-[#999]">
                  Date
                </th>
                <th className="px-4 py-2 text-left font-mono text-xs text-[#999]">
                  Section
                </th>
                <th className="px-4 py-2 text-right font-mono text-xs text-[#999]">
                  Backfill (m³)
                </th>
                <th className="px-4 py-2 text-left font-mono text-xs text-[#999]">
                  Crew
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.onsiteB.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center font-mono text-sm text-[#666]"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                filtered.onsiteB.map((row, i) => (
                  <tr key={i} className="border-b border-[#1e1e1e]/50">
                    <td className="px-4 py-2 font-mono text-sm">{formatDate(row.date)}</td>
                    <td className="px-4 py-2 font-mono text-sm">{row.section}</td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {row.backfill_m3}
                    </td>
                    <td className="px-4 py-2 font-mono text-sm">{row.crew}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-barlow text-sm font-bold uppercase tracking-wider text-[#999]">
            OnSite-W (Water)
          </h2>
          <button
            type="button"
            onClick={() => printTable(wRef, "OnSite-W Water")}
            className="rounded border border-[#1e1e1e] px-3 py-1 font-mono text-xs text-[#999] hover:bg-[#1e1e1e] hover:text-white"
          >
            Print OnSite-W
          </button>
        </div>
        <div
          ref={wRef}
          className="overflow-x-auto rounded border border-[#1e1e1e] bg-[#0e0e0e]"
        >
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                <th className="px-4 py-2 text-left font-mono text-xs text-[#999]">
                  Date
                </th>
                <th className="px-4 py-2 text-left font-mono text-xs text-[#999]">
                  Location
                </th>
                <th className="px-4 py-2 text-right font-mono text-xs text-[#999]">
                  Water (m³)
                </th>
                <th className="px-4 py-2 text-left font-mono text-xs text-[#999]">
                  Destination
                </th>
                <th className="px-4 py-2 text-left font-mono text-xs text-[#999]">
                  Crew
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.onsiteW.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center font-mono text-sm text-[#666]"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                filtered.onsiteW.map((row, i) => (
                  <tr key={i} className="border-b border-[#1e1e1e]/50">
                    <td className="px-4 py-2 font-mono text-sm">{formatDate(row.date)}</td>
                    <td className="px-4 py-2 font-mono text-sm">{row.location}</td>
                    <td className="px-4 py-2 text-right font-mono text-sm">
                      {row.water_m3}
                    </td>
                    <td className="px-4 py-2 font-mono text-sm">{row.destination}</td>
                    <td className="px-4 py-2 font-mono text-sm">{row.crew}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
