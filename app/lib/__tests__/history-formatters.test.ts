import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeTime } from '../history-formatters';

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns relative time for timestamps less than 7 days old', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));

    // 30 seconds ago
    expect(formatRelativeTime('2025-01-15T11:59:30.000Z')).toBe('30 seconds ago');

    // 1 second ago
    expect(formatRelativeTime('2025-01-15T11:59:59.000Z')).toBe('1 second ago');

    // 5 minutes ago
    expect(formatRelativeTime('2025-01-15T11:55:00.000Z')).toBe('5 minutes ago');

    // 1 minute ago
    expect(formatRelativeTime('2025-01-15T11:59:00.000Z')).toBe('1 minute ago');

    // 2 hours ago
    expect(formatRelativeTime('2025-01-15T10:00:00.000Z')).toBe('2 hours ago');

    // 1 hour ago
    expect(formatRelativeTime('2025-01-15T11:00:00.000Z')).toBe('1 hour ago');

    // 3 days ago
    expect(formatRelativeTime('2025-01-12T12:00:00.000Z')).toBe('3 days ago');

    // 1 day ago
    expect(formatRelativeTime('2025-01-14T12:00:00.000Z')).toBe('1 day ago');

    // 6 days ago (still relative)
    expect(formatRelativeTime('2025-01-09T12:00:00.000Z')).toBe('6 days ago');
  });

  it('returns absolute date for timestamps 7 days or older', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));

    // Exactly 7 days ago
    expect(formatRelativeTime('2025-01-08T12:00:00.000Z')).toBe('Jan 8, 2025');

    // 30 days ago
    expect(formatRelativeTime('2024-12-16T12:00:00.000Z')).toBe('Dec 16, 2024');

    // Much older
    expect(formatRelativeTime('2023-06-01T00:00:00.000Z')).toBe('Jun 1, 2023');
  });

  it('returns absolute date for future timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));

    // Future timestamp
    expect(formatRelativeTime('2025-01-20T12:00:00.000Z')).toBe('Jan 20, 2025');
  });
});
