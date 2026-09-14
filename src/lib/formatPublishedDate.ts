/**
 * Formats a bare calendar date (no time-of-day meaning) for display.
 * Always formats in UTC, never the runtime's local timezone -- a bare
 * date string has no timezone of its own, and `new Date(dateString)`
 * parses it as UTC midnight, so letting toLocaleDateString format in the
 * local timezone silently shifts the displayed day backward for any
 * timezone behind UTC. Found live this session: "2026-09-14" rendered as
 * "September 13, 2026" on a build machine in UTC-7.
 */
export function formatPublishedDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
