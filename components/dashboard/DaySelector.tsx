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

export function DaySelector({ currentDate }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const crew = searchParams.get("crew") ?? "A";
  const view = searchParams.get("view") ?? "dashboard";

  const base = `/?crew=${crew}&view=${view}`;
  const prevDate = prevWorkingDay(currentDate);
  const nextDate = nextWorkingDay(currentDate);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Perth" });
  const todayDate = new Date(today + "T23:59:59");

  const displayDate = new Date(currentDate + "T12:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const selectedDate = new Date(currentDate + "T12:00:00");

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    const yyyyMmDd = date.toISOString().split("T")[0];
    const working = toWorkingDay(yyyyMmDd);
    setOpen(false);
    router.push(`${base}&date=${working}`);
  }

  return (
    <div
      className="flex items-center gap-4"
      style={{ marginBottom: tokens.spacing.gap }}
    >
      <Link
        href={`${base}&date=${prevDate}`}
        className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-black/5"
        style={{ color: tokens.text.secondary }}
      >
        ← Prev
      </Link>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-black/5 cursor-pointer transition-colors"
            style={{ color: tokens.text.primary }}
          >
            {displayDate}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
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
        href={nextDate <= today ? `${base}&date=${nextDate}` : "#"}
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          nextDate <= today ? "hover:bg-black/5" : "cursor-not-allowed opacity-50"
        }`}
        style={{ color: tokens.text.secondary }}
        onClick={(e) => nextDate > today && e.preventDefault()}
      >
        Next →
      </Link>
    </div>
  );
}
