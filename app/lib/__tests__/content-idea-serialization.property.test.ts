import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  serializeContentIdea,
  deserializeContentIdea,
  type SavedContentIdea,
} from '../content-ideas';

/**
 * Feature: auth-persistence-gamification, Property 6: Content Idea Serialization Round-Trip
 *
 * For any valid content idea (with title variations, story hook, mission directive,
 * and thumbnail prompts), serializing to the database format and deserializing back
 * SHALL produce an equivalent content idea.
 *
 * **Validates: Requirements 9.1**
 */
describe('Property 6: Content Idea Serialization Round-Trip', () => {
  const savedContentIdeaArb: fc.Arbitrary<SavedContentIdea> = fc.record({
    id: fc.uuid(),
    contentIdea: fc.string({ minLength: 1 }),
    storyHook: fc.string({ minLength: 1 }),
    missionDirective: fc.string({ minLength: 1 }),
    titleVariations: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
    thumbnailPrompts: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
    savedAt: fc.date().map((d) => d.toISOString()),
  });

  it('deserialize(serialize(idea)) deep equals idea', () => {
    fc.assert(
      fc.property(savedContentIdeaArb, (idea) => {
        const serialized = serializeContentIdea(idea);
        const deserialized = deserializeContentIdea(serialized);
        expect(deserialized).toEqual(idea);
      }),
      { numRuns: 100 }
    );
  });
});
