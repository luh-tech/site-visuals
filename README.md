# @luhtech/site-visuals

Canonical visual components for LuhTech venture marketing sites -- responsive hero images, numbered diagram figures, and article bylines. Composes with `@luhtech/site-template` (peer dependency); does not fork or replace any of its components.

This repo is an npm workspace that publishes two public packages to npmjs.com (Apache-2.0, trusted publishing via GitHub OIDC):

| Package | Path | Current | Release tag |
|---|---|---|---|
| `@luhtech/site-visuals` | repo root (`src/`) | 0.2.0 | `site-visuals-v*` |
| `@luhtech/figures` | `packages/figures/` | 0.1.2 | `figures-v*` |

`@luhtech/figures` is the holdings' figure kit -- deterministic SVG from a schema-registry `content/figure` record, with React and Astro adapters; see [`packages/figures/README.md`](packages/figures/README.md). `@luhtech/site-template` depends on it (0.19.0+) to draw a diagram that names a `figureRef`.

`npm install` then `npm test` runs both packages' tests (the root's `test/*.test.mjs`, then `@luhtech/figures`' build and tests) -- the same two steps `.github/workflows/ci.yml` runs on every PR and push to `main`. `.github/workflows/publish.yml` publishes on a release tag.

## Components

- **`Hero.astro`** -- a real, responsive hero image (AVIF/WebP/JPEG at 768/1280/1920 via `astro:assets`' `<Picture>`), with the same eyebrow/heading/subheading/CTA treatment every other section already uses (via `@luhtech/site-template`'s `SectionHeading`/`CtaLink`). A standalone, directly-composed component -- like `SplashHero` in site-template, it is not wired into `Section.astro`'s `sectionKind` dispatch table. A page reaches for it when its hero section has a real `heroImage`.
- **`DiagramFigure.astro`** -- wraps site-template's own `Diagram.astro` with an optional `number` prop, prefixing the caption with "Figure N." Deliberately not named `Figure` -- site-template's `Figure.astro` already renders a different schema entity (`section.figures[]`, a cited-stat callout), not `section.diagrams[]`.
- **`Byline.astro`** -- author / date / reading time / series / market-cell label for an article. Prop-driven, not schema-reading: the page passes author, date, series and cell as props. schema-registry's `content/article.schema.json` (8.1.0) now carries `author`, `publishedAt`, `series` and `seriesOrdinal`; Byline does not read an article record directly. Reading time is always computed at render from real body text via `readingTimeMinutes()`, never accepted as a stored value.

## Setup in a consuming site

`astro.config.mjs` needs the asset-bank CDN host allowlisted for `astro:assets`' remote-image support:

```js
export default defineConfig({
  image: {
    domains: ["ectropy-production-asset-bank.sfo3.cdn.digitaloceanspaces.com"],
  },
});
```

## Asset resolution

`resolveAssetUrl(assetId, bankType, ext)` resolves an asset-bank `assetId` straight to its public CDN URL -- no runtime API call or credential, since the bucket is public-read and CDN-fronted. Registering a *new* asset (uploading bytes + writing the `asset_bank_records` row) is a separate, credentialed step (`Ectropy-Business/scripts/ingest-asset-bank.py`), out of scope for this package, which only renders assets that already exist.
