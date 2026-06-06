import { render } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import { RivalryStatCard } from '../RivalryStatCard';
import type { StatCardResult, RivalryMetric, Advantage } from '../../../lib/comparison-engine';

// --- Generators ---

const RIVALRY_METRICS: RivalryMetric[] = [
  'deployments',
  'kills',
  'deaths',
  'kdRatio',
  'avgKills',
  'pickRate',
  'masteryTier',
];

const METRIC_LABELS: Record<RivalryMetric, string> = {
  deployments: 'Deployments',
  kills: 'Kills',
  deaths: 'Deaths',
  kdRatio: 'K/D Ratio',
  avgKills: 'Avg Kills',
  pickRate: 'Pick Rate',
  masteryTier: 'Mastery Tier',
};

/** Generates a random operator name (non-empty alphanumeric string) */
const arbitraryOperatorName: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme-ascii' });

/** Generates a random display string (non-empty, e.g. "42", "3.14", "—") */
const arbitraryDisplayString: fc.Arbitrary<string> = fc.oneof(
  fc.nat({ max: 9999 }).map((n) => String(n)),
  fc.nat({ max: 999 }).map((n) => `${(n / 10).toFixed(1)}`),
  fc.nat({ max: 100 }).map((n) => `${(n / 10).toFixed(1)}%`),
  fc.constant('—')
);

/** Generates a valid StatCardResult with random metric, values, and advantage */
const arbitraryStatCardResult: fc.Arbitrary<StatCardResult> = fc.record({
  metric: fc.constantFrom(...RIVALRY_METRICS),
  label: fc.constantFrom(...Object.values(METRIC_LABELS)),
  leftValue: fc.oneof(fc.nat({ max: 9999 }), fc.constant(null)),
  rightValue: fc.oneof(fc.nat({ max: 9999 }), fc.constant(null)),
  leftDisplay: arbitraryDisplayString,
  rightDisplay: arbitraryDisplayString,
  advantage: fc.constantFrom<Advantage>('left', 'right', 'tie'),
});

/** Generates a StatCardResult with advantage NOT 'tie' */
const arbitraryStatCardResultWithAdvantage: fc.Arbitrary<StatCardResult> = arbitraryStatCardResult.filter(
  (r) => r.advantage !== 'tie'
);

/** Generates a StatCardResult with advantage === 'tie' */
const arbitraryStatCardResultTie: fc.Arbitrary<StatCardResult> = arbitraryStatCardResult.map(
  (r) => ({ ...r, advantage: 'tie' as Advantage })
);

// --- Property Tests ---

/**
 * Feature: operator-rivalry, Property 13: ARIA labels on stat cards
 *
 * For any valid StatCardResult rendered as a RivalryStatCard component,
 * the output DOM shall contain an aria-label attribute that includes
 * the metric name, both operator values, and which operator has the advantage (or "tie").
 *
 * **Validates: Requirements 6.2**
 */
describe('Feature: operator-rivalry, Property 13: ARIA labels on stat cards', () => {
  it('rendered output has aria-label containing metric label, both values, and advantage', () => {
    fc.assert(
      fc.property(
        arbitraryStatCardResult,
        arbitraryOperatorName,
        arbitraryOperatorName,
        (result, leftName, rightName) => {
          const { container } = render(
            <RivalryStatCard
              result={result}
              leftOperatorName={leftName}
              rightOperatorName={rightName}
            />
          );

          const element = container.querySelector('[aria-label]');
          expect(element).not.toBeNull();

          const ariaLabel = element!.getAttribute('aria-label')!;

          // Must include the metric label
          expect(ariaLabel).toContain(result.label);

          // Must include both operator display values
          expect(ariaLabel).toContain(result.leftDisplay);
          expect(ariaLabel).toContain(result.rightDisplay);

          // Must include advantage information
          if (result.advantage === 'left') {
            expect(ariaLabel).toContain(`${leftName} leads`);
          } else if (result.advantage === 'right') {
            expect(ariaLabel).toContain(`${rightName} leads`);
          } else {
            expect(ariaLabel).toContain('tie');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 14: Advantage indicator accessibility
 *
 * For any StatCardResult with advantage not equal to 'tie', the rendered
 * advantage indicator includes both a CSS color class (text-green-400) and
 * a supplementary text indicator (▲ arrow) so that the advantage is
 * perceivable without color vision.
 *
 * For tie state: no green color class on value elements and no ▲ arrow present.
 *
 * **Validates: Requirements 6.4**
 */
describe('Feature: operator-rivalry, Property 14: Advantage indicator accessibility', () => {
  it('advantage state renders green color class AND supplementary arrow text', () => {
    fc.assert(
      fc.property(
        arbitraryStatCardResultWithAdvantage,
        arbitraryOperatorName,
        arbitraryOperatorName,
        (result, leftName, rightName) => {
          const { container } = render(
            <RivalryStatCard
              result={result}
              leftOperatorName={leftName}
              rightOperatorName={rightName}
            />
          );

          // Must contain an element with green color class
          const greenElements = container.querySelectorAll('.text-green-400');
          expect(greenElements.length).toBeGreaterThan(0);

          // Must contain the ▲ arrow as supplementary text indicator
          expect(container.textContent).toContain('▲');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('tie state renders without green color class on values and without ▲ arrow', () => {
    fc.assert(
      fc.property(
        arbitraryStatCardResultTie,
        arbitraryOperatorName,
        arbitraryOperatorName,
        (result, leftName, rightName) => {
          const { container } = render(
            <RivalryStatCard
              result={result}
              leftOperatorName={leftName}
              rightOperatorName={rightName}
            />
          );

          // No green color class should be applied to value elements
          const greenElements = container.querySelectorAll('.text-green-400');
          expect(greenElements.length).toBe(0);

          // No ▲ arrow should be present
          expect(container.textContent).not.toContain('▲');
        }
      ),
      { numRuns: 100 }
    );
  });
});
