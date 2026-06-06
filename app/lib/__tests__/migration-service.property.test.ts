import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { serializeContentIdea, deserializeContentIdea, type SavedContentIdea } from '../content-ideas';

/**
 * Feature: auth-persistence-gamification, Property 2: Migration Data Transformation Round-Trip
 *
 * For any valid content idea payload, transforming it to the cloud database format and back
 * SHALL produce an equivalent data set.
 *
 * **Validates: Requirements 5.1, 5.2**
 */

const savedContentIdeaArb: fc.Arbitrary<SavedContentIdea> = fc.record({
  id: fc.uuid(),
  contentIdea: fc.string({ minLength: 1 }),
  storyHook: fc.string({ minLength: 1 }),
  missionDirective: fc.string({ minLength: 1 }),
  titleVariations: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
  thumbnailPrompts: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
  savedAt: fc.date().map((d) => d.toISOString()),
});

describe('Property 2: Migration Data Transformation Round-Trip', () => {
  it('content ideas: deserialize(serialize(idea)) produces equivalent data', () => {
    fc.assert(
      fc.property(savedContentIdeaArb, (idea) => {
        // Transform to cloud format (serialize)
        const cloudRecord = serializeContentIdea(idea);

        // Transform back to app format (deserialize)
        const restored = deserializeContentIdea(cloudRecord);

        // Verify equivalence
        expect(restored).toEqual(idea);
      }),
      { numRuns: 100 }
    );
  });
});
