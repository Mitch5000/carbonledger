/**
 * utils/time.ts
 * Time utility functions for tests
 */

/**
 * Get current Unix timestamp in seconds
 */
export function getUnixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get Unix timestamp for a specific date
 */
export function getTimestampForDate(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Check if a timestamp is within the given freshness window (in seconds)
 */
export function isWithinFreshness(
  timestamp: number,
  freshnessSeconds: number,
): boolean {
  const now = getUnixTimestamp();
  return now - timestamp <= freshnessSeconds;
}
