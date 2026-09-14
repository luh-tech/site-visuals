import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPublishedDate } from "../src/lib/formatPublishedDate.ts";

test("formats a bare date without a local-timezone day shift (regression: found live as 'September 13' for 2026-09-14)", () => {
  assert.equal(formatPublishedDate("2026-09-14"), "September 14, 2026");
});

test("holds at both ends of the calendar year", () => {
  assert.equal(formatPublishedDate("2026-01-01"), "January 1, 2026");
  assert.equal(formatPublishedDate("2026-12-31"), "December 31, 2026");
});
