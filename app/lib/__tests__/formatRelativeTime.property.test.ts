import fc from 'fast-check';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeTime } from '../history-formatters';

describe('Feature: content-idea-history, Property 3: Timestamp formatting rules', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns relative format for timestamps less than 7 days old', () => {
    /**
     * Validates: Requirements 2.3
     *
     * Property 3: For any ISO 8601 timestamp less than 7 days before the current time,
     * formatRelativeTime should return a relative time string matching patterns like
     * "X seconds ago", "X minutes ago", "X hours ago", or "X days ago".
     */
    const now = new Date('2025-06-15T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const maxOffsetMs = 7 * 24 * 60 * 60 * 1000 - 1; // 6 days, 23:59:59.999

    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: maxOffsetMs }),
        (offsetMs) => {
          const timestamp = new Date(now.getTime() - offsetMs).toISOString();
          const result = formatRelativeTime(timestamp);

          const relativePattern = /^\d+ (second|seconds|minute|minutes|hour|hours|day|days) ago$/;
          expect(result).toMatch(relativePattern);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns absolute date format for timestamps 7 or more days old', () => {
    /**
     * Validates: Requirements 2.3
     *
     * Property 3: For any ISO 8601 timestamp 7 days or older before the current time,
     * formatRelativeTime should return an absolute date string matching the pattern
     * "Mon D, YYYY" (e.g., "Jan 15, 2025").
     */
    const now = new Date('2025-06-15T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    // Generate offsets from 7 days to ~2 years in the past
    const maxOffsetMs = 730 * 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(
        fc.integer({ min: sevenDaysMs, max: maxOffsetMs }),
        (offsetMs) => {
          const timestamp = new Date(now.getTime() - offsetMs).toISOString();
          const result = formatRelativeTime(timestamp);

          const absolutePattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}$/;
          expect(result).toMatch(absolutePattern);
        }
      ),
      { numRuns: 100 }
    );
  });
});
