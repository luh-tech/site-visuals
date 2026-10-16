/**
 * The figure bodies. Each draws inside the frame, from its data and the theme, and returns its height. The grammar
 * (Holdings Surface Pack 2.0; the final shapes canvas): the plan in the plan ghost under the draft, never the
 * reverse; one accent for what moved or is selected; change as amount and percent together; every mark its fill
 * with its line as the edge; markets in register order, coloured by family.
 */
import { arc } from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";
import type { Theme } from "./theme.js";
import { type Body, type Unit, change, esc, fmt, n, textBlock, wrap } from "./svg.js";

export interface Ring {
  label: string;
  revenue: number;
  cost: number;
}
export interface RingComparisonData {
  /** A ring labelled "Plan" is drawn in the plan ghost; every other ring in the series colour. */
  rings: Ring[];
}
export interface SectionCell {
  cellId: string;
  label: string;
  /** The cell's share of the whole, any positive scale: angles are shares of the sum. */
  share: number;
  /** The solid band's outer edge, e.g. margin (0..1). */
  value: number;
  /** The tint from the centre, e.g. cost to serve (0..1). */
  inner?: number;
  /** Where the plan put value: drawn as a dashed arc. */
  plan?: number;
}
export interface RingSectionData {
  cells: SectionCell[];
  center?: { value: string; label?: string };
  legend?: string;
}
export interface SeriesPoint {
  label: string;
  value: number;
  plan?: number;
}
export interface RingSeriesData {
  points: SeriesPoint[];
  unit?: Unit;
  max?: number;
}
export interface Reading {
  label: string;
  value: number;
  plan?: number;
  unit?: Unit;
  /** A reading that is a word, not a number (e.g. the binding constraint: "Demand"). */
  text?: string;
  detail?: string;
}
export interface RecordReadingsData {
  readings: Reading[];
}
export interface Lever {
  id: string;
  label: string;
  value: number;
  plan: number;
  min: number;
  max: number;
  unit?: Unit;
  note?: string;
}
export interface LeverData {
  levers: Lever[];
  constraint?: { label: string; detail?: string };
}

const font = (f: string) => `font-family="${esc(f)}"`;
const markAttrs = (p: { fill: string; line: string }, extra = "") =>
  `fill="${p.fill}" stroke="${p.line}" stroke-width="1.5"${extra}`;

export function ringComparison(d: RingComparisonData, t: Theme, width: number): Body {
  const rings = d.rings ?? [];
  const k = Math.max(1, rings.length);
  const cell = width / k;
  const maxR = Math.min(cell / 2 - 10, 78);
  const top = Math.max(...rings.map((r) => r.revenue), 1);
  const r = (v: number) => maxR * Math.sqrt(Math.max(0, v) / top);
  const cy = maxR + 4;
  const out: string[] = [];
  rings.forEach((ring, i) => {
    // i places the ring; whether it is the plan comes from its label
    const cx = cell * i + cell / 2;
    const isPlan = /^plan$/i.test(ring.label.trim());
    const p = isPlan ? t.planGhost : t.series;
    const margin = ring.revenue > 0 ? (ring.revenue - ring.cost) / ring.revenue : 0;
    out.push(
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r(ring.revenue))}" ${markAttrs(p)}/>`,
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r(ring.cost))}" fill="${t.surface}" stroke="${p.line}" stroke-width="1"/>`,
      `<text x="${n(cx)}" y="${n(cy - 2)}" text-anchor="middle" font-size="20" font-weight="600" ${font(t.fonts.title)} fill="${t.ink}">${fmt(margin, "percent")}</text>`,
      `<text x="${n(cx)}" y="${n(cy + 15)}" text-anchor="middle" font-size="10.5" ${font(t.fonts.label)} fill="${t.muted}">margin</text>`,
      `<text x="${n(cx)}" y="${n(cy + maxR + 22)}" text-anchor="middle" font-size="12.5" font-weight="600" ${font(t.fonts.label)} fill="${t.ink}">${esc(ring.label)}</text>`,
      `<text x="${n(cx)}" y="${n(cy + maxR + 38)}" text-anchor="middle" font-size="11" ${font(t.fonts.label)} fill="${t.muted}">${fmt(ring.revenue, "currency")} revenue · ${fmt(ring.cost, "currency")} cost</text>`,
    );
  });
  return { svg: out.join(""), height: cy + maxR + 44 };
}

export function ringSection(d: RingSectionData, t: Theme, width: number): Body {
  const order = (id: string) => t.markets[id]?.order ?? [99, 99, 99, id];
  const cells = [...(d.cells ?? [])].sort((a, b) => {
    const [x, y] = [order(a.cellId), order(b.cellId)];
    for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return 0;
  });
  const R = Math.min(width / 2 - 90, 120);
  const r0 = R * 0.2;
  const cx = width / 2;
  const cy = R + 28;
  const total = cells.reduce((s, c) => s + Math.max(0, c.share), 0) || 1;
  const vmax = Math.max(...cells.map((c) => Math.max(c.value, c.plan ?? 0, c.inner ?? 0)), 1e-9);
  const rad = (v: number) => r0 + (R - r0) * (v / vmax);
  const a = arc<{ i: number; o: number; s: number; e: number }>()
    .innerRadius((x) => x.i)
    .outerRadius((x) => x.o)
    .startAngle((x) => x.s)
    .endAngle((x) => x.e)
    .digits(2);
  const out: string[] = [];
  const labels: { x: number; y: number; right: boolean; text: string }[] = [];
  let ang = 0;
  for (const c of cells) {
    const sw = t.markets[c.cellId] ?? { fill: t.planGhost.fill, line: t.planGhost.line };
    const s = ang;
    const e = ang + (2 * Math.PI * Math.max(0, c.share)) / total;
    ang = e;
    const inner = c.inner != null ? rad(c.inner) : r0;
    out.push(
      `<path transform="translate(${n(cx)} ${n(cy)})" d="${a({ i: r0, o: inner, s, e })}" fill="${sw.fill}" fill-opacity=".28" stroke="${t.surface}" stroke-width="1.5"/>`,
      `<path transform="translate(${n(cx)} ${n(cy)})" d="${a({ i: inner, o: rad(c.value), s, e })}" ${markAttrs(sw)}/>`,
    );
    if (c.plan != null) {
      const pr = rad(c.plan);
      const arcOnly = arc<{ s: number; e: number }>()
        .innerRadius(pr)
        .outerRadius(pr)
        .startAngle((x) => x.s + 0.03)
        .endAngle((x) => x.e - 0.03)
        .digits(2);
      out.push(
        `<path transform="translate(${n(cx)} ${n(cy)})" d="${arcOnly({ s, e })}" fill="none" stroke="${t.planGhost.line}" stroke-width="1.4" stroke-dasharray="3 2.5"/>`,
      );
    }
    const mid = (s + e) / 2;
    const lr = rad(Math.max(c.value, c.plan ?? 0)) + 10;
    labels.push({ x: cx + lr * Math.sin(mid), y: cy - lr * Math.cos(mid), right: Math.sin(mid) >= 0, text: c.label });
  }
  // labels sit just past their wedge; on each side they push apart so none sit closer than 12px
  for (const right of [true, false]) {
    const side = labels.filter((l) => l.right === right).sort((a, b) => a.y - b.y);
    for (let i = 1; i < side.length; i++) if (side[i].y - side[i - 1].y < 12) side[i].y = side[i - 1].y + 12;
    for (const l of side)
      out.push(
        `<text x="${n(l.x)}" y="${n(l.y + 3.5)}" text-anchor="${right ? "start" : "end"}" font-size="10.5" ${font(t.fonts.label)} fill="${t.ink}">${esc(l.text)}</text>`,
      );
  }
  out.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r0 - 1)}" fill="${t.surface}"/>`);
  if (d.center)
    out.push(
      `<text x="${n(cx)}" y="${n(cy + 4.5)}" text-anchor="middle" font-size="13" font-weight="600" ${font(t.fonts.title)} fill="${t.ink}">${esc(d.center.value)}</text>`,
    );
  const legend = d.legend ?? "Solid: value · tint: inner · dashed: plan";
  out.push(`<text x="0" y="${n(cy + R + 40)}" font-size="10.5" ${font(t.fonts.label)} fill="${t.muted}">${esc(legend)}</text>`);
  return { svg: out.join(""), height: cy + R + 46 };
}

export function ringSeries(d: RingSeriesData, t: Theme, width: number): Body {
  const pts = d.points ?? [];
  const H = 150;
  const left = 34;
  const x = scalePoint<string>().domain(pts.map((p, i) => `${i}`)).range([left, width - 6]);
  const top = d.max ?? Math.max(...pts.map((p) => Math.max(p.value, p.plan ?? 0)), 1e-9);
  const y = scaleLinear().domain([0, top]).range([H - 22, 10]);
  const out: string[] = [];
  out.push(`<line x1="${left}" y1="${n(y(0))}" x2="${width - 6}" y2="${n(y(0))}" stroke="${t.axis}" stroke-width="1"/>`);
  out.push(`<line x1="${left}" y1="${n(y(top))}" x2="${width - 6}" y2="${n(y(top))}" stroke="${t.grid}" stroke-width="1"/>`);
  const path = (get: (p: SeriesPoint) => number | undefined) =>
    pts
      .map((p, i) => [x(`${i}`), get(p)] as const)
      .filter(([, v]) => v != null)
      .map(([px, v], i) => `${i ? "L" : "M"}${n(px ?? 0)},${n(y(v as number))}`)
      .join("");
  if (pts.some((p) => p.plan != null))
    out.push(`<path d="${path((p) => p.plan)}" fill="none" stroke="${t.planGhost.line}" stroke-width="1.5" stroke-dasharray="4 3"/>`);
  out.push(`<path d="${path((p) => p.value)}" fill="none" stroke="${t.series.line}" stroke-width="2"/>`);
  if (pts.length) {
    const last = pts[pts.length - 1];
    out.push(`<circle cx="${n(x(`${pts.length - 1}`) ?? 0)}" cy="${n(y(last.value))}" r="4.5" ${markAttrs(t.accent)}/>`);
  }
  const lab = (s: string, px: number, py: number, anchor: string) =>
    `<text x="${n(px)}" y="${n(py)}" text-anchor="${anchor}" font-size="10" ${font(t.fonts.label)} fill="${t.muted}">${esc(s)}</text>`;
  out.push(lab(fmt(top, d.unit), left - 4, y(top) + 3.5, "end"), lab("0", left - 4, y(0) + 3.5, "end"));
  if (pts.length) {
    out.push(lab(pts[0].label, x("0") ?? left, H - 6, "start"));
    out.push(lab(pts[pts.length - 1].label, x(`${pts.length - 1}`) ?? width, H - 6, "end"));
  }
  return { svg: out.join(""), height: H };
}

export function recordReadings(d: RecordReadingsData, t: Theme, width: number): Body {
  const rs = d.readings ?? [];
  const cols = Math.max(1, Math.min(3, rs.length));
  const gap = 14;
  const w = (width - gap * (cols - 1)) / cols;
  const rowH = 80;
  const out: string[] = [];
  rs.forEach((r, i) => {
    const x = (i % cols) * (w + gap);
    const y = Math.floor(i / cols) * rowH;
    out.push(`<line x1="${n(x)}" y1="${y + 1}" x2="${n(x + w)}" y2="${y + 1}" stroke="${t.ink}" stroke-width="2"/>`);
    out.push(
      `<text x="${n(x)}" y="${y + 20}" font-size="11" letter-spacing=".06em" ${font(t.fonts.stamp)} fill="${t.muted}">${esc(r.label.toUpperCase())}</text>`,
    );
    const big = r.text ?? fmt(r.value, r.unit);
    out.push(`<text x="${n(x)}" y="${y + 48}" font-size="22" font-weight="600" ${font(t.fonts.title)} fill="${t.ink}">${esc(big)}</text>`);
    let line = r.detail ?? "";
    let glyph = "";
    if (r.plan != null && r.text == null) {
      const c = change(r.value, r.plan, r.unit);
      line = `${c.text} vs plan`;
      const p = c.dir === "up" ? t.changeUp : c.dir === "down" ? t.changeDown : null;
      if (p) {
        const gy = y + 66;
        glyph =
          c.dir === "up"
            ? `<path d="M${n(x)},${gy} l4,-7 l4,7z" fill="${p.line}"/>`
            : `<path d="M${n(x)},${gy - 7} l4,7 l4,-7z" fill="${p.line}"/>`;
      }
    }
    out.push(glyph);
    out.push(
      `<text x="${n(x + (glyph ? 12 : 0))}" y="${y + 66}" font-size="12.5" ${font(t.fonts.label)} fill="${t.ink}">${esc(line)}</text>`,
    );
  });
  return { svg: out.join(""), height: Math.ceil(rs.length / cols) * rowH - 6 };
}

export function lever(d: LeverData, t: Theme, width: number): Body {
  const out: string[] = [];
  let y = 0;
  let moved = 0;
  for (const l of d.levers ?? []) {
    const isMoved = l.value !== l.plan;
    if (isMoved) moved++;
    const sx = scaleLinear().domain([l.min, l.max]).range([0, width]).clamp(true);
    out.push(`<text x="0" y="${y + 14}" font-size="13" font-weight="600" ${font(t.fonts.label)} fill="${t.ink}">${esc(l.label)}</text>`);
    out.push(
      `<text x="${width}" y="${y + 14}" text-anchor="end" font-size="12.5" ${font(t.fonts.stamp)} fill="${isMoved ? t.accent.line : t.ink}">${esc(fmt(l.value, l.unit))}</text>`,
    );
    const ty = y + 26;
    out.push(`<rect x="0" y="${ty - 2}" width="${width}" height="4" rx="2" fill="${t.grid}"/>`);
    out.push(`<line x1="${n(sx(l.plan))}" y1="${ty - 7}" x2="${n(sx(l.plan))}" y2="${ty + 7}" stroke="${t.planGhost.line}" stroke-width="2"/>`);
    out.push(`<circle cx="${n(sx(l.value))}" cy="${ty}" r="7" ${markAttrs(isMoved ? t.accent : t.series)}/>`);
    const note = l.note ?? `plan ${fmt(l.plan, l.unit)}`;
    out.push(`<text x="0" y="${ty + 22}" font-size="11.5" ${font(t.fonts.label)} fill="${t.muted}">${esc(note)}</text>`);
    y += 62;
  }
  if (d.constraint) {
    const lines = wrap(`${d.constraint.label}. ${d.constraint.detail ?? ""}`.trim(), width - 24, 12.5);
    const h = lines.length * 17 + 14;
    out.push(`<rect x="0" y="${y}" width="${width}" height="${h}" rx="6" fill="none" stroke="${t.accent.line}" stroke-width="1.5"/>`);
    out.push(textBlock(lines, 12, y + 5, 12.5, 17, `${font(t.fonts.label)} fill="${t.ink}"`).svg);
    y += h + 10;
  }
  out.push(
    `<text x="0" y="${y + 13}" font-size="12.5" ${font(t.fonts.label)} fill="${t.muted}">${moved} lever${moved === 1 ? "" : "s"} moved from plan</text>`,
  );
  return { svg: out.join(""), height: y + 18 };
}

export function notDrawnYet(type: string, t: Theme, width: number): Body {
  return {
    svg:
      `<rect x="0" y="0" width="${width}" height="72" rx="6" fill="none" stroke="${t.grid}" stroke-dasharray="4 3"/>` +
      `<text x="${n(width / 2)}" y="41" text-anchor="middle" font-size="12.5" ${font(t.fonts.label)} fill="${t.muted}">Not drawn yet: ${esc(type)}</text>`,
    height: 72,
  };
}
