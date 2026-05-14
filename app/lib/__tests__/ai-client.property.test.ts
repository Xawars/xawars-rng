import fc from 'fast-check';
import { parseContentIdea, classifyApiError } from '../ai-client';
import { PROVIDER_ORDER } from '../ai-providers';

/**
 * Property 6: ContentIdea parsing round-trip
 *
 * For any valid ContentIdea object, serializing it to JSON and then parsing it with
 * `parseContentIdea` SHALL produce an equivalent object. Conversely, for any JSON string
 * that is missing required fields or has incorrect array lengths, `parseContentIdea`
 * SHALL throw a parse error.
 *
 * Validates: Requirements 5.4, 5.5
 */
describe('Feature: multi-provider-support, Property 6: ContentIdea parsing round-trip', () => {
  const validContentIdeaArb = fc.record({
    contentIdea: fc.string({ minLength: 1 }),
    titleVariations: fc.tuple(
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 })
    ),
    storyHook: fc.string({ minLength: 1 }),
    missionDirective: fc.string({ minLength: 1 }),
    thumbnailPrompts: fc.tuple(
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 })
    ),
  });

  it('round-trip: stringify then parse produces an equivalent object', () => {
    fc.assert(
      fc.property(validContentIdeaArb, (idea) => {
        const json = JSON.stringify(idea);
        const parsed = parseContentIdea(json);

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

  it('rejects random strings that are not valid JSON', () => {
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
        (invalidJson) => {
          expect(() => parseContentIdea(invalidJson)).toThrow();
          try {
            parseContentIdea(invalidJson);
          } catch (e: unknown) {
            expect(e).toEqual({ type: 'parse_error' });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects objects missing required fields', () => {
    const requiredFields = [
      'contentIdea',
      'titleVariations',
      'storyHook',
      'missionDirective',
      'thumbnailPrompts',
    ] as const;

    fc.assert(
      fc.property(
        validContentIdeaArb,
        fc.integer({ min: 0, max: requiredFields.length - 1 }),
        (idea, fieldIndex) => {
          const incomplete = { ...idea };
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

  it('rejects objects with wrong array lengths for titleVariations', () => {
    fc.assert(
      fc.property(
        validContentIdeaArb,
        fc.integer({ min: 0, max: 5 }).filter((n) => n !== 3),
        (idea, arrayLength) => {
          const modified = {
            ...idea,
            titleVariations: Array.from({ length: arrayLength }, (_, i) => `title-${i}`),
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

  it('rejects objects with wrong array lengths for thumbnailPrompts', () => {
    fc.assert(
      fc.property(
        validContentIdeaArb,
        fc.integer({ min: 0, max: 5 }).filter((n) => n !== 3),
        (idea, arrayLength) => {
          const modified = {
            ...idea,
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
});

/**
 * Property 7: Error classification correctness
 *
 * For any error condition (HTTP 429 response, network TypeError, AbortError timeout),
 * `classifyApiError` SHALL return the correct error type, the expected user-facing message,
 * and `retryable: true`.
 *
 * Validates: Requirements 6.4, 6.5, 6.6
 */
describe('Feature: multi-provider-support, Property 7: Error classification correctness', () => {
  it('classifies HTTP 429 as rate_limit with correct message and retryable for any provider', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PROVIDER_ORDER),
        (provider) => {
          const error = { status: 429 };
          const result = classifyApiError(provider, error);

          expect(result).toEqual({
            type: 'rate_limit',
            message: 'Too many requests. Please wait.',
            retryable: true,
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('classifies TypeError as network error with correct message and retryable for any provider', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PROVIDER_ORDER),
        (provider) => {
          const error = new TypeError('Failed to fetch');
          const result = classifyApiError(provider, error);

          expect(result).toEqual({
            type: 'network',
            message: 'Network error. Check your connection.',
            retryable: true,
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('classifies AbortError as timeout with correct message and retryable for any provider', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PROVIDER_ORDER),
        (provider) => {
          const error = new DOMException('The operation was aborted', 'AbortError');
          const result = classifyApiError(provider, error);

          expect(result).toEqual({
            type: 'timeout',
            message: 'Request timed out. Try again.',
            retryable: true,
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
