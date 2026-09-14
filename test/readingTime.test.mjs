import { test } from "node:test";
import assert from "node:assert/strict";
import { readingTimeMinutes } from "../src/lib/readingTime.ts";

test("rounds to the nearest minute at 200 words/minute", () => {
  const words400 = new Array(400).fill("word").join(" ");
  assert.equal(readingTimeMinutes(words400), 2);
});

test("never rounds down to zero for any non-empty body", () => {
  assert.equal(readingTimeMinutes("one two three"), 1);
});

test("empty body is zero minutes, not a crash", () => {
  assert.equal(readingTimeMinutes(""), 0);
  assert.equal(readingTimeMinutes("   "), 0);
});

test("collapses multiple whitespace/newlines the same as single spaces", () => {
  const words200 = new Array(200).fill("word").join("\n\n  ");
  assert.equal(readingTimeMinutes(words200), 1);
});
