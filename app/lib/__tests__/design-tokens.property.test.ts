import fc from 'fast-check';
import {
  foundationTokens,
  semanticTokens,
  resolveToken,
} from '../design-tokens';

/**
 * Feature: design-system, Property 1: Semantic Token Resolution
 *
 * Validates: Requirements 2.1, 2.4
 *
 * For any semantic token in the design system registry, resolving it through
 * the token chain should produce the exact hex value of the foundation token
 * it references. Furthermore, for any valid hex color assigned to a foundation
 * token, all semantic tokens referencing that foundation token should resolve
 * to the updated value without requiring changes to semantic token names or
 * component code.
 */
describe('Feature: design-system, Property 1: Semantic Token Resolution', () => {
  // Arbitrary that picks any semantic token name from the registry
  const semanticTokenNameArb = fc.constantFrom(...Object.keys(semanticTokens));

  // Hex color arbitrary: generates valid 6-digit hex color strings
  const hexColorArb = fc
    .tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 })
    )
    .map(
      ([r, g, b]) =>
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    );

  it('resolveToken returns a valid hex color string for any semantic token name', () => {
    /**
     * Validates: Requirements 2.1
     *
     * For any semantic token name picked from the registry,
     * resolveToken(name) returns a valid hex color string.
     */
    fc.assert(
      fc.property(semanticTokenNameArb, (semanticName) => {
        const resolved = resolveToken(semanticName);
        expect(resolved).not.toBeNull();
        expect(resolved).toMatch(/^#[0-9a-f]{6}$/i);
      }),
      { numRuns: 100 }
    );
  });

  it('resolved value matches foundationTokens[semanticTokens[name]] for any semantic token', () => {
    /**
     * Validates: Requirements 2.1, 2.4
     *
     * For any semantic token, the resolved value matches
     * foundationTokens[semanticTokens[name]].
     */
    fc.assert(
      fc.property(semanticTokenNameArb, (semanticName) => {
        const resolved = resolveToken(semanticName);
        const foundationName = semanticTokens[semanticName];
        const expectedHex = foundationTokens[foundationName];
        expect(resolved).toBe(expectedHex);
      }),
      { numRuns: 100 }
    );
  });

  it('resolution chain is consistent: semantic → foundation name → hex value', () => {
    /**
     * Validates: Requirements 2.1, 2.4
     *
     * The resolution chain is consistent: looking up the semantic token gives
     * a foundation name, and that foundation name maps to the same hex value
     * that resolveToken produces.
     */
    fc.assert(
      fc.property(semanticTokenNameArb, (semanticName) => {
        // Step 1: semantic token → foundation token name
        const foundationName = semanticTokens[semanticName];
        expect(foundationName).toBeDefined();
        expect(typeof foundationName).toBe('string');

        // Step 2: foundation token name → hex value
        const hexValue = foundationTokens[foundationName];
        expect(hexValue).toBeDefined();
        expect(hexValue).toMatch(/^#[0-9a-f]{6}$/i);

        // Step 3: resolveToken produces the same result as the manual chain
        const resolved = resolveToken(semanticName);
        expect(resolved).toBe(hexValue);
      }),
      { numRuns: 100 }
    );
  });

  it('updating a foundation token value propagates to all semantic tokens referencing it', () => {
    /**
     * Validates: Requirements 2.4
     *
     * For any valid hex color assigned to a foundation token, all semantic
     * tokens referencing that foundation token should resolve to the updated
     * value without requiring changes to semantic token names or component code.
     *
     * This test simulates a brand color change by temporarily mutating a
     * foundation token value and verifying all referencing semantic tokens
     * resolve to the new value.
     */
    // Pick a foundation token name that is referenced by at least one semantic token
    const referencedFoundationNames = [
      ...new Set(Object.values(semanticTokens)),
    ];
    const foundationNameArb = fc.constantFrom(...referencedFoundationNames);

    fc.assert(
      fc.property(foundationNameArb, hexColorArb, (foundationName, newHex) => {
        // Save original value
        const originalValue = foundationTokens[foundationName];

        // Simulate brand color change
        foundationTokens[foundationName] = newHex;

        try {
          // Find all semantic tokens that reference this foundation token
          const referencingSemanticTokens = Object.entries(semanticTokens)
            .filter(([, ref]) => ref === foundationName)
            .map(([name]) => name);

          // Every referencing semantic token should now resolve to the new hex
          for (const semanticName of referencingSemanticTokens) {
            const resolved = resolveToken(semanticName);
            expect(resolved).toBe(newHex);
          }
        } finally {
          // Restore original value to avoid test pollution
          foundationTokens[foundationName] = originalValue;
        }
      }),
      { numRuns: 100 }
    );
  });
});
