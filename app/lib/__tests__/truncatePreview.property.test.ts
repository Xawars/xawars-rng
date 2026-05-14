import fc from 'fast-check';
import { truncatePreview } from '../history-formatters';

describe('Feature: content-idea-history, Property 4: Text truncation', () => {
  /**
   * Validates: Requirements 2.4
   *
   * Property 4: For any string, truncatePreview(text, 100) should return the original
   * string unchanged if its length is ≤ 100 characters, or return the first 100
   * characters followed by "…" if the original string length exceeds 100 characters.
   */

  it('returns the original string unchanged for strings with length ≤ 100', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        (text) => {
          const result = truncatePreview(text, 100);
          expect(result).toBe(text);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns first 100 chars + "…" for strings with length > 100', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 101 }),
        (text) => {
          const result = truncatePreview(text, 100);
          expect(result).toBe(text.slice(0, 100) + '\u2026');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('result length is always ≤ 101 (100 + 1 for ellipsis)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (text) => {
          const result = truncatePreview(text, 100);
          expect(result.length).toBeLessThanOrEqual(101);
        }
      ),
      { numRuns: 100 }
    );
  });
});
