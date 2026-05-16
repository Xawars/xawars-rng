import fc from 'fast-check';
import {
  getContextColor,
  getImportanceBorder,
  foundationTokens,
  isValidToken,
} from '../design-tokens';

describe('Feature: design-system, Property 7: Gaming Context Color Resolution', () => {
  it('returns the correct accent color for any valid side value', () => {
    /**
     * Validates: Requirements 17.1, 17.2
     *
     * For any valid side value ('attack' | 'defense'), getContextColor returns
     * the correct foundation token name: orange-500 for attack, blue-500 for defense.
     */
    const sideArb = fc.constantFrom<'attack' | 'defense'>('attack', 'defense');

    const expectedMap: Record<'attack' | 'defense', string> = {
      attack: 'orange-500',
      defense: 'blue-500',
    };

    fc.assert(
      fc.property(sideArb, (side) => {
        const result = getContextColor(side);
        expect(result).toBe(expectedMap[side]);
      }),
      { numRuns: 100 }
    );
  });

  it('returns a valid foundation token name for any side value', () => {
    /**
     * Validates: Requirements 17.1, 17.2
     *
     * For any valid side value, the returned color token name must exist
     * in the foundationTokens registry.
     */
    const sideArb = fc.constantFrom<'attack' | 'defense'>('attack', 'defense');

    fc.assert(
      fc.property(sideArb, (side) => {
        const result = getContextColor(side);
        expect(isValidToken(result)).toBe(true);
        expect(result in foundationTokens).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('returns the correct border class for any valid importance tier', () => {
    /**
     * Validates: Requirements 17.3
     *
     * For any valid importance tier ('primary' | 'secondary' | 'niche'),
     * getImportanceBorder returns the correct border class.
     */
    const tierArb = fc.constantFrom<'primary' | 'secondary' | 'niche'>('primary', 'secondary', 'niche');

    const expectedMap: Record<'primary' | 'secondary' | 'niche', string> = {
      primary: 'border-yellow-500/30',
      secondary: 'border-zinc-700',
      niche: 'border-zinc-700/50',
    };

    fc.assert(
      fc.property(tierArb, (tier) => {
        const result = getImportanceBorder(tier);
        expect(result).toBe(expectedMap[tier]);
      }),
      { numRuns: 100 }
    );
  });

  it('returns border classes matching the pattern border-{token} or border-{token}/{opacity}', () => {
    /**
     * Validates: Requirements 17.3
     *
     * For any valid importance tier, the returned border class follows
     * the pattern `border-{token}` or `border-{token}/{opacity}`.
     */
    const tierArb = fc.constantFrom<'primary' | 'secondary' | 'niche'>('primary', 'secondary', 'niche');

    const borderPattern = /^border-[a-z]+-\d+(\/\d+)?$/;

    fc.assert(
      fc.property(tierArb, (tier) => {
        const result = getImportanceBorder(tier);
        expect(result).toMatch(borderPattern);
      }),
      { numRuns: 100 }
    );
  });
});
