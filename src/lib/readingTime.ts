/**
 * Reading time is derived at render from real body text, never stored on
 * the content instance -- matches the GTM launch-surface dispatch's own
 * rule for Byline (Phase 4, item 2: "reading time derived at render, never
 * stored"). 200 words/minute is the commonly-cited average adult silent
 * reading speed for prose (the figure most reading-time estimators, e.g.
 * Medium's, converge on) -- not independently benchmarked here, named so a
 * future revision has a real number to argue with instead of a bare magic
 * constant.
 */

const WORDS_PER_MINUTE = 200;

export function readingTimeMinutes(bodyText: string): number {
  const words = bodyText.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
