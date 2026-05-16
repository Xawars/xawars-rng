import { describe, it, expect } from 'vitest';
import {
  addContentIdea,
  deleteContentIdea,
  enforceContentIdeaCapacity,
  serializeContentIdea,
  deserializeContentIdea,
  MAX_CONTENT_IDEAS,
  type SavedContentIdea,
  type ContentIdeaDbRecord,
} from '../content-ideas';

/**
 * Helper to create a SavedContentIdea with a given id and savedAt timestamp.
 */
function makeIdea(id: string, savedAt: string): SavedContentIdea {
  return {
    id,
    contentIdea: `Idea ${id}`,
    storyHook: `Hook for ${id}`,
    missionDirective: `Mission for ${id}`,
    titleVariations: [`Title A ${id}`, `Title B ${id}`, `Title C ${id}`],
    thumbnailPrompts: [`Thumb A ${id}`, `Thumb B ${id}`, `Thumb C ${id}`],
    savedAt,
  };
}

describe('content-ideas', () => {
  describe('MAX_CONTENT_IDEAS', () => {
    it('should be 50', () => {
      expect(MAX_CONTENT_IDEAS).toBe(50);
    });
  });

  describe('addContentIdea', () => {
    it('adds an idea to an empty array', () => {
      const idea = makeIdea('1', '2024-01-01T00:00:00.000Z');
      const result = addContentIdea([], idea);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(idea);
    });

    it('prepends the new idea to the front', () => {
      const existing = makeIdea('old', '2024-01-01T00:00:00.000Z');
      const newIdea = makeIdea('new', '2024-01-02T00:00:00.000Z');
      const result = addContentIdea([existing], newIdea);
      expect(result[0].id).toBe('new');
      expect(result[1].id).toBe('old');
    });

    it('enforces capacity when at the limit', () => {
      // Create 50 ideas (at capacity) with incrementing timestamps
      const ideas: SavedContentIdea[] = [];
      for (let i = 0; i < 50; i++) {
        const date = new Date(2024, 0, 1, 0, 0, i); // Jan 1 2024, seconds incrementing
        ideas.push(makeIdea(`id-${i}`, date.toISOString()));
      }

      const newIdea = makeIdea('new-idea', '2024-03-01T00:00:00.000Z');
      const result = addContentIdea(ideas, newIdea);

      expect(result).toHaveLength(50);
      // The newest idea should be present
      expect(result.find((i) => i.id === 'new-idea')).toBeDefined();
      // The oldest idea (id-0, second 0) should be evicted
      expect(result.find((i) => i.id === 'id-0')).toBeUndefined();
    });

    it('removes the oldest idea by savedAt when over capacity', () => {
      // Create ideas with known timestamps, oldest first
      const ideas: SavedContentIdea[] = [];
      for (let i = 0; i < 50; i++) {
        ideas.push(makeIdea(`id-${i}`, new Date(2024, 0, i + 1).toISOString()));
      }

      const newIdea = makeIdea('newest', new Date(2024, 5, 1).toISOString());
      const result = addContentIdea(ideas, newIdea);

      // Should still be 50
      expect(result).toHaveLength(50);
      // Newest should be first (sorted by savedAt desc)
      expect(result[0].id).toBe('newest');
      // Oldest (id-0) should be gone
      expect(result.find((i) => i.id === 'id-0')).toBeUndefined();
    });
  });

  describe('deleteContentIdea', () => {
    it('removes an idea by id', () => {
      const ideas = [
        makeIdea('a', '2024-01-01T00:00:00.000Z'),
        makeIdea('b', '2024-01-02T00:00:00.000Z'),
        makeIdea('c', '2024-01-03T00:00:00.000Z'),
      ];
      const result = deleteContentIdea(ideas, 'b');
      expect(result).toHaveLength(2);
      expect(result.find((i) => i.id === 'b')).toBeUndefined();
    });

    it('returns the same array if id not found', () => {
      const ideas = [makeIdea('a', '2024-01-01T00:00:00.000Z')];
      const result = deleteContentIdea(ideas, 'nonexistent');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
    });

    it('returns empty array when deleting from empty', () => {
      const result = deleteContentIdea([], 'any');
      expect(result).toHaveLength(0);
    });
  });

  describe('enforceContentIdeaCapacity', () => {
    it('returns the same array when under capacity', () => {
      const ideas = [
        makeIdea('a', '2024-01-01T00:00:00.000Z'),
        makeIdea('b', '2024-01-02T00:00:00.000Z'),
      ];
      const result = enforceContentIdeaCapacity(ideas);
      expect(result).toEqual(ideas);
    });

    it('returns the same array when exactly at capacity', () => {
      const ideas: SavedContentIdea[] = [];
      for (let i = 0; i < 50; i++) {
        ideas.push(makeIdea(`id-${i}`, new Date(2024, 0, i + 1).toISOString()));
      }
      const result = enforceContentIdeaCapacity(ideas);
      expect(result).toHaveLength(50);
    });

    it('trims to capacity keeping newest when over', () => {
      const ideas: SavedContentIdea[] = [];
      for (let i = 0; i < 55; i++) {
        ideas.push(makeIdea(`id-${i}`, new Date(2024, 0, i + 1).toISOString()));
      }
      const result = enforceContentIdeaCapacity(ideas);
      expect(result).toHaveLength(50);
      // The 5 oldest should be gone (id-0 through id-4)
      for (let i = 0; i < 5; i++) {
        expect(result.find((idea) => idea.id === `id-${i}`)).toBeUndefined();
      }
      // The newest should still be present
      expect(result.find((idea) => idea.id === 'id-54')).toBeDefined();
    });

    it('respects custom maxSize parameter', () => {
      const ideas = [
        makeIdea('a', '2024-01-03T00:00:00.000Z'),
        makeIdea('b', '2024-01-02T00:00:00.000Z'),
        makeIdea('c', '2024-01-01T00:00:00.000Z'),
      ];
      const result = enforceContentIdeaCapacity(ideas, 2);
      expect(result).toHaveLength(2);
      // Oldest (c) should be evicted
      expect(result.find((i) => i.id === 'c')).toBeUndefined();
      expect(result.find((i) => i.id === 'a')).toBeDefined();
      expect(result.find((i) => i.id === 'b')).toBeDefined();
    });
  });

  describe('serializeContentIdea', () => {
    it('converts camelCase to snake_case DB format', () => {
      const idea: SavedContentIdea = {
        id: 'test-id',
        contentIdea: 'My great idea',
        storyHook: 'An epic hook',
        missionDirective: 'Do the thing',
        titleVariations: ['Title 1', 'Title 2', 'Title 3'],
        thumbnailPrompts: ['Thumb 1', 'Thumb 2', 'Thumb 3'],
        savedAt: '2024-06-15T12:00:00.000Z',
      };

      const result = serializeContentIdea(idea);

      expect(result).toEqual({
        id: 'test-id',
        content_idea: 'My great idea',
        story_hook: 'An epic hook',
        mission_directive: 'Do the thing',
        title_variations: ['Title 1', 'Title 2', 'Title 3'],
        thumbnail_prompts: ['Thumb 1', 'Thumb 2', 'Thumb 3'],
        saved_at: '2024-06-15T12:00:00.000Z',
      });
    });
  });

  describe('deserializeContentIdea', () => {
    it('converts snake_case DB format to camelCase', () => {
      const dbRecord: ContentIdeaDbRecord = {
        id: 'db-id',
        content_idea: 'DB idea',
        story_hook: 'DB hook',
        mission_directive: 'DB mission',
        title_variations: ['T1', 'T2', 'T3'],
        thumbnail_prompts: ['P1', 'P2', 'P3'],
        saved_at: '2024-06-15T12:00:00.000Z',
      };

      const result = deserializeContentIdea(dbRecord);

      expect(result).toEqual({
        id: 'db-id',
        contentIdea: 'DB idea',
        storyHook: 'DB hook',
        missionDirective: 'DB mission',
        titleVariations: ['T1', 'T2', 'T3'],
        thumbnailPrompts: ['P1', 'P2', 'P3'],
        savedAt: '2024-06-15T12:00:00.000Z',
      });
    });
  });

  describe('serialization round-trip', () => {
    it('serialize then deserialize produces equivalent idea', () => {
      const original: SavedContentIdea = {
        id: 'round-trip-id',
        contentIdea: 'Round trip idea',
        storyHook: 'Round trip hook',
        missionDirective: 'Round trip mission',
        titleVariations: ['Var 1', 'Var 2', 'Var 3'],
        thumbnailPrompts: ['Prompt 1', 'Prompt 2', 'Prompt 3'],
        savedAt: '2024-03-20T08:30:00.000Z',
      };

      const serialized = serializeContentIdea(original);
      const deserialized = deserializeContentIdea(serialized);

      expect(deserialized).toEqual(original);
    });
  });
});
