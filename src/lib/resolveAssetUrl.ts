/**
 * Resolves an asset-bank assetId to its real, public CDN URL. Deliberately
 * has no runtime dependency on the asset-bank registration API or any
 * credential: the bucket (ectropy-production-asset-bank) is public-read and
 * CDN-fronted, and every real asset already in it follows this exact key
 * convention -- confirmed live this session against 15 real objects and the
 * identical hardcoded pattern already used in
 * Ectropy-Business/apps/marketing-site/src/layouts/Layout.astro and
 * src/pages/index.astro. This function makes that convention a single named
 * place instead of a repeated string literal.
 *
 * The bucket name is portfolio-wide despite its "ectropy-production-*" name
 * -- it holds hero images for every venture (hilja, jobsitecontrol, ohjaus,
 * qullqa, raizal, replique, siltana, viiva, ectropy), co-located here per L4
 * direction rather than a dedicated per-venture bucket.
 */

const ASSET_BANK_CDN_HOST = "ectropy-production-asset-bank.sfo3.cdn.digitaloceanspaces.com";

const ASSET_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

export type BankType = "logo" | "image" | "icon" | "diagram";

const BANK_TYPE_DIR: Record<BankType, string> = {
  logo: "logo",
  image: "image",
  icon: "icon",
  diagram: "diagram",
};

/**
 * Matches asset-bank.schema.json's real mimeType enum
 * (image/svg+xml, image/png, image/jpeg, image/webp, image/avif) and its
 * MIME_TO_EXT mapping in Ectropy-Business/scripts/ingest-asset-bank.py.
 */
export type AssetExt = "svg" | "png" | "jpg" | "webp" | "avif";

export function resolveAssetUrl(assetId: string, bankType: BankType, ext: AssetExt): string {
  if (!ASSET_ID_PATTERN.test(assetId)) {
    throw new Error(
      `resolveAssetUrl: assetId ${JSON.stringify(assetId)} does not match asset-bank.schema.json's real assetId pattern ${ASSET_ID_PATTERN.source}`
    );
  }
  const dir = BANK_TYPE_DIR[bankType];
  return `https://${ASSET_BANK_CDN_HOST}/${dir}/${assetId}.${ext}`;
}
