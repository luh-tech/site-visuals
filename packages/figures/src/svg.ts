/**
 * Shared drawing: escaping, deterministic number formatting, text wrapping by a fixed width estimate (no DOM, no
 * font metrics, so the same input lays out the same everywhere), and the frame every figure wears.
 */
import type { Theme } from "./theme.js";

export const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Fixed-point numbers, never locale-formatted: output must not depend on where it renders. */
export const n = (v: number, d = 1): string => {
  const s = v.toFixed(d);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
};

export type Unit = "currency" | "percent" | "count" | "points" | string;

/** A value as the grammar prints it: currency compact ($4.02M), shares as percents (43%), counts as is. */
export function fmt(value: number, unit: Unit = "count"): string {
  if (unit === "percent") return `${n(value * 100, 0)}%`;
  if (unit === "points") return `${n(value, 1)} pts`;
  if (unit === "currency") {
    const a = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (a >= 1e9) return `${sign}$${n(a / 1e9, 2)}B`;
    if (a >= 1e6) return `${sign}$${n(a / 1e6, 2)}M`;
    if (a >= 1e3) return `${sign}$${n(a / 1e3, 0)}k`;
    return `${sign}$${n(a, 0)}`;
  }
  return n(value, Math.abs(value) < 10 && !Number.isInteger(value) ? 1 : 0);
}

/** Change shown as amount and percent together, signed (the grammar's rule): +$670k · +20.0%. */
export function change(value: number, plan: number, unit: Unit = "count"): { text: string; dir: "up" | "down" | "flat" } {
  const d = value - plan;
  const dir = d > 0 ? "up" : d < 0 ? "down" : "flat";
  const sign = d > 0 ? "+" : d < 0 ? "-" : "±";
  const pct = plan !== 0 ? `${sign}${n(Math.abs((d / plan) * 100), 1)}%` : "";
  const amount = unit === "percent" ? `${sign}${n(Math.abs(d) * 100, 1)} pts` : `${sign}${fmt(Math.abs(d), unit).replace("-", "")}`;
  return { text: unit === "percent" ? amount : pct ? `${amount} · ${pct}` : amount, dir };
}

/** Lines of at most `width` px at `size` px, by an average glyph advance per face (mono is wider). */
export function wrap(text: string, width: number, size: number, advance = 0.55): string[] {
  const max = Math.max(8, Math.floor(width / (size * advance)));
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

export function textBlock(
  lines: string[],
  x: number,
  y: number,
  size: number,
  lh: number,
  attrs: string,
): { svg: string; height: number } {
  const svg = lines
    .map((l, i) => `<text x="${n(x)}" y="${n(y + size + i * lh)}" font-size="${size}" ${attrs}>${esc(l)}</text>`)
    .join("");
  return { svg, height: lines.length ? size + (lines.length - 1) * lh : 0 };
}

export interface Body {
  svg: string;
  height: number;
}

export interface FrameParts {
  id: string;
  mark: string;
  title: string;
  alt: string;
  longDescription: string;
  caption?: string;
  sourceLine: string;
  width: number;
  body: (width: number) => Body;
}

const PAD = 20;

/** The frame: FIG mark, the finding title, the figure, the caption, then the source and stamp under a rule. */
export function frame(p: FrameParts, t: Theme): string {
  const inner = p.width - PAD * 2;
  let y = PAD;
  const parts: string[] = [];
  parts.push(
    `<text x="${PAD}" y="${y + 11}" font-size="11.5" letter-spacing=".06em" font-family="${esc(t.fonts.stamp)}" fill="${t.muted}">${esc(p.mark)}</text>`,
  );
  y += 11 + 10;
  const title = textBlock(wrap(p.title, inner, 17, 0.6), PAD, y, 17, 22, `font-family="${esc(t.fonts.title)}" font-weight="600" fill="${t.ink}"`);
  parts.push(title.svg);
  y += title.height + 14;
  const body = p.body(inner);
  parts.push(`<g transform="translate(${PAD} ${y})">${body.svg}</g>`);
  y += body.height + 12;
  if (p.caption) {
    const cap = textBlock(wrap(p.caption, inner, 13), PAD, y, 13, 18, `font-family="${esc(t.fonts.label)}" fill="${t.ink}"`);
    parts.push(cap.svg);
    y += cap.height + 10;
  }
  parts.push(`<line x1="${PAD}" y1="${y}" x2="${p.width - PAD}" y2="${y}" stroke="${t.grid}" stroke-width="1"/>`);
  y += 8;
  const stamp = textBlock(wrap(p.sourceLine, inner, 11.5, 0.62), PAD, y, 11.5, 16, `font-family="${esc(t.fonts.stamp)}" fill="${t.muted}"`);
  parts.push(stamp.svg);
  y += stamp.height + PAD;
  const h = Math.ceil(y);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.width} ${h}" width="${p.width}" height="${h}" role="img" ` +
    `aria-labelledby="${p.id}-t ${p.id}-d" data-figure="${esc(p.id)}">` +
    `<title id="${p.id}-t">${esc(p.alt)}</title><desc id="${p.id}-d">${esc(p.longDescription)}</desc>` +
    `<rect width="${p.width}" height="${h}" fill="${t.surface}"/>` +
    parts.join("") +
    `</svg>`
  );
}
