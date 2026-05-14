/**
 * Formatting utilities for the Content Idea History feature.
 */

/**
 * Truncates text to a maximum length, appending an ellipsis if truncated.
 * Returns the original string unchanged if its length is ≤ maxLength.
 * Otherwise returns the first maxLength characters followed by "…".
 */
export function truncatePreview(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '\u2026';
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_DAY = 86400;
const DAYS_THRESHOLD = 7;

/**
 * Formats an ISO 8601 timestamp as a relative time string for recent timestamps,
 * or an absolute date string for older timestamps.
 *
 * - Timestamps less than 7 days old return relative format (e.g., "2 minutes ago", "3 days ago")
 * - Timestamps 7 days or older return absolute format (e.g., "Jan 15, 2025")
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 0 || diffSeconds >= DAYS_THRESHOLD * SECONDS_IN_DAY) {
    // 7+ days old or in the future — use absolute format
    const month = MONTH_NAMES[date.getUTCMonth()];
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    return `${month} ${day}, ${year}`;
  }

  if (diffSeconds < SECONDS_IN_MINUTE) {
    return diffSeconds === 1 ? '1 second ago' : `${diffSeconds} seconds ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / SECONDS_IN_MINUTE);
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffSeconds / SECONDS_IN_HOUR);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffSeconds / SECONDS_IN_DAY);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}
