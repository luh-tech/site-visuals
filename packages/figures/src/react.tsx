/**
 * React adapter. <Figure> renders the same SVG string render() returns -- server-rendered, so a page and a still
 * of the same record carry the same bytes -- plus its data table when the record names one. <LeverFigure> adds the
 * lever's interaction: real range inputs, labelled, with Back to plan; the SVG redraws from the levers' values.
 */
import { useMemo, useState } from "react";
import { dataTable, render, type RenderOptions } from "./index.js";
import type { Figure as FigureRecord } from "./generated/figure.js";
import type { Theme } from "./theme.js";
import type { Lever, LeverData } from "./figures.js";

export interface FigureProps extends RenderOptions {
  figure: FigureRecord;
  data?: unknown;
  theme: Theme;
  className?: string;
}

export function Figure({ figure, data, theme, className, ...opts }: FigureProps) {
  const svg = useMemo(() => render(figure, data, theme, opts), [figure, data, theme, opts.width, opts.number]);
  const table = useMemo(() => dataTable(figure, data), [figure, data]);
  return (
    <figure className={className ?? "lt-figure"} style={{ margin: 0 }}>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      {table ? <div className="lt-figure-data" dangerouslySetInnerHTML={{ __html: table }} /> : null}
    </figure>
  );
}

export interface LeverFigureProps extends FigureProps {
  onChange?: (levers: Lever[]) => void;
}

export function LeverFigure({ figure, data, theme, onChange, ...rest }: LeverFigureProps) {
  const start = ((data ?? (figure.diagram as { data?: unknown }).data) as LeverData) ?? { levers: [] };
  const [levers, setLevers] = useState<Lever[]>(start.levers);
  const set = (next: Lever[]) => {
    setLevers(next);
    onChange?.(next);
  };
  const current: LeverData = { ...start, levers };
  return (
    <div className="lt-lever">
      <Figure figure={figure} data={current} theme={theme} {...rest} />
      <fieldset style={{ border: 0, padding: 0, margin: "12px 0 0", display: "grid", gap: 10 }}>
        <legend style={{ fontWeight: 600 }}>Levers</legend>
        {levers.map((l, i) => (
          <label key={l.id} style={{ display: "grid", gap: 2 }}>
            <span>
              {l.label}: {l.value}
            </span>
            <input
              type="range"
              min={l.min}
              max={l.max}
              step={(l.max - l.min) / 100}
              value={l.value}
              style={{ accentColor: theme.accent.fill, minHeight: 44 }}
              onChange={(e) => set(levers.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)))}
            />
          </label>
        ))}
        <button type="button" style={{ minHeight: 44, justifySelf: "start" }} onClick={() => set(levers.map((l) => ({ ...l, value: l.plan })))}>
          Back to plan
        </button>
      </fieldset>
    </div>
  );
}
