# @luhtech/site-visuals

Canonical visual components for LuhTech venture marketing sites -- responsive hero images, numbered diagram figures, and article bylines. Composes with `@luhtech/site-template` (peer dependency); does not fork or replace any of its components.

## Components

- **`Hero.astro`** -- a real, responsive hero image (AVIF/WebP/JPEG at 768/1280/1920 via `astro:assets`' `<Picture>`), with the same eyebrow/heading/subheading/CTA treatment every other section already uses (via `@luhtech/site-template`'s `SectionHeading`/`CtaLink`). A standalone, directly-composed component -- like `SplashHero` in site-template, it is not wired into `Section.astro`'s `sectionKind` dispatch table. A page reaches for it when its hero section has a real `heroImage`.
- **`DiagramFigure.astro`** -- wraps site-template's own `Diagram.astro` with an optional `number` prop, prefixing the caption with "Figure N." Deliberately not named `Figure` -- site-template's `Figure.astro` already renders a different schema entity (`section.figures[]`, a cited-stat callout), not `section.diagrams[]`.
- **`Byline.astro`** -- author / date / reading time / series / market-cell label for an article. Prop-driven, not schema-reading (`article.schema.json` has no author/series/publishedAt fields yet -- that's separate, not-yet-landed scope). Reading time is always computed at render from real body text via `readingTimeMinutes()`, never accepted as a stored value.

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
