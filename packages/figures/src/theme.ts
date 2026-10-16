/**
 * The render theme: a host brand's chart roles and faces (schema-registry brand-identity color.chart and
 * typography.figure, the brand's canonical home) and the market families register, which colours and orders
 * markets the same on every host (decision d-2026-10-16-lb-figure-kit-architecture).
 */
import type { BrandIdentity } from "./generated/brand-identity.js";
import type { MarketFamilies } from "./generated/market-family.js";
import type { MarketCell } from "./generated/market-cell.js";
import { contrast, hexOklch, lineFor, shiftLightness } from "./color.js";

export interface Pair {
  fill: string;
  line: string;
}

export interface MarketSwatch extends Pair {
  /** Sort key: family order, then the root's place in its family, then precision, then id. */
  order: [number, number, number, string];
  family: string;
}

export interface Theme {
  brandId: string;
  mode: "light" | "dark";
  surface: string;
  ink: string;
  muted: string;
  planGhost: Pair;
  accent: Pair;
  changeUp: Pair;
  changeDown: Pair;
  /** The draft or series colour: the brand's primary, as a fill and line pair. */
  series: Pair;
  axis: string;
  grid: string;
  fonts: { title: string; label: string; stamp: string };
  markets: Record<string, MarketSwatch>;
}

const STACKS: Record<string, string> = {
  serif: "Georgia, serif",
  mono: "ui-monospace, Menlo, monospace",
  sans: "system-ui, sans-serif",
};

function face(brand: BrandIdentity, role: "display" | "body" | "mono"): string {
  const family = brand.typography[role].family;
  return `'${family}', ${role === "mono" ? STACKS.mono : STACKS.sans}`;
}

function pair(p: { fill: { hex: string }; line: { hex: string } }): Pair {
  return { fill: p.fill.hex, line: p.line.hex };
}

/** Every cell's swatch: its root's family hue, the root's sibling offset, then the precision step per level. */
export function marketSwatches(families: MarketFamilies, cells: MarketCell[]): Record<string, MarketSwatch> {
  const byId = new Map(cells.map((c) => [c.id as string, c]));
  const fam = new Map(families.families.map((f) => [f.id, f]));
  const surface = families.lightSurface.hex;
  const out: Record<string, MarketSwatch> = {};
  for (const c of cells) {
    let root = c;
    for (let i = 0; i < 8 && (root.precision as number) > 0; i++) root = byId.get(root.parentCellId as string) ?? root;
    const f = fam.get(root.familyRef as string);
    if (!f) continue;
    const sibling = families.steps.siblingOffsets[((root.familyOrder as number) ?? 1) - 1] ?? 0;
    const fill = shiftLightness(f.hue.fill.hex, sibling + families.steps.precisionStep * (c.precision as number));
    out[c.id as string] = {
      fill,
      line: lineFor(fill, surface),
      family: f.id,
      order: [f.order, (root.familyOrder as number) ?? 1, c.precision as number, c.id as string],
    };
  }
  return out;
}

export function buildTheme(
  brand: BrandIdentity,
  families: MarketFamilies,
  cells: MarketCell[],
  mode: "light" | "dark" = "light",
): Theme {
  const chart = brand.color.chart;
  if (!chart) throw new Error(`${brand.brandId} has no color.chart: it does not host figures yet`);
  if (!brand.typography.figure) throw new Error(`${brand.brandId} has no typography.figure`);
  const s = chart.surfaces[mode];
  const roles = brand.typography.figure;
  // The draft or series colour: the brand's primary, unless it is near-neutral (a near-black primary reads as
  // ink, not as a series), then its secondary. On a dark surface a dark series lightens until it reads.
  const primary = brand.color.accent.primary.hex;
  const secondary = brand.color.accent.secondary?.hex;
  const base = hexOklch(primary)[1] < 0.08 && secondary ? secondary : primary;
  const seriesFill = mode === "dark" && contrast(base, s.surface.hex) < 3 ? lineFor(base, s.surface.hex) : base;
  return {
    brandId: brand.brandId,
    mode,
    surface: s.surface.hex,
    ink: s.ink.hex,
    muted: chart.axis.hex,
    planGhost: pair(chart.planGhost),
    accent: pair(chart.accent),
    changeUp: pair(chart.changeUp),
    changeDown: pair(chart.changeDown),
    series: { fill: seriesFill, line: lineFor(seriesFill, chart.surfaces.light.surface.hex) },
    axis: chart.axis.hex,
    grid: chart.grid.hex,
    fonts: { title: face(brand, roles.title), label: face(brand, roles.label), stamp: face(brand, roles.stamp) },
    markets: marketSwatches(families, cells),
  };
}

/** The theme as CSS custom properties, for host chrome that sits beside a figure. */
export function themeCss(theme: Theme, prefix = "--fig"): string {
  const v: Record<string, string> = {
    surface: theme.surface,
    ink: theme.ink,
    muted: theme.muted,
    "plan-fill": theme.planGhost.fill,
    "plan-line": theme.planGhost.line,
    "accent-fill": theme.accent.fill,
    "accent-line": theme.accent.line,
    "up-line": theme.changeUp.line,
    "down-line": theme.changeDown.line,
    "series-fill": theme.series.fill,
    "series-line": theme.series.line,
    axis: theme.axis,
    grid: theme.grid,
    "font-title": theme.fonts.title,
    "font-label": theme.fonts.label,
    "font-stamp": theme.fonts.stamp,
  };
  return Object.entries(v)
    .map(([k, val]) => `${prefix}-${k}: ${val};`)
    .join(" ");
}
