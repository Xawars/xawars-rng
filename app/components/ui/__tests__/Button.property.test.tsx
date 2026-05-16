import { render } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import { Button } from '../Button';

/**
 * Feature: design-system, Property 2: Button Variant and Size Rendering
 *
 * Validates: Requirements 4.1, 4.2, 9.4
 *
 * For any valid combination of button variant ('primary' | 'danger' | 'outline' | 'ghost')
 * and size ('sm' | 'md' | 'lg'), the Button component should render with the correct CSS
 * classes for background, text color, shadow, padding, font-size, and gap as defined in
 * the variant/size style maps. Additionally, for any button with an icon prop, the icon
 * should appear before the text content with a gap matching the size.
 */
describe('Feature: design-system, Property 2: Button Variant and Size Rendering', () => {
  // Variant style expectations
  const variantClasses: Record<string, string[]> = {
    primary: ['bg-yellow-500', 'text-black', 'shadow-yellow-500/20'],
    danger: ['bg-red-600', 'text-white', 'shadow-red-600/20'],
    outline: ['border-white/20', 'text-white'],
    ghost: ['text-white/60'],
  };

  // Size style expectations
  const sizeClasses: Record<string, string[]> = {
    sm: ['px-3', 'py-1.5', 'text-xs', 'gap-1.5'],
    md: ['px-6', 'py-3', 'text-sm', 'gap-2'],
    lg: ['px-8', 'py-4', 'text-base', 'gap-3'],
  };

  // Size to gap mapping for icon tests
  const sizeGapClasses: Record<string, string> = {
    sm: 'gap-1.5',
    md: 'gap-2',
    lg: 'gap-3',
  };

  // Arbitraries
  const variantArb = fc.constantFrom(
    'primary' as const,
    'danger' as const,
    'outline' as const,
    'ghost' as const
  );
  const sizeArb = fc.constantFrom('sm' as const, 'md' as const, 'lg' as const);

  it('renders correct variant CSS classes for any variant and size combination', () => {
    /**
     * Validates: Requirements 4.1
     *
     * For any valid variant, the Button renders with the expected
     * background, text color, and shadow classes.
     */
    fc.assert(
      fc.property(variantArb, sizeArb, (variant, size) => {
        const { container } = render(
          <Button variant={variant} size={size}>
            Test
          </Button>
        );
        const button = container.querySelector('button')!;
        const className = button.className;

        const expectedClasses = variantClasses[variant];
        for (const cls of expectedClasses) {
          expect(className).toContain(cls);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('renders correct size CSS classes for any variant and size combination', () => {
    /**
     * Validates: Requirements 4.2
     *
     * For any valid size, the Button renders with the expected
     * padding, font-size, and gap classes.
     */
    fc.assert(
      fc.property(variantArb, sizeArb, (variant, size) => {
        const { container } = render(
          <Button variant={variant} size={size}>
            Test
          </Button>
        );
        const button = container.querySelector('button')!;
        const className = button.className;

        const expectedClasses = sizeClasses[size];
        for (const cls of expectedClasses) {
          expect(className).toContain(cls);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('renders icon before text with correct gap class for any variant/size with icon', () => {
    /**
     * Validates: Requirements 9.4
     *
     * For any button with an icon prop, the icon should appear before
     * the text content with a gap matching the size (gap-1.5 for sm,
     * gap-2 for md, gap-3 for lg).
     */
    // Mock LucideIcon component
    const MockIcon: React.FC<{ className?: string; 'aria-hidden'?: string }> = (
      props
    ) => <svg data-testid="mock-icon" {...props} />;
    // Cast to satisfy LucideIcon type
    const IconComponent = MockIcon as unknown as import('lucide-react').LucideIcon;

    fc.assert(
      fc.property(variantArb, sizeArb, (variant, size) => {
        const { container } = render(
          <Button variant={variant} size={size} icon={IconComponent}>
            Button Text
          </Button>
        );
        const button = container.querySelector('button')!;
        const className = button.className;

        // The gap class should be present on the button (from size styles)
        const expectedGap = sizeGapClasses[size];
        expect(className).toContain(expectedGap);

        // Icon should be rendered (as svg) before the text
        const svg = button.querySelector('svg');
        expect(svg).not.toBeNull();

        // Icon should have aria-hidden="true" for decorative context
        expect(svg!.getAttribute('aria-hidden')).toBe('true');

        // Icon should appear before text content in DOM order
        const children = Array.from(button.childNodes);
        const svgIndex = children.findIndex(
          (node) => node === svg || (node as Element).querySelector?.('svg')
        );
        const textIndex = children.findIndex(
          (node) =>
            node.nodeType === Node.TEXT_NODE ||
            (node.textContent === 'Button Text' && node !== svg)
        );
        expect(svgIndex).toBeLessThan(textIndex);
      }),
      { numRuns: 100 }
    );
  });
});
