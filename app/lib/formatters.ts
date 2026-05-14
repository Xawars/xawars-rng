/**
 * Formatting utilities for the AI Content Generator copy-all functionality.
 */

/**
 * Formats title variations as a newline-separated numbered list.
 * Example: ["A", "B", "C"] → "1. A\n2. B\n3. C"
 */
export function formatTitleVariations(titles: [string, string, string]): string {
  return titles.map((title, index) => `${index + 1}. ${title}`).join('\n');
}

/**
 * Formats thumbnail prompts as a newline-separated bullet list.
 * Example: ["A", "B", "C"] → "• A\n• B\n• C"
 */
export function formatThumbnailPrompts(prompts: [string, string, string]): string {
  return prompts.map((prompt) => `• ${prompt}`).join('\n');
}
