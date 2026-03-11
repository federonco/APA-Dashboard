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
  border: theme?.border ?? "#E5E7EB",
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
    border: theme?.border ?? "#E5E7EB",
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
    pipeLaid: charts?.pipeLaid ?? "#E46A3C",
    backfill: charts?.backfill ?? "#4A79A8",
    pipeTarget: charts?.pipeTarget ?? "#E46A3C",
    backfillTarget: charts?.backfillTarget ?? "#4A79A8",
  },
  waterChart: {
    pipeJointing: waterChart?.pipeJointing ?? "#3C3566",
    dustSuppression: waterChart?.dustSuppression ?? "#5E548E",
    testing: waterChart?.testing ?? "#B9B5D6",
    other: waterChart?.other ?? "#D6D6DD",
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
    fontFamily: typography?.fontFamily ?? "Inter, system-ui, sans-serif",
    title: typography?.title ?? "22px",
    subtitle: typography?.subtitle ?? "14px",
    kpi: typography?.kpi ?? "28px",
    body: typography?.body ?? "14px",
    label: typography?.label ?? "12px",
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
