// d-2026-10-16-bt-figure-kit: the kit draws the grammar exactly, every time, in every host's theme.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  render,
  buildTheme,
  dataTable,
  stampLine,
  resolveData,
  lbPortfolioResolver,
  lineFor,
  contrast,
  DRAWN,
} from "../dist/index.js";
import { Figure } from "../dist/react.js";

const dir = new URL("./fixtures/", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, dir), "utf8"));
const families = read("market-families.json");
const cells = read("market-cells.json");
const brands = Object.fromEntries(readdirSync(new URL("brands/", dir)).map((f) => [f.replace(".json", ""), read(`brands/${f}`)]));
const figures = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => f.startsWith("figure-"))
    .map((f) => [f.slice(7, -5), read(f)]),
);
const lb = buildTheme(brands["luhtech-business"], families, cells);
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

test("the colour port reproduces every line schema-registry stores (12 brands, 10 families)", () => {
  for (const [id, b] of Object.entries(brands)) {
    const c = b.color.chart;
    for (const role of ["planGhost", "accent", "changeUp", "changeDown"])
      assert.equal(lineFor(c[role].fill.hex, c.surfaces.light.surface.hex), c[role].line.hex, `${id} ${role}`);
  }
  for (const f of families.families) assert.equal(lineFor(f.hue.fill.hex, families.lightSurface.hex), f.hue.line.hex, f.id);
});

test("every brand builds a theme, and every market cell has a swatch and one place", () => {
  for (const b of Object.values(brands)) {
    const t = buildTheme(b, families, cells);
    assert.equal(Object.keys(t.markets).length, cells.length);
    assert.ok(contrast(t.ink, t.surface) >= 4.5, b.brandId);
    for (const s of Object.values(t.markets)) assert.ok(contrast(s.line, families.lightSurface.hex) >= 3, s.order.join());
  }
  const keys = Object.values(lb.markets).map((s) => s.order.join("|"));
  assert.equal(new Set(keys).size, keys.length);
});

test("the same record, data and theme draw the same bytes (golden hashes)", () => {
  const goldenPath = new URL("golden.json", import.meta.url);
  const got = {};
  for (const [brand, b] of Object.entries({ "luhtech-business": brands["luhtech-business"], ectropy: brands.ectropy }))
    for (const [k, f] of Object.entries(figures)) {
      const t = buildTheme(b, families, cells);
      const a = render(f, undefined, t, { number: 1 });
      assert.equal(render(f, undefined, t, { number: 1 }), a, `${brand} ${k} twice`);
      got[`${brand}/${k}`] = sha(a);
    }
  if (process.env.UPDATE_GOLDEN || !existsSync(goldenPath)) writeFileSync(goldenPath, JSON.stringify(got, null, 2) + "\n");
  assert.deepEqual(got, JSON.parse(readFileSync(goldenPath, "utf8")));
});

test("accessible as drawn: role, title, description, and the data table the record names", () => {
  const f = figures["ring-comparison"];
  const svg = render(f, undefined, lb);
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-labelledby="fig-plan-against-draft-t fig-plan-against-draft-d"/);
  assert.ok(svg.includes(`<title id="fig-plan-against-draft-t">${f.alt}</title>`));
  assert.ok(svg.includes("<desc id=\"fig-plan-against-draft-d\">"));
  const table = dataTable(f);
  assert.match(table, /<caption>Revenue and cost, plan against draft<\/caption>/);
  assert.equal((table.match(/<tr>/g) ?? []).length, 3);
  assert.equal(dataTable(figures.lever), "");
});

test("the grammar: plan in the ghost, the accent only for what moved, change as amount and percent", () => {
  const rings = render(figures["ring-comparison"], undefined, lb);
  assert.ok(rings.indexOf(`fill="${lb.planGhost.fill}"`) < rings.indexOf(`fill="${lb.series.fill}"`), "plan drawn first, in the ghost");
  const lev = render(figures.lever, undefined, lb);
  assert.equal((lev.match(new RegExp(`fill="${lb.accent.fill}"`, "g")) ?? []).length, 2, "two moved levers, two accents");
  assert.match(lev, /2 levers moved from plan/);
  const tiles = render(figures["record-readings"], undefined, lb);
  assert.match(tiles, /\+\$670k · \+20% vs plan/);
  assert.match(tiles, /\+11\.4 pts vs plan/);
});

test("each register's stamp says what the pack's stamp column names", () => {
  const dg = (k) => figures[k].diagram;
  assert.match(stampLine(dg("ring-section")), /As of 2026-10-16 · version 1ad8145b · illustrative$/);
  assert.match(stampLine(dg("ring-series")), /Draft · published 2026-10-16 · modelled/);
  assert.match(stampLine(dg("lever")), /2 changes · modelled, not committed/);
  assert.match(stampLine(dg("ring-comparison")), /^Source: Closes by cell, close 12 · As of 2026-10-16 · illustrative$/);
});

test("a type not drawn yet keeps its frame, never disappears", () => {
  assert.ok(!DRAWN.includes("graph-sphere"));
  const svg = render(figures["graph-sphere"], undefined, lb);
  assert.match(svg, /Not drawn yet: graph-sphere/);
  assert.match(svg, /What we build meets who we serve/);
});

test("the React adapter serves the same SVG bytes", () => {
  const f = figures["ring-section"];
  const html = renderToStaticMarkup(createElement(Figure, { figure: f, theme: lb, number: 2 }));
  assert.ok(html.includes(render(f, undefined, lb, { number: 2 })));
});

test("data: an illustrative record's own, else the resolver for its source", async () => {
  assert.deepEqual(await resolveData(figures.lever), figures.lever.diagram.data);
  const real = structuredClone(figures["graph-sphere"]);
  await assert.rejects(resolveData(real, {}), /no resolver/);
  const calls = [];
  const fake = async (url, init) => {
    calls.push([url, init]);
    return new Response(JSON.stringify({ center: "x", nodes: [], edges: [] }));
  };
  const got = await resolveData(real, { "urn:luhtech:": lbPortfolioResolver({ headers: { Authorization: "Bearer t" }, fetch: fake }) });
  assert.equal(got.center, "x");
  assert.match(calls[0][0], /\/v1\/neighbourhood\?id=urn%3Aluhtech%3Aluhtech%3Arepo%3Aluhtech-business&depth=1$/);
  assert.equal(calls[0][1].headers.Authorization, "Bearer t");
  assert.equal(calls[0][1].redirect, "error");
});

test("rings that are not a plan are not ghosted; a cost past revenue leaves no ring", () => {
  const f = structuredClone(figures["ring-comparison"]);
  f.diagram.data = { rings: [{ label: "A", revenue: 100, cost: 85 }, { label: "B", revenue: 40, cost: 22 }, { label: "C", revenue: 60, cost: 72 }] };
  const svg = render(f, undefined, buildTheme(brands["luhtech-business"]));
  assert.ok(!svg.includes(`fill="${lb.planGhost.fill}"`));
  assert.match(svg, />-20%</);
});
