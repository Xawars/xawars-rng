/**
 * Content Ideas Persistence Module
 *
 * Pure utility functions for managing content idea history with capacity limits
 * and serialization/deserialization for Supabase persistence.
 *
 * This module is designed to be integrated into DataContext for cloud persistence.
 */

/**
 * Maximum number of content ideas stored per user.
 * When capacity is reached, the oldest entry (by savedAt) is evicted.
 */
export const MAX_CONTENT_IDEAS = 50;

/**
 * A content idea saved to history with a unique identifier and timestamp.
 */
export interface SavedContentIdea {
  id: string;
  contentIdea: string;
  storyHook: string;
  missionDirective: string;
  titleVariations: string[];
  thumbnailPrompts: string[];
  savedAt: string;
}

/**
 * The database record format for content ideas (snake_case, JSONB arrays).
 * Maps to the `public.content_ideas` Supabase table.
 */
export interface ContentIdeaDbRecord {
  id: string;
  content_idea: string;
  story_hook: string;
  mission_directive: string;
  title_variations: string[];
  thumbnail_prompts: string[];
  saved_at: string;
}

/**
 * Enforces the capacity limit on a content ideas array.
 * If the array exceeds maxSize, removes the oldest entries (by savedAt timestamp)
 * until the array is within capacity.
 *
 * @param ideas - The current array of saved content ideas
 * @param maxSize - The maximum allowed size (defaults to MAX_CONTENT_IDEAS)
 * @returns A new array trimmed to capacity, keeping the most recent ideas
 */
export function enforceContentIdeaCapacity(
  ideas: SavedContentIdea[],
  maxSize: number = MAX_CONTENT_IDEAS
): SavedContentIdea[] {
  if (ideas.length <= maxSize) {
    return ideas;
  }

  // Sort by savedAt descending (newest first) and keep only maxSize entries
  const sorted = [...ideas].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  return sorted.slice(0, maxSize);
}

/**
 * Adds a content idea to the history, enforcing the 50-idea capacity limit.
 * When the history is at capacity (>= MAX_CONTENT_IDEAS), the oldest idea
 * (by savedAt timestamp) is removed before adding the new one.
 *
 * @param ideas - The current array of saved content ideas
 * @param idea - The new content idea to add
 * @returns A new array with the idea added and capacity enforced
 */
export function addContentIdea(
  ideas: SavedContentIdea[],
  idea: SavedContentIdea
): SavedContentIdea[] {
  const updated = [idea, ...ideas];
  return enforceContentIdeaCapacity(updated);
}

/**
 * Removes a content idea from the history by its ID.
 *
 * @param ideas - The current array of saved content ideas
 * @param id - The ID of the idea to remove
 * @returns A new array with the specified idea removed
 */
export function deleteContentIdea(
  ideas: SavedContentIdea[],
  id: string
): SavedContentIdea[] {
  return ideas.filter((idea) => idea.id !== id);
}

/**
 * Serializes a SavedContentIdea to the database record format.
 * Converts camelCase app format to snake_case DB format.
 * The DB stores title_variations and thumbnail_prompts as JSONB.
 *
 * @param idea - The app-format content idea
 * @returns The database record format
 */
export function serializeContentIdea(idea: SavedContentIdea): ContentIdeaDbRecord {
  return {
    id: idea.id,
    content_idea: idea.contentIdea,
    story_hook: idea.storyHook,
    mission_directive: idea.missionDirective,
    title_variations: idea.titleVariations,
    thumbnail_prompts: idea.thumbnailPrompts,
    saved_at: idea.savedAt,
  };
}

/**
 * Deserializes a database record back to the app-format SavedContentIdea.
 * Converts snake_case DB format to camelCase app format.
 *
 * @param dbRecord - The database record
 * @returns The app-format content idea
 */
export function deserializeContentIdea(dbRecord: ContentIdeaDbRecord): SavedContentIdea {
  return {
    id: dbRecord.id,
    contentIdea: dbRecord.content_idea,
    storyHook: dbRecord.story_hook,
    missionDirective: dbRecord.mission_directive,
    titleVariations: dbRecord.title_variations,
    thumbnailPrompts: dbRecord.thumbnail_prompts,
    savedAt: dbRecord.saved_at,
  };
}
