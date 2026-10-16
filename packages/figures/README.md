# @luhtech/figures

The holdings' figure kit: one grammar core that draws a figure record the same on every surface — the dashboard, an investor room, a site page, a deck, an outlet card.

```js
import { render, buildTheme } from "@luhtech/figures";

const theme = buildTheme(brandIdentity, marketFamilies, marketCells); // the host brand's canonical instance
const svg = render(figureRecord, data, theme, { number: 2 });         // deterministic SVG string
```

- **Records** are schema-registry `content/figure` instances (named by `figureId`); pages and decks reference them by `figureRef`.
- **The grammar is fixed**: FIG mark, a title that states the finding, the figure, caption, source line and the stamp its register requires; the plan in the plan ghost under the draft; one accent for what moved or is selected; change as amount and percent; every mark a fill with its line as the edge; markets in register order, coloured by family.
- **The brand gives the colour and type**: `buildTheme` reads `color.chart` and `typography.figure` from the brand's schema-registry instance, and the market families register.
- **Deterministic**: no DOM, no clock, no randomness — the same inputs give the same bytes in Node, a browser and an Astro build.
- **Accessible as drawn**: `role="img"` with the record's title and long description; `dataTable()` emits the table the record names.

Drawn in 0.1: `ring-comparison`, `ring-section`, `ring-series`, `record-readings`, `lever`. Every other type renders its frame with a "not drawn yet" body.

Adapters: `@luhtech/figures/react` (`<Figure>`, `<LeverFigure>`) and `@luhtech/figures/astro` (`Figure.astro`).

The package holds code only — no records, data or brand values. Types in `src/generated/` are generated from schema-registry (`npm run gen:types` with `SR_ROOT` at the pinned tag).
