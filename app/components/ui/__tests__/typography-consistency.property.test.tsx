import { render } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { EmptyState } from '../EmptyState';
import { ErrorBanner } from '../ErrorBanner';
import { Divider } from '../Divider';

/**
 * Feature: design-system, Property 6: Uppercase Tracking Consistency
 *
 * Validates: Requirements 11.2, 3.3
 *
 * For any component element that applies the `uppercase` CSS class, that same element
 * (or its parent) should also include either `tracking-wider` or `tracking-widest` —
 * plain uppercase without tracking adjustment is never rendered.
 */
describe('Feature: design-system, Property 6: Uppercase Tracking Consistency', () => {
  /**
   * Helper: checks that every element with `uppercase` in its className
   * also has `tracking-wider` or `tracking-widest` on itself or a parent.
   */
  function assertUppercaseHasTracking(container: HTMLElement): void {
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      const className = el.className;
      if (typeof className !== 'string') return;
      if (!className.split(/\s+/).includes('uppercase')) return;

      // Check this element or any ancestor for tracking class
      let current: Element | null = el;
      let hasTracking = false;
      while (current && current !== container) {
        const cls = current.className;
        if (typeof cls === 'string') {
          const classes = cls.split(/\s+/);
          if (classes.includes('tracking-wider') || classes.includes('tracking-widest')) {
            hasTracking = true;
            break;
          }
        }
        current = current.parentElement;
      }

      expect(hasTracking).toBe(true);
    });
  }

  // Arbitraries for Button
  const buttonVariantArb = fc.constantFrom(
    'primary' as const,
    'danger' as const,
    'outline' as const,
    'ghost' as const
  );
  const buttonSizeArb = fc.constantFrom('sm' as const, 'md' as const, 'lg' as const);
  const buttonTextArb = fc.string({ minLength: 1, maxLength: 20 });

  // Arbitraries for Badge
  const badgeVariantArb = fc.constantFrom(
    'default' as const,
    'attack' as const,
    'defense' as const,
    'success' as const,
    'error' as const,
    'warning' as const
  );
  const badgeSizeArb = fc.constantFrom('sm' as const, 'md' as const);
  const badgeTextArb = fc.string({ minLength: 1, maxLength: 20 });

  // Arbitraries for EmptyState
  const emptyStateMessageArb = fc.string({ minLength: 1, maxLength: 40 });

  // Arbitraries for Divider (with text)
  const dividerTextArb = fc.string({ minLength: 1, maxLength: 20 });

  // Arbitraries for ErrorBanner
  const errorMessageArb = fc.string({ minLength: 1, maxLength: 50 });

  it('Button: uppercase elements always have tracking-wider or tracking-widest', () => {
    /**
     * Validates: Requirements 11.2, 3.3
     */
    fc.assert(
      fc.property(buttonVariantArb, buttonSizeArb, buttonTextArb, (variant, size, text) => {
        const { container } = render(
          <Button variant={variant} size={size}>
            {text}
          </Button>
        );
        assertUppercaseHasTracking(container);
      }),
      { numRuns: 100 }
    );
  });

  it('Badge: uppercase elements always have tracking-wider or tracking-widest', () => {
    /**
     * Validates: Requirements 11.2, 3.3
     */
    fc.assert(
      fc.property(badgeVariantArb, badgeSizeArb, badgeTextArb, (variant, size, text) => {
        const { container } = render(
          <Badge variant={variant} size={size}>
            {text}
          </Badge>
        );
        assertUppercaseHasTracking(container);
      }),
      { numRuns: 100 }
    );
  });

  it('EmptyState: uppercase elements always have tracking-wider or tracking-widest', () => {
    /**
     * Validates: Requirements 11.2, 3.3
     */
    fc.assert(
      fc.property(emptyStateMessageArb, (message) => {
        const { container } = render(<EmptyState message={message} />);
        assertUppercaseHasTracking(container);
      }),
      { numRuns: 100 }
    );
  });

  it('ErrorBanner with retry: uppercase elements always have tracking-wider or tracking-widest', () => {
    /**
     * Validates: Requirements 11.2, 3.3
     */
    const onRetry = () => {};
    fc.assert(
      fc.property(errorMessageArb, (message) => {
        const { container } = render(
          <ErrorBanner message={message} onRetry={onRetry} />
        );
        assertUppercaseHasTracking(container);
      }),
      { numRuns: 100 }
    );
  });

  it('Divider with text: uppercase elements always have tracking-wider or tracking-widest', () => {
    /**
     * Validates: Requirements 11.2, 3.3
     */
    fc.assert(
      fc.property(dividerTextArb, (text) => {
        const { container } = render(<Divider text={text} />);
        assertUppercaseHasTracking(container);
      }),
      { numRuns: 100 }
    );
  });
});
