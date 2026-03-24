"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { tokens } from "@/lib/designTokens";

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().split("T")[0];
}

function isWorkingDay(dateStr: string): boolean {
  const dow = new Date(dateStr + "T12:00:00").getDay();
  return dow !== 0 && dow !== 6;
}

function prevWorkingDay(dateStr: string): string {
  let d = addDays(dateStr, -1);
  while (!isWorkingDay(d)) d = addDays(d, -1);
  return d;
}

function nextWorkingDay(dateStr: string): string {
  let d = addDays(dateStr, 1);
  while (!isWorkingDay(d)) d = addDays(d, 1);
  return d;
}

function prevWeek(dateStr: string): string {
  return addDays(dateStr, -7);
}

function nextWeek(dateStr: string): string {
  return addDays(dateStr, 7);
}

function prevMonth(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

function nextMonth(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

function toWorkingDay(dateStr: string): string {
  if (isWorkingDay(dateStr)) return dateStr;
  const d = new Date(dateStr + "T12:00:00");
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString().split("T")[0];
}

type Props = {
  currentDate: string;
};

type PeriodFilter = "day" | "week" | "month";

export function DaySelector({ currentDate }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const crew = searchParams.get("crew") ?? "A";
  const view = searchParams.get("view") ?? "dashboard";
  const period = (searchParams.get("period") as PeriodFilter) ?? "day";

  const base = `/?crew=${crew}&view=${view}`;
  const periodParam = view === "spreadsheet" && period !== "day" ? `&period=${period}` : "";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Perth" });
  const todayDate = new Date(today + "T23:59:59");

  const prevDate =
    view === "spreadsheet" && period === "week"
      ? prevWeek(currentDate)
      : view === "spreadsheet" && period === "month"
        ? prevMonth(currentDate)
        : prevWorkingDay(currentDate);

  const nextDate =
    view === "spreadsheet" && period === "week"
      ? nextWeek(currentDate)
      : view === "spreadsheet" && period === "month"
        ? nextMonth(currentDate)
        : nextWorkingDay(currentDate);

  const nextDateClamped = nextDate <= today ? nextDate : null;

  let displayDate: string;
  if (view === "spreadsheet" && period === "month") {
    displayDate = new Date(currentDate + "T12:00:00").toLocaleDateString("en-AU", {
      month: "long",
      year: "numeric",
    });
  } else if (view === "spreadsheet" && period === "week") {
    const d = new Date(currentDate + "T12:00:00");
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    displayDate = `Week ${weekStart.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
  } else {
    displayDate = new Date(currentDate + "T12:00:00").toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  }

  const selectedDate = new Date(currentDate + "T12:00:00");

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    let yyyyMmDd: string;
    if (view === "spreadsheet" && period === "month") {
      yyyyMmDd = `${y}-${m}-01`;
    } else if (view === "spreadsheet" && period === "week") {
      const mon = new Date(date);
      const day = date.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      mon.setDate(date.getDate() + diff);
      yyyyMmDd = mon.toISOString().split("T")[0];
    } else {
      yyyyMmDd = `${y}-${m}-${d}`;
    }
    const working = period === "day" ? toWorkingDay(yyyyMmDd) : yyyyMmDd;
    setOpen(false);
    router.push(`${base}${periodParam}&date=${working}`);
  }

  return (
    <div
      className="flex items-center gap-4"
      style={{ marginBottom: tokens.spacing.gap }}
    >
      <Link
        href={`${base}${periodParam}&date=${prevDate}`}
        className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-black/5"
        style={{ color: tokens.text.secondary }}
      >
        ← Prev
      </Link>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<button type="button" />}
          className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-black/5 cursor-pointer transition-colors border-0 bg-transparent"
          style={{ color: tokens.text.primary }}
        >
          {displayDate}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[9999]" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={[
              { dayOfWeek: [0, 6] },
              { after: todayDate },
            ]}
            defaultMonth={selectedDate}
          />
        </PopoverContent>
      </Popover>
      <Link
        href={nextDateClamped ? `${base}${periodParam}&date=${nextDateClamped}` : "#"}
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          nextDateClamped ? "hover:bg-black/5" : "cursor-not-allowed opacity-50"
        }`}
        style={{ color: tokens.text.secondary }}
        onClick={(e) => !nextDateClamped && e.preventDefault()}
      >
        Next →
      </Link>
    </div>
  );
}
