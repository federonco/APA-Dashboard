/**
 * Premium line styling: layered “glow” stroke + crisp foreground, refined dots.
 * Series colors: `tokens.charts` (primary #C9783A, secondary #6F8798).
 */

/** Synthetic layer hidden from tooltips / legend via `CustomTooltip` + `legendType="none"`. */
export const CHART_GLOW_LINE_NAME = "__glow" as const;

export const chartLineVisual = {
  /** Foreground data stroke */
  strokeWidth: 2,
  strokeOpacity: 0.94,
  /** Soft underlay (same hue, wider + low opacity) */
  glowStrokeWidth: 6,
  glowStrokeOpacity: 0.12,
  /** Dashed target / projection */
  targetStrokeWidth: 1.5,
  targetStrokeOpacity: 0.4,
  projectionStrokeOpacity: 0.48,
  inactiveDim: 0.5,
  dotFill: "#ffffff",
  dotStrokeWidth: 2,
  dotRadius: 3,
  activeDotRadius: 4,
  targetDotRadius: 2,
} as const;

/** Main series markers: white core + series-colored ring */
export function chartSeriesDot(color: string) {
  return {
    r: chartLineVisual.dotRadius,
    fill: chartLineVisual.dotFill,
    stroke: color,
    strokeWidth: chartLineVisual.dotStrokeWidth,
  };
}

export function chartSeriesActiveDot(color: string) {
  return {
    r: chartLineVisual.activeDotRadius,
    fill: chartLineVisual.dotFill,
    stroke: color,
    strokeWidth: chartLineVisual.dotStrokeWidth,
  };
}

/** Dashed target lines — smaller dot, same ring language */
export function chartTargetDot(color: string) {
  return {
    r: chartLineVisual.targetDotRadius,
    fill: chartLineVisual.dotFill,
    stroke: color,
    strokeWidth: chartLineVisual.dotStrokeWidth,
  };
}
