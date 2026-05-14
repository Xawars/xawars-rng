import fc from 'fast-check';
import { formatTitleVariations, formatThumbnailPrompts } from '../formatters';

describe('Feature: ai-content-generator, Property 5: Title variations "Copy All" formatting', () => {
  it('formats any 3 non-empty strings as a numbered list', () => {
    /**
     * Validates: Requirements 5.6
     *
     * Property 5: For any array of exactly 3 non-empty strings [t1, t2, t3],
     * the title variations copy-all formatter produces the string "1. {t1}\n2. {t2}\n3. {t3}".
     */
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 })
        ),
        ([t1, t2, t3]) => {
          const result = formatTitleVariations([t1, t2, t3]);
          const expected = `1. ${t1}\n2. ${t2}\n3. ${t3}`;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: ai-content-generator, Property 6: Thumbnail prompts "Copy All" formatting', () => {
  it('formats any 3 non-empty strings as a bullet list', () => {
    /**
     * Validates: Requirements 5.8
     *
     * Property 6: For any array of exactly 3 non-empty strings [p1, p2, p3],
     * the thumbnail prompts copy-all formatter produces the string "• {p1}\n• {p2}\n• {p3}".
     */
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 })
        ),
        ([p1, p2, p3]) => {
          const result = formatThumbnailPrompts([p1, p2, p3]);
          const expected = `• ${p1}\n• ${p2}\n• ${p3}`;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
