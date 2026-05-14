import fc from 'fast-check';
import { validateApiKey, parseContentIdea } from '../openai';

/**
 * Property 1: API key validation is correct and complete
 *
 * For any string `s`, `validateApiKey(s)` returns `{ valid: true }` if and only if
 * `s` starts with "sk-" and `s.length >= 20`. Otherwise it returns `{ valid: false, error }`
 * where the error is "Invalid API key format. Must start with sk-" when the prefix is wrong,
 * or "API key too short" when the prefix is correct but length is insufficient.
 *
 * Validates: Requirements 1.4, 1.5, 2.2, 2.3, 2.4
 */
describe('Feature: ai-content-generator, Property 1: API key validation is correct and complete', () => {
  it('returns { valid: true } for any string starting with "sk-" and length >= 20', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 17 }).map((s) => 'sk-' + s),
        (key) => {
          // Only test keys that are actually >= 20 chars
          fc.pre(key.length >= 20);
          const result = validateApiKey(key);
          expect(result).toEqual({ valid: true });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns { valid: false } with prefix error for any string not starting with "sk-"', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.startsWith('sk-')),
        (key) => {
          const result = validateApiKey(key);
          expect(result).toEqual({
            valid: false,
            error: 'Invalid API key format. Must start with sk-',
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns { valid: false } with "API key too short" for strings starting with "sk-" but length < 20', () => {
    fc.assert(
      fc.property(
        // Generate strings of length 0..16 and prepend "sk-" to get total length 3..19
        fc.string({ minLength: 0, maxLength: 16 }).map((s) => 'sk-' + s),
        (key) => {
          fc.pre(key.length < 20);
          const result = validateApiKey(key);
          expect(result).toEqual({
            valid: false,
            error: 'API key too short',
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('valid: true iff starts with "sk-" AND length >= 20 (biconditional)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Bias toward "sk-" prefixed strings
          fc.string().map((s) => 'sk-' + s),
          // Also test arbitrary strings
          fc.string()
        ),
        (key) => {
          const result = validateApiKey(key);
          const shouldBeValid = key.startsWith('sk-') && key.length >= 20;

          if (shouldBeValid) {
            expect(result).toEqual({ valid: true });
          } else {
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 3: Valid ContentIdea JSON parsing preserves all fields
 *
 * For any valid JSON object containing a `contentIdea` string, a `titleVariations` array
 * of exactly 3 strings, a `storyHook` string, a `missionDirective` string, and a
 * `thumbnailPrompts` array of exactly 3 strings, parsing it with the response parser
 * produces a `ContentIdea` object where every field value equals the original input.
 *
 * Validates: Requirements 3.3
 */
describe('Feature: ai-content-generator, Property 3: Valid ContentIdea JSON parsing preserves all fields', () => {
  const validContentIdeaArb = fc.record({
    contentIdea: fc.string({ minLength: 1 }),
    titleVariations: fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), fc.string({ minLength: 1 })),
    storyHook: fc.string({ minLength: 1 }),
    missionDirective: fc.string({ minLength: 1 }),
    thumbnailPrompts: fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), fc.string({ minLength: 1 })),
  });

  it('round-trip: stringify then parse preserves all fields', () => {
    fc.assert(
      fc.property(validContentIdeaArb, (idea) => {
        const json = JSON.stringify(idea);
        const parsed = parseContentIdea(json);

        expect(parsed.contentIdea).toBe(idea.contentIdea);
        expect(parsed.titleVariations).toEqual(idea.titleVariations);
        expect(parsed.storyHook).toBe(idea.storyHook);
        expect(parsed.missionDirective).toBe(idea.missionDirective);
        expect(parsed.thumbnailPrompts).toEqual(idea.thumbnailPrompts);
      }),
      { numRuns: 100 }
    );
  });

  it('parsing preserves exact string values without trimming or transformation', () => {
    fc.assert(
      fc.property(validContentIdeaArb, (idea) => {
        const json = JSON.stringify(idea);
        const parsed = parseContentIdea(json);

        // Verify the parsed object is deeply equal to the input
        expect(parsed).toEqual({
          contentIdea: idea.contentIdea,
          titleVariations: idea.titleVariations,
          storyHook: idea.storyHook,
          missionDirective: idea.missionDirective,
          thumbnailPrompts: idea.thumbnailPrompts,
        });
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 4: Invalid or incomplete JSON is rejected
 *
 * For any JSON string that is either malformed (not valid JSON) or a valid JSON object
 * missing at least one required field (`contentIdea`, `titleVariations`, `storyHook`,
 * `missionDirective`, `thumbnailPrompts`) or where `titleVariations`/`thumbnailPrompts`
 * does not have exactly 3 items, the response parser throws an error with type "parse_error".
 *
 * Validates: Requirements 3.4, 3.5
 */
describe('Feature: ai-content-generator, Property 4: Invalid or incomplete JSON is rejected', () => {
  const requiredFields = ['contentIdea', 'titleVariations', 'storyHook', 'missionDirective', 'thumbnailPrompts'] as const;

  // Generator for a complete valid object (used as base for removing fields)
  const completeObjectArb = fc.record({
    contentIdea: fc.string({ minLength: 1 }),
    titleVariations: fc.tuple(fc.string(), fc.string(), fc.string()),
    storyHook: fc.string({ minLength: 1 }),
    missionDirective: fc.string({ minLength: 1 }),
    thumbnailPrompts: fc.tuple(fc.string(), fc.string(), fc.string()),
  });

  it('rejects malformed JSON (not valid JSON)', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          try {
            JSON.parse(s);
            return false;
          } catch {
            return true;
          }
        }),
        (malformedJson) => {
          expect(() => parseContentIdea(malformedJson)).toThrow();
          try {
            parseContentIdea(malformedJson);
          } catch (e: unknown) {
            expect(e).toEqual({ type: 'parse_error' });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects valid JSON objects missing at least one required field', () => {
    fc.assert(
      fc.property(
        completeObjectArb,
        fc.integer({ min: 0, max: requiredFields.length - 1 }),
        (obj, fieldIndex) => {
          // Remove one required field
          const incomplete = { ...obj, titleVariations: [...obj.titleVariations], thumbnailPrompts: [...obj.thumbnailPrompts] };
          delete (incomplete as Record<string, unknown>)[requiredFields[fieldIndex]];
          const json = JSON.stringify(incomplete);

          expect(() => parseContentIdea(json)).toThrow();
          try {
            parseContentIdea(json);
          } catch (e: unknown) {
            expect(e).toEqual({ type: 'parse_error' });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects objects where titleVariations does not have exactly 3 items', () => {
    fc.assert(
      fc.property(
        completeObjectArb,
        fc.integer({ min: 0, max: 5 }).filter((n) => n !== 3),
        (obj, arrayLength) => {
          const modified = {
            ...obj,
            titleVariations: Array.from({ length: arrayLength }, (_, i) => `title-${i}`),
            thumbnailPrompts: [...obj.thumbnailPrompts],
          };
          const json = JSON.stringify(modified);

          expect(() => parseContentIdea(json)).toThrow();
          try {
            parseContentIdea(json);
          } catch (e: unknown) {
            expect(e).toEqual({ type: 'parse_error' });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects objects where thumbnailPrompts does not have exactly 3 items', () => {
    fc.assert(
      fc.property(
        completeObjectArb,
        fc.integer({ min: 0, max: 5 }).filter((n) => n !== 3),
        (obj, arrayLength) => {
          const modified = {
            ...obj,
            titleVariations: [...obj.titleVariations],
            thumbnailPrompts: Array.from({ length: arrayLength }, (_, i) => `prompt-${i}`),
          };
          const json = JSON.stringify(modified);

          expect(() => parseContentIdea(json)).toThrow();
          try {
            parseContentIdea(json);
          } catch (e: unknown) {
            expect(e).toEqual({ type: 'parse_error' });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-object JSON values (null, arrays, numbers, booleans)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('null'),
          fc.constant('true'),
          fc.constant('false'),
          fc.integer().map((n) => JSON.stringify(n)),
          fc.array(fc.string()).map((arr) => JSON.stringify(arr))
        ),
        (jsonValue) => {
          expect(() => parseContentIdea(jsonValue)).toThrow();
          try {
            parseContentIdea(jsonValue);
          } catch (e: unknown) {
            expect(e).toEqual({ type: 'parse_error' });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
