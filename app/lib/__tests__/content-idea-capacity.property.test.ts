import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  addContentIdea,
  MAX_CONTENT_IDEAS,
  type SavedContentIdea,
} from '../content-ideas';

/**
 * Feature: auth-persistence-gamification, Property 7: Content Idea Capacity Invariant
 *
 * For any sequence of content idea additions, the content idea history length SHALL
 * never exceed 50, and when a new idea is added to a full history, the oldest idea
 * SHALL be removed while the newest is retained.
 *
 * **Validates: Requirements 9.2, 9.3**
 */
describe('Property 7: Content Idea Capacity Invariant', () => {
  // Use integer timestamps to avoid invalid date issues with fc.date()
  const minTimestamp = new Date('2020-01-01T00:00:00.000Z').getTime();
  const maxTimestamp = new Date('2030-01-01T00:00:00.000Z').getTime();

  const savedContentIdeaArb: fc.Arbitrary<SavedContentIdea> = fc.record({
    id: fc.uuid(),
    contentIdea: fc.string({ minLength: 1 }),
    storyHook: fc.string({ minLength: 1 }),
    missionDirective: fc.string({ minLength: 1 }),
    titleVariations: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
    thumbnailPrompts: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
    savedAt: fc
      .integer({ min: minTimestamp, max: maxTimestamp })
      .map((ts) => new Date(ts).toISOString()),
  });

  it('history length never exceeds MAX_CONTENT_IDEAS after any sequence of additions', () => {
    fc.assert(
      fc.property(
        fc.array(savedContentIdeaArb, { minLength: 1, maxLength: 80 }),
        (ideas) => {
          let history: SavedContentIdea[] = [];
          for (const idea of ideas) {
            history = addContentIdea(history, idea);
            expect(history.length).toBeLessThanOrEqual(MAX_CONTENT_IDEAS);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the newest idea is always present in the result', () => {
    fc.assert(
      fc.property(
        fc.array(savedContentIdeaArb, { minLength: 0, maxLength: 60 }),
        savedContentIdeaArb,
        (existingIdeas, newIdea) => {
          // Build up a history from existing ideas
          let history: SavedContentIdea[] = [];
          for (const idea of existingIdeas) {
            history = addContentIdea(history, idea);
          }

          // Add the new idea
          const result = addContentIdea(history, newIdea);

          // The newest idea must always be present
          const found = result.find((i) => i.id === newIdea.id);
          expect(found).toBeDefined();
          expect(found).toEqual(newIdea);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when history is at capacity, the oldest idea is evicted on addition', () => {
    fc.assert(
      fc.property(
        // Generate exactly MAX_CONTENT_IDEAS ideas with distinct sequential timestamps
        fc.array(savedContentIdeaArb, {
          minLength: MAX_CONTENT_IDEAS,
          maxLength: MAX_CONTENT_IDEAS,
        }),
        savedContentIdeaArb,
        (fullHistoryIdeas, newIdea) => {
          // Assign sequential timestamps so we know which is oldest
          const baseTime = new Date('2024-01-01T00:00:00.000Z').getTime();
          const fullHistory: SavedContentIdea[] = fullHistoryIdeas.map((idea, index) => ({
            ...idea,
            savedAt: new Date(baseTime + index * 1000).toISOString(),
          }));

          // Give the new idea the newest timestamp
          const newestIdea: SavedContentIdea = {
            ...newIdea,
            savedAt: new Date(baseTime + MAX_CONTENT_IDEAS * 1000).toISOString(),
          };

          // The oldest idea is the one with the earliest savedAt
          const oldestIdea = fullHistory[0];

          // Add the new idea to the full history
          const result = addContentIdea(fullHistory, newestIdea);

          // Capacity must not be exceeded
          expect(result.length).toBeLessThanOrEqual(MAX_CONTENT_IDEAS);

          // The newest idea must be present
          expect(result.find((i) => i.id === newestIdea.id)).toBeDefined();

          // The oldest idea must have been evicted
          expect(result.find((i) => i.id === oldestIdea.id)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
