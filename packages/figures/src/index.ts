/**
 * @luhtech/figures -- the holdings' figure kit (d-2026-10-16-bt-figure-kit).
 *
 *   render(figure, data, theme) -> SVG string
 *
 * A figure record (schema-registry content/figure) is drawn the same on every surface: the frame, the stamp its
 * register requires, and its figure body, in the host brand's theme. Deterministic: no DOM, no clock, no
 * randomness, numbers formatted by fixed rules -- the same inputs give the same bytes on Node, in a browser and at
 * an Astro build. The package carries code only; records, data and brand values come from the host.
 */
import type { Figure } from "./generated/figure.js";
import type { Theme } from "./theme.js";
import { frame, esc } from "./svg.js";
import * as F from "./figures.js";

export type { Figure } from "./generated/figure.js";
export type { BrandIdentity } from "./generated/brand-identity.js";
export type { MarketFamilies } from "./generated/market-family.js";
export type { MarketCell } from "./generated/market-cell.js";
export { buildTheme, marketSwatches, themeCss, type Theme, type Pair } from "./theme.js";
export { contrast, lineFor } from "./color.js";
export type * from "./figures.js";

/** The figure types this version draws; every other slug renders its frame with a "not drawn yet" body. */
export const DRAWN = ["ring-comparison", "ring-section", "ring-series", "record-readings", "lever"] as const;

type Diagram = {
  diagramId?: string;
  diagramType?: string;
  caption?: string;
  data?: unknown;
  register?: "analyst" | "executive" | "site" | "sandbox";
  source?: { ref: string; label: string };
  stamp?: {
    asOf?: string;
    version?: string;
    scenario?: string;
    publishedAt?: string;
    basis?: "committed" | "modelled";
    changeCount?: number;
  };
  illustrative?: boolean;
};

/** The source and stamp line the register requires (the pack's stamp column). */
export function stampLine(dg: Diagram): string {
  const s = dg.stamp ?? {};
  const parts: string[] = [];
  if (dg.source?.label) parts.push(`Source: ${dg.source.label}`);
  switch (dg.register) {
    case "executive":
      parts.push(`${s.scenario ?? ""} · published ${s.publishedAt ?? ""} · ${s.basis ?? ""}`.trim());
      break;
    case "analyst":
      parts.push(`As of ${s.asOf ?? ""} · version ${s.version ?? ""}`);
      break;
    case "sandbox":
      parts.push(`${s.changeCount ?? 0} change${s.changeCount === 1 ? "" : "s"} · modelled, not committed`);
      break;
    default:
      if (s.asOf) parts.push(`As of ${s.asOf}`);
  }
  if (dg.illustrative) parts.push("illustrative");
  return parts.filter(Boolean).join(" · ");
}

export interface RenderOptions {
  width?: number;
  /** The FIG mark's number on this surface, e.g. 2 -> "FIG 2". */
  number?: number;
}

const slug = (id: string) => id.split(":").pop()!.replace(/[^a-z0-9-]/g, "-");

export function render(figure: Figure, data: unknown, theme: Theme, opts: RenderOptions = {}): string {
  const dg = figure.diagram as Diagram;
  const type = dg.diagramType ?? "";
  const d = (data ?? dg.data ?? {}) as never;
  const body = (w: number) => {
    switch (type) {
      case "ring-comparison":
        return F.ringComparison(d, theme, w);
      case "ring-section":
        return F.ringSection(d, theme, w);
      case "ring-series":
        return F.ringSeries(d, theme, w);
      case "record-readings":
        return F.recordReadings(d, theme, w);
      case "lever":
        return F.lever(d, theme, w);
      default:
        return F.notDrawnYet(type, theme, w);
    }
  };
  return frame(
    {
      id: `fig-${slug(figure.figureId)}`,
      mark: opts.number ? `FIG ${opts.number}` : "FIG",
      title: figure.title,
      alt: figure.alt,
      longDescription: figure.longDescription,
      caption: dg.caption,
      sourceLine: stampLine(dg),
      width: opts.width ?? 640,
      body,
    },
    theme,
  );
}

/**
 * The data table WCAG's two-part text alternative calls for, when the record names one: an HTML table of the
 * same rows the figure draws, to sit beside it.
 */
export function dataTable(figure: Figure, data?: unknown, theme?: Theme): string {
  if (!figure.dataTable) return "";
  // Styled inline from the theme, so the table reads the same on any host whether or not it has table CSS.
  const ink = theme?.ink ?? "#141414";
  const rule = theme?.grid ?? "#D8D8D0";
  const font = esc(theme?.fonts.label ?? "system-ui, sans-serif");
  const cell = `padding:4px 16px 4px 0;text-align:left;border-bottom:1px solid ${rule}`;
  const dg = figure.diagram as Diagram;
  const d = (data ?? dg.data ?? {}) as Record<string, unknown>;
  const rows: unknown[] =
    (d.rings as unknown[]) ?? (d.cells as unknown[]) ?? (d.points as unknown[]) ?? (d.readings as unknown[]) ?? (d.levers as unknown[]) ?? [];
  const cols = rows.length ? Object.keys(rows[0] as object) : [];
  const head = cols.map((c) => `<th scope="col" style="${cell};font-weight:600">${esc(c)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${cols.map((c) => `<td style="${cell}">${esc((r as Record<string, unknown>)[c])}</td>`).join("")}</tr>`)
    .join("");
  return (
    `<table class="lt-figure-table" style="border-collapse:collapse;margin:8px 0 0;font:13px/1.4 ${font};color:${ink}">` +
    `<caption style="caption-side:top;text-align:left;font-weight:600;padding:0 0 6px">${esc(figure.dataTable.caption)}</caption>` +
    `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
  );
}

/** A figure's data: its own when illustrative, else what a host-supplied resolver returns for its source. */
export type Resolver = (ref: string, figure: Figure) => Promise<unknown>;

export async function resolveData(figure: Figure, resolvers: Record<string, Resolver> = {}): Promise<unknown> {
  const dg = figure.diagram as Diagram;
  if (dg.illustrative || dg.data != null) return dg.data;
  const ref = dg.source?.ref ?? "";
  const key = Object.keys(resolvers).find((prefix) => ref.startsWith(prefix));
  if (!key) throw new Error(`no resolver for ${ref}`);
  return resolvers[key](ref, figure);
}

/**
 * lb-portfolio, the holdings' graph serve point, as a resolver: the source node and its neighbourhood. The host
 * passes its own fetch and headers (its caller token and the viewer it reads for); the kit holds no credential.
 */
export function lbPortfolioResolver(opts: {
  baseUrl?: string;
  headers: Record<string, string>;
  fetch?: typeof fetch;
  depth?: number;
}): Resolver {
  const base = opts.baseUrl ?? "https://lb-portfolio.agents.luh.tech";
  const f = opts.fetch ?? fetch;
  return async (ref) => {
    const url = `${base}/v1/neighbourhood?id=${encodeURIComponent(ref)}&depth=${opts.depth ?? 1}`;
    const res = await f(url, { headers: { Accept: "application/json", ...opts.headers }, redirect: "error" });
    if (!res.ok) throw new Error(`lb-portfolio ${res.status}`);
    return res.json();
  };
}
