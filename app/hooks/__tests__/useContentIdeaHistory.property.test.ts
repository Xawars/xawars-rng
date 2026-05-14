import fc from 'fast-check';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContentIdeaHistory } from '../useContentIdeaHistory';
import { ContentIdea } from '../../lib/openai';

/**
 * Generator for valid ContentIdea objects with arbitrary string content.
 */
const contentIdeaArb: fc.Arbitrary<ContentIdea> = fc.record({
  contentIdea: fc.string({ minLength: 1, maxLength: 200 }),
  titleVariations: fc.tuple(
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 })
  ),
  storyHook: fc.string({ minLength: 1, maxLength: 200 }),
  missionDirective: fc.string({ minLength: 1, maxLength: 200 }),
  thumbnailPrompts: fc.tuple(
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 })
  ),
}) as fc.Arbitrary<ContentIdea>;

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Feature: content-idea-history, Property 1: Add entry prepends with valid metadata', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * **Validates: Requirements 1.1, 1.4**
   *
   * For any valid ContentIdea, adding it to the history should result in the new entry
   * appearing at index 0 of the history array, with an `id` matching UUID v4 format,
   * a `savedAt` field that is a valid ISO 8601 UTC string, and all original ContentIdea
   * fields intact.
   */
  it('new entry appears at index 0 with valid UUID v4 and valid ISO 8601 timestamp', () => {
    fc.assert(
      fc.property(contentIdeaArb, (idea) => {
        // Clear localStorage for each iteration
        localStorage.clear();

        const { result, unmount } = renderHook(() => useContentIdeaHistory());

        act(() => {
          result.current.addEntry(idea);
        });

        const entries = result.current.entries;

        // Entry should be at index 0
        expect(entries.length).toBe(1);
        const entry = entries[0];

        // Verify UUID v4 format
        expect(entry.id).toMatch(UUID_V4_REGEX);

        // Verify valid ISO 8601 timestamp
        const parsedDate = new Date(entry.savedAt);
        expect(parsedDate.toISOString()).toBe(entry.savedAt);
        expect(Number.isNaN(parsedDate.getTime())).toBe(false);

        // Verify all original ContentIdea fields are intact
        expect(entry.contentIdea).toBe(idea.contentIdea);
        expect(entry.titleVariations).toEqual(idea.titleVariations);
        expect(entry.storyHook).toBe(idea.storyHook);
        expect(entry.missionDirective).toBe(idea.missionDirective);
        expect(entry.thumbnailPrompts).toEqual(idea.thumbnailPrompts);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('new entry is always prepended (appears at index 0) when history already has entries', () => {
    fc.assert(
      fc.property(
        fc.array(contentIdeaArb, { minLength: 1, maxLength: 5 }),
        contentIdeaArb,
        (existingIdeas, newIdea) => {
          // Clear localStorage for each iteration
          localStorage.clear();

          const { result, unmount } = renderHook(() => useContentIdeaHistory());

          // Add existing ideas first
          act(() => {
            for (const idea of existingIdeas) {
              result.current.addEntry(idea);
            }
          });

          const previousLength = result.current.entries.length;

          // Add the new idea
          act(() => {
            result.current.addEntry(newIdea);
          });

          const entries = result.current.entries;

          // New entry should be at index 0
          expect(entries[0].contentIdea).toBe(newIdea.contentIdea);
          expect(entries[0].titleVariations).toEqual(newIdea.titleVariations);
          expect(entries[0].storyHook).toBe(newIdea.storyHook);
          expect(entries[0].missionDirective).toBe(newIdea.missionDirective);
          expect(entries[0].thumbnailPrompts).toEqual(newIdea.thumbnailPrompts);

          // ID should be valid UUID v4
          expect(entries[0].id).toMatch(UUID_V4_REGEX);

          // Timestamp should be valid ISO 8601
          const parsedDate = new Date(entries[0].savedAt);
          expect(parsedDate.toISOString()).toBe(entries[0].savedAt);

          // Length should have increased by 1
          expect(entries.length).toBe(previousLength + 1);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 7: Eviction removes oldest when at capacity
 *
 * For any history containing exactly 50 entries and any new valid ContentIdea,
 * after adding the new entry, the history should still contain exactly 50 entries,
 * the new entry should be at index 0, and the entry that was previously at index 49
 * (the oldest) should no longer be present.
 *
 * **Validates: Requirements 4.2**
 */
describe('Feature: content-idea-history, Property 7: Eviction removes oldest when at capacity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('after adding to a full (50-entry) history, new entry is at index 0, previous index 49 entry is gone, length is still 50', () => {
    fc.assert(
      fc.property(contentIdeaArb, (newIdea) => {
        // Clear localStorage for each iteration
        localStorage.clear();

        const { result, unmount } = renderHook(() => useContentIdeaHistory());

        // Add exactly 50 entries to fill the history
        act(() => {
          for (let i = 0; i < 50; i++) {
            result.current.addEntry({
              contentIdea: `Idea ${i}`,
              titleVariations: [`Title A ${i}`, `Title B ${i}`, `Title C ${i}`],
              storyHook: `Hook ${i}`,
              missionDirective: `Directive ${i}`,
              thumbnailPrompts: [`Prompt 1 ${i}`, `Prompt 2 ${i}`, `Prompt 3 ${i}`],
            });
          }
        });

        // Verify history is full
        expect(result.current.entries.length).toBe(50);

        // Record the entry at index 49 (the oldest)
        const oldestEntry = result.current.entries[49];
        const oldestId = oldestEntry.id;

        // Add one more entry with random content
        act(() => {
          result.current.addEntry(newIdea);
        });

        // Verify: length is still 50
        expect(result.current.entries.length).toBe(50);

        // Verify: new entry is at index 0 with the correct content
        expect(result.current.entries[0].contentIdea).toBe(newIdea.contentIdea);
        expect(result.current.entries[0].storyHook).toBe(newIdea.storyHook);
        expect(result.current.entries[0].missionDirective).toBe(newIdea.missionDirective);

        // Verify: the previously-at-index-49 entry is gone
        const remainingIds = result.current.entries.map((e) => e.id);
        expect(remainingIds).not.toContain(oldestId);

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
