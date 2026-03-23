import rawTokens from "@/dashboard-ui-tokens.json";

const raw = rawTokens as Record<string, unknown>;
const theme = raw.theme as Record<string, string>;
const text = raw.text as Record<string, string>;
const status = raw.status as Record<string, string>;
const charts = raw.charts as Record<string, string>;
const waterChart = raw.waterChart as Record<string, string>;
const radius = raw.radius as Record<string, string>;
const spacing = raw.spacing as Record<string, string>;
const typography = raw.typography as Record<string, string>;
const comps = raw.components as Record<string, Record<string, unknown>>;

const refMap: Record<string, string> = {
  card: theme?.card ?? "#FFFFFF",
  border: theme?.border ?? "#F0F1F3",
  live: status?.live ?? "#22C55E",
  progressBar: status?.progressBar ?? "#3B3B45",
};

function resolveRef(v: unknown): string {
  return (typeof v === "string" && v in refMap ? refMap[v] : v) as string;
}

const kpiCard = comps?.kpiCard as Record<string, unknown>;
const progressBar = comps?.progressBar as Record<string, unknown>;
const badge = comps?.badge as Record<string, unknown>;

export const tokens = {
  theme: {
    background: theme?.background ?? "#F7F7F7",
    card: theme?.card ?? "#FFFFFF",
    border: theme?.border ?? "#F0F1F3",
  },
  text: {
    primary: text?.primary ?? "#111827",
    secondary: text?.secondary ?? "#6B7280",
    muted: text?.muted ?? "#9CA3AF",
  },
  status: {
    live: status?.live ?? "#22C55E",
    progressBar: status?.progressBar ?? "#3B3B45",
  },
  charts: {
    pipeLaid: charts?.pipeLaid ?? "#C9783A",
    backfill: charts?.backfill ?? "#6F8798",
    pipeTarget: charts?.pipeTarget ?? "#C9783A",
    backfillTarget: charts?.backfillTarget ?? "#6F8798",
  },
  waterChart: {
    pipeJointing: waterChart?.pipeJointing ?? "#38306A",
    dustSuppression: waterChart?.dustSuppression ?? "#5C5192",
    testing: waterChart?.testing ?? "#A9A2D4",
    other: waterChart?.other ?? "#CDCAD8",
  },
  radius: {
    card: radius?.card ?? "12px",
    badge: radius?.badge ?? "8px",
  },
  spacing: {
    section: spacing?.section ?? "32px",
    cardPadding: spacing?.cardPadding ?? "20px",
    gap: spacing?.gap ?? "16px",
  },
  typography: {
    fontFamily:
      typography?.fontFamily ??
      "var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
    title: typography?.title ?? "1.375rem",
    subtitle: typography?.subtitle ?? "0.875rem",
    kpi: typography?.kpi ?? "1.75rem",
    body: typography?.body ?? "0.875rem",
    label: typography?.label ?? "0.75rem",
  },
  components: {
    kpiCard: {
      height: String(kpiCard?.height ?? "96px"),
      background: resolveRef(kpiCard?.background) || theme?.card || "#FFFFFF",
      border: resolveRef(kpiCard?.border) || theme?.border || "#E5E7EB",
      radius: resolveRef(kpiCard?.radius) || radius?.card || "12px",
      padding: spacing?.cardPadding ?? "20px",
    },
    progressBar: {
      height: String(progressBar?.height ?? "8px"),
      background: (progressBar?.background as string) ?? "#E5E7EB",
      fill: resolveRef(progressBar?.fill) || status?.progressBar || "#3B3B45",
      radius: String(progressBar?.radius ?? "999px"),
    },
    badge: {
      background: resolveRef(badge?.background) || status?.live || "#22C55E",
      text: (badge?.text as string) ?? "#FFFFFF",
      padding: (badge?.padding as string) ?? "4px 10px",
      radius: resolveRef(badge?.radius) || radius?.badge || "8px",
    },
  },
} as const;
