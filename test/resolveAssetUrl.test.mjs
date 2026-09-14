import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAssetUrl } from "../src/lib/resolveAssetUrl.ts";

test("resolves a real, already-live asset exactly (ectropy-home-hero.png)", () => {
  // Confirmed live this session: this exact URL 200s and is the object
  // already referenced in Ectropy-Business's own marketing-site source.
  assert.equal(
    resolveAssetUrl("ectropy-home-hero", "image", "png"),
    "https://ectropy-production-asset-bank.sfo3.cdn.digitaloceanspaces.com/image/ectropy-home-hero.png"
  );
});

test("resolves every real bankType to its own directory", () => {
  assert.equal(resolveAssetUrl("some-mark", "logo", "svg"), "https://ectropy-production-asset-bank.sfo3.cdn.digitaloceanspaces.com/logo/some-mark.svg");
  assert.equal(resolveAssetUrl("some-icon", "icon", "svg"), "https://ectropy-production-asset-bank.sfo3.cdn.digitaloceanspaces.com/icon/some-icon.svg");
  assert.equal(resolveAssetUrl("some-diagram", "diagram", "png"), "https://ectropy-production-asset-bank.sfo3.cdn.digitaloceanspaces.com/diagram/some-diagram.png");
});

test("rejects an assetId that does not match asset-bank.schema.json's real pattern", () => {
  assert.throws(() => resolveAssetUrl("Ectropy-Home-Hero", "image", "png"), /does not match/);
  assert.throws(() => resolveAssetUrl("1-leading-digit", "image", "png"), /does not match/);
  assert.throws(() => resolveAssetUrl("has_underscore", "image", "png"), /does not match/);
});
