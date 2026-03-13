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

  const tableStyles = "overflow-x-auto rounded-lg border border-[#EEECEF] bg-[#FCFBFB]";
  const thStyles = "px-4 py-2 text-left text-[11px] font-medium text-zinc-600";
  const tdStyles = "px-4 py-2 text-[13px] text-zinc-800";
  const emptyTdStyles = "px-4 py-6 text-center text-[13px] text-zinc-500";
  const sectionTitleStyles = "text-[11px] font-medium uppercase tracking-wider text-zinc-600";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
          className="rounded-lg border border-[#EEECEF] bg-[#FCFBFB] px-3 py-2 text-[13px] text-zinc-800"
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleStyles}>
            OnSite-D (Pipes)
          </h2>
          <button
            type="button"
            onClick={() => printTable(dRef, "OnSite-D Pipes")}
            className="rounded-lg border border-[#EEECEF] px-3 py-1 text-[11px] text-zinc-600 hover:bg-[#ECEAF1] hover:text-zinc-800"
          >
            Print OnSite-D
          </button>
        </div>
        <div ref={dRef} className={tableStyles}>
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-[#EEECEF]">
                <th className={thStyles}>Date</th>
                <th className={thStyles}>Time lodged</th>
                <th className={thStyles}>Section</th>
                <th className={`${thStyles} text-right`}>Pipes Laid</th>
                <th className={thStyles}>Crew</th>
              </tr>
            </thead>
            <tbody>
              {filtered.onsiteD.length === 0 ? (
                <tr>
                  <td colSpan={5} className={emptyTdStyles}>
                    No data
                  </td>
                </tr>
              ) : (
                filtered.onsiteD.map((row, i) => (
                  <tr key={i} className="border-b border-[#EEECEF]/70">
                    <td className={tdStyles}>{formatDate(row.date)}</td>
                    <td className={tdStyles}>{row.time_lodged ?? "—"}</td>
                    <td className={tdStyles}>{row.section}</td>
                    <td className={`${tdStyles} text-right tabular-nums`}>{row.pipes_laid}</td>
                    <td className={tdStyles}>{row.crew}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleStyles}>
            OnSite-B (Backfill)
          </h2>
          <button
            type="button"
            onClick={() => printTable(bRef, "OnSite-B Backfill")}
            className="rounded-lg border border-[#EEECEF] px-3 py-1 text-[11px] text-zinc-600 hover:bg-[#ECEAF1] hover:text-zinc-800"
          >
            Print OnSite-B
          </button>
        </div>
        <div ref={bRef} className={tableStyles}>
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-[#EEECEF]">
                <th className={thStyles}>Date</th>
                <th className={thStyles}>Time lodged</th>
                <th className={thStyles}>Section</th>
                <th className={`${thStyles} text-right`}>Backfill (m³)</th>
                <th className={thStyles}>Crew</th>
              </tr>
            </thead>
            <tbody>
              {filtered.onsiteB.length === 0 ? (
                <tr>
                  <td colSpan={5} className={emptyTdStyles}>
                    No data
                  </td>
                </tr>
              ) : (
                filtered.onsiteB.map((row, i) => (
                  <tr key={i} className="border-b border-[#EEECEF]/70">
                    <td className={tdStyles}>{formatDate(row.date)}</td>
                    <td className={tdStyles}>{row.time_lodged ?? "—"}</td>
                    <td className={tdStyles}>{row.section}</td>
                    <td className={`${tdStyles} text-right tabular-nums`}>{row.backfill_m3}</td>
                    <td className={tdStyles}>{row.crew}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleStyles}>
            OnSite-W (Water)
          </h2>
          <button
            type="button"
            onClick={() => printTable(wRef, "OnSite-W Water")}
            className="rounded-lg border border-[#EEECEF] px-3 py-1 text-[11px] text-zinc-600 hover:bg-[#ECEAF1] hover:text-zinc-800"
          >
            Print OnSite-W
          </button>
        </div>
        <div ref={wRef} className={tableStyles}>
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-[#EEECEF]">
                <th className={thStyles}>Date</th>
                <th className={thStyles}>Time lodged</th>
                <th className={thStyles}>Location</th>
                <th className={`${thStyles} text-right`}>Water (L)</th>
                <th className={thStyles}>Destination</th>
                <th className={thStyles}>Truck ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.onsiteW.length === 0 ? (
                <tr>
                  <td colSpan={6} className={emptyTdStyles}>
                    No data
                  </td>
                </tr>
              ) : (
                filtered.onsiteW.map((row, i) => (
                  <tr key={i} className="border-b border-[#EEECEF]/70">
                    <td className={tdStyles}>{formatDate(row.date)}</td>
                    <td className={tdStyles}>{row.time_lodged ?? "—"}</td>
                    <td className={tdStyles}>{row.location}</td>
                    <td className={`${tdStyles} text-right tabular-nums`}>{row.water_litres}</td>
                    <td className={tdStyles}>{row.destination}</td>
                    <td className={tdStyles}>{row.truck_id ?? "—"}</td>
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
