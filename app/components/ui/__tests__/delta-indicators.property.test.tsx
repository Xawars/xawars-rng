import { render } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import { DeltaIndicator } from '../DeltaIndicator';

/**
 * Feature: design-system, Property 8: Delta Indicator Correctness
 *
 * Validates: Requirements 18.3
 *
 * For any numeric value representing a change delta: positive values should render
 * with green-400 color and an upward arrow indicator, negative values should render
 * with red-400 color and a downward arrow indicator, and zero values should render
 * with zinc-400 color and no directional indicator.
 */
describe('Feature: design-system, Property 8: Delta Indicator Correctness', () => {
  it('renders positive values with text-green-400 and upward arrow ▲', () => {
    /**
     * Validates: Requirements 18.3
     *
     * For any positive integer, the rendered span has text-green-400 class
     * and contains the "▲" upward arrow indicator.
     */
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (value) => {
        const { container } = render(<DeltaIndicator value={value} />);
        const span = container.querySelector('span')!;

        expect(span.className).toContain('text-green-400');
        expect(span.textContent).toContain('▲');
      }),
      { numRuns: 100 }
    );
  });

  it('renders negative values with text-red-400 and downward arrow ▼', () => {
    /**
     * Validates: Requirements 18.3
     *
     * For any negative integer, the rendered span has text-red-400 class
     * and contains the "▼" downward arrow indicator.
     */
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: -1 }), (value) => {
        const { container } = render(<DeltaIndicator value={value} />);
        const span = container.querySelector('span')!;

        expect(span.className).toContain('text-red-400');
        expect(span.textContent).toContain('▼');
      }),
      { numRuns: 100 }
    );
  });

  it('renders zero with text-zinc-400 and no directional arrow', () => {
    /**
     * Validates: Requirements 18.3
     *
     * For zero value, the rendered span has text-zinc-400 class,
     * contains "—", and does not contain ▲ or ▼ arrows.
     */
    fc.assert(
      fc.property(fc.constant(0), (value) => {
        const { container } = render(<DeltaIndicator value={value} />);
        const span = container.querySelector('span')!;

        expect(span.className).toContain('text-zinc-400');
        expect(span.textContent).toContain('—');
        expect(span.textContent).not.toContain('▲');
        expect(span.textContent).not.toContain('▼');
      }),
      { numRuns: 100 }
    );
  });
});
