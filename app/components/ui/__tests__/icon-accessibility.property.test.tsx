import { render } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import { Button } from '../Button';
import { ErrorBanner } from '../ErrorBanner';

/**
 * Feature: design-system, Property 9: Decorative Icon Accessibility
 *
 * Validates: Requirements 20.5, 9.2
 *
 * For any icon rendered in a decorative context (accompanying text that already conveys
 * meaning), the icon element should have `aria-hidden="true"` set. For any icon rendered
 * as the sole content of an interactive element (icon-only button), the parent element
 * should have an `aria-label` attribute with descriptive text.
 */
describe('Feature: design-system, Property 9: Decorative Icon Accessibility', () => {
  // Mock LucideIcon component for Button icon prop
  const MockIcon: React.FC<{ className?: string; 'aria-hidden'?: string }> = (props) => (
    <svg data-testid="mock-icon" {...props} />
  );
  const IconComponent = MockIcon as unknown as import('lucide-react').LucideIcon;

  // Arbitraries
  const variantArb = fc.constantFrom(
    'primary' as const,
    'danger' as const,
    'outline' as const,
    'ghost' as const
  );
  const sizeArb = fc.constantFrom('sm' as const, 'md' as const, 'lg' as const);
  const buttonTextArb = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);
  const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

  it('Button with icon prop: SVG has aria-hidden="true" for any variant/size combination', () => {
    /**
     * Validates: Requirements 20.5, 9.2
     *
     * For any Button rendered with an icon prop (decorative context — text conveys meaning),
     * the icon SVG element should have aria-hidden="true".
     */
    fc.assert(
      fc.property(variantArb, sizeArb, buttonTextArb, (variant, size, text) => {
        const { container } = render(
          <Button variant={variant} size={size} icon={IconComponent}>
            {text}
          </Button>
        );
        const button = container.querySelector('button')!;
        const svg = button.querySelector('svg');

        // Icon SVG must exist
        expect(svg).not.toBeNull();

        // Decorative icon must have aria-hidden="true"
        expect(svg!.getAttribute('aria-hidden')).toBe('true');
      }),
      { numRuns: 100 }
    );
  });

  it('Button in loading state: spinner SVG has aria-hidden="true" for any variant/size', () => {
    /**
     * Validates: Requirements 20.5, 9.2
     *
     * For any Button in loading state (decorative spinner — "Please wait..." text conveys meaning),
     * the spinner SVG element should have aria-hidden="true".
     */
    fc.assert(
      fc.property(variantArb, sizeArb, buttonTextArb, (variant, size, text) => {
        const { container } = render(
          <Button variant={variant} size={size} loading>
            {text}
          </Button>
        );
        const button = container.querySelector('button')!;
        const svg = button.querySelector('svg');

        // Spinner SVG must exist in loading state
        expect(svg).not.toBeNull();

        // Decorative spinner must have aria-hidden="true"
        expect(svg!.getAttribute('aria-hidden')).toBe('true');
      }),
      { numRuns: 100 }
    );
  });

  it('ErrorBanner with onDismiss: X icon SVG has aria-hidden="true" and parent button has aria-label', () => {
    /**
     * Validates: Requirements 20.5, 9.2
     *
     * For any ErrorBanner with an onDismiss handler, the dismiss button's X icon SVG
     * should have aria-hidden="true" (decorative — aria-label conveys meaning),
     * and the parent button should have an aria-label attribute with descriptive text.
     */
    fc.assert(
      fc.property(errorMessageArb, (message) => {
        const onDismiss = () => {};
        const { container } = render(
          <ErrorBanner message={message} onDismiss={onDismiss} />
        );

        // Find the dismiss button (has aria-label)
        const dismissButton = container.querySelector('button[aria-label]');
        expect(dismissButton).not.toBeNull();

        // Parent button must have aria-label with descriptive text
        const ariaLabel = dismissButton!.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(0);

        // X icon SVG inside dismiss button must have aria-hidden="true"
        const svg = dismissButton!.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg!.getAttribute('aria-hidden')).toBe('true');
      }),
      { numRuns: 100 }
    );
  });
});
