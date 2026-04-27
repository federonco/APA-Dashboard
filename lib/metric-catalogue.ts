export type MetricCategory = "pipe_laying" | "psp" | "welding" | "water";

export const METRIC_CATALOGUE = [
  {
    key: "pipes_today",
    label: "Pipes Today",
    category: "pipe_laying" as const,
    requiresSection: true,
    requiresCrew: false,
    allowsSubsection: true,
    color: "blue",
    icon: "🔧",
  },
  {
    key: "pipes_this_month",
    label: "Pipes This Month",
    category: "pipe_laying" as const,
    requiresSection: true,
    requiresCrew: false,
    allowsSubsection: true,
    color: "blue",
    icon: "🔧",
  },
  {
    key: "pipes_total",
    label: "Pipes Total",
    category: "pipe_laying" as const,
    requiresSection: true,
    requiresCrew: false,
    allowsSubsection: true,
    color: "blue",
    icon: "🔧",
  },
  {
    key: "psp_today",
    label: "PSP Today",
    category: "psp" as const,
    requiresSection: true,
    requiresCrew: false,
    allowsSubsection: true,
    color: "green",
    icon: "📋",
  },
  {
    key: "psp_this_month",
    label: "PSP This Month",
    category: "psp" as const,
    requiresSection: true,
    requiresCrew: false,
    allowsSubsection: true,
    color: "green",
    icon: "📋",
  },
  {
    key: "psp_total",
    label: "PSP Total",
    category: "psp" as const,
    requiresSection: true,
    requiresCrew: false,
    allowsSubsection: true,
    color: "green",
    icon: "📋",
  },
  {
    key: "welds_required",
    label: "Welds Required",
    category: "welding" as const,
    requiresSection: true,
    requiresCrew: false,
    allowsSubsection: true,
    color: "orange",
    icon: "",
  },
  {
    key: "weld_done",
    label: "Weld",
    category: "welding" as const,
    requiresSection: true,
    requiresCrew: false,
    allowsSubsection: true,
    color: "blue",
    icon: "",
  },
  {
    key: "wrap_done",
    label: "Wrap",
    category: "welding" as const,
    requiresSection: true,
    requiresCrew: false,
    allowsSubsection: true,
    color: "green",
    icon: "",
  },
  {
    key: "water_loads_today",
    label: "Water Loads Today",
    category: "water" as const,
    requiresSection: false,
    requiresCrew: true,
    allowsSubsection: false,
    color: "cyan",
    icon: "💧",
  },
  {
    key: "water_liters_today",
    label: "Water Litres Today",
    category: "water" as const,
    requiresSection: false,
    requiresCrew: true,
    allowsSubsection: false,
    color: "cyan",
    icon: "💧",
  },
] as const;

export type MetricKey = (typeof METRIC_CATALOGUE)[number]["key"];

export function catalogueEntry(key: string) {
  return METRIC_CATALOGUE.find((m) => m.key === key);
}

const CATEGORY_LABEL: Record<MetricCategory, string> = {
  pipe_laying: "Pipe laying",
  psp: "Backfill (PSP)",
  welding: "Welding",
  water: "Water cart",
};

export function categoryLabel(cat: MetricCategory): string {
  return CATEGORY_LABEL[cat] ?? cat;
}

const WIZARD_SKIP = new Set<string>(["welds_required"]);
export const METRICS_IN_ADMIN_WIZARD = METRIC_CATALOGUE.filter((m) => !WIZARD_SKIP.has(m.key));
