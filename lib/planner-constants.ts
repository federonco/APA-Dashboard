import { tokens } from "@/lib/designTokens";

export const ACTIVITY_STATUS_COLORS: Record<string, string> = {
  planned: tokens.charts.pipeLaid,
  in_progress: "#E9B24D",
  done: "#2F7D55",
  blocked: "#DC2626",
};

export const PEOPLE_LEAVE_BAR_COLOR = "#A78BFA";
export const PEOPLE_LEAVE_BORDER_COLOR = "#7C3AED";

export function getCrewColor(index: number): string {
  const palette = [
    "#2563EB",
    "#16A085",
    "#E11D48",
    "#F59E0B",
    "#7C3AED",
    "#0EA5E9",
    "#22C55E",
    "#FB7185",
  ];
  return palette[Math.abs(index) % palette.length] ?? "#6B7280";
}

