import type { ReactNode } from "react";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function mixHex(hex: string, target: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  if (!a || !b) return hex;
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

export type WaterDonutSegment = { name: string; color: string };

export function waterDonutGradientId(prefix: string, index: number, name: string): string {
  const slug = name.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${prefix}-g-${index}-${slug}`;
}

/** Visible but restrained tonal gradients (purple / grey family only). */
export function WaterDonutDefs({
  prefix,
  segments,
}: {
  prefix: string;
  segments: WaterDonutSegment[];
}): ReactNode {
  const filterId = `${prefix}-depth`;
  return (
    <defs>
      <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow
          dx={0}
          dy={1.2}
          stdDeviation={1.35}
          floodColor="#1a1628"
          floodOpacity={0.14}
        />
      </filter>
      {segments.map((seg, i) => {
        const id = waterDonutGradientId(prefix, i, seg.name);
        const lum = luminance(seg.color);
        const hiT = lum > 0.75 ? 0.08 : lum > 0.55 ? 0.12 : 0.14;
        const loT = lum > 0.75 ? 0.1 : 0.14;
        const hi = mixHex(seg.color, "#f4f3f8", hiT);
        const lo = mixHex(seg.color, "#14121c", loT);
        const mid = mixHex(seg.color, "#ffffff", lum > 0.72 ? 0.03 : 0.06);
        return (
          <linearGradient
            key={id}
            id={id}
            x1="0.08"
            y1="0.12"
            x2="0.95"
            y2="0.92"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor={hi} stopOpacity={1} />
            <stop offset="42%" stopColor={mid} stopOpacity={1} />
            <stop offset="100%" stopColor={lo} stopOpacity={1} />
          </linearGradient>
        );
      })}
    </defs>
  );
}

export function waterDonutSectorFilterUrl(prefix: string): string {
  return `url(#${prefix}-depth)`;
}

/** Separators: soft cool grey, not stark white. */
export const waterDonutStroke = "#D9DCE3";
export const waterDonutStrokeWidth = 1.25;
/** Slightly wider gaps so separators read clearly. */
export const waterDonutPaddingAngle = 2.75;
