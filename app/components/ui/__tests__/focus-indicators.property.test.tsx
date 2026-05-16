import { render } from '@testing-library/react';
import fc from 'fast-check';
import { Button } from '../Button';
import { Input } from '../Input';
import { Select } from '../Select';

/**
 * Feature: design-system, Property 4: Interactive Component Focus Indicators
 *
 * Validates: Requirements 11.5, 4.5
 *
 * For any interactive component (Button, Input, Select, or any element with
 * onClick/onChange handlers), the rendered output should include visible focus
 * indicator classes (focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2
 * focus:ring-offset-zinc-900 or equivalent) meeting WCAG AA requirements.
 */
describe('Feature: design-system, Property 4: Interactive Component Focus Indicators', () => {
  const FOCUS_RING_CLASSES = [
    'focus:ring-2',
    'focus:ring-yellow-500',
    'focus:ring-offset-2',
    'focus:ring-offset-zinc-900',
  ];

  // Arbitraries for Button props
  const buttonVariantArb = fc.constantFrom(
    'primary' as const,
    'danger' as const,
    'outline' as const,
    'ghost' as const
  );
  const buttonSizeArb = fc.constantFrom(
    'sm' as const,
    'md' as const,
    'lg' as const
  );
  const booleanArb = fc.boolean();

  // Arbitrary for Input props
  const optionalStringArb = fc.option(
    fc.string({ minLength: 1, maxLength: 30 }),
    { nil: undefined }
  );

  // Arbitrary for Select options
  const selectOptionsArb = fc
    .array(
      fc.record({
        value: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        label: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
      }),
      { minLength: 1, maxLength: 5 }
    )
    .map((options) => {
      // Ensure unique values
      const seen = new Set<string>();
      return options.filter((opt) => {
        if (seen.has(opt.value)) return false;
        seen.add(opt.value);
        return true;
      });
    })
    .filter((options) => options.length > 0);

  function assertFocusRingClasses(className: string | null) {
    expect(className).toBeTruthy();
    for (const cls of FOCUS_RING_CLASSES) {
      expect(className).toContain(cls);
    }
  }

  it('Button includes focus ring classes for any variant and size combination', () => {
    /**
     * Validates: Requirements 11.5, 4.5
     *
     * For any valid combination of button variant and size, the rendered
     * button element should include all required focus ring classes.
     */
    fc.assert(
      fc.property(
        buttonVariantArb,
        buttonSizeArb,
        booleanArb,
        booleanArb,
        (variant, size, disabled, loading) => {
          const { container, unmount } = render(
            <Button
              variant={variant}
              size={size}
              disabled={disabled}
              loading={loading}
            >
              Test
            </Button>
          );

          const button = container.querySelector('button');
          expect(button).not.toBeNull();
          assertFocusRingClasses(button!.className);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Input includes focus ring classes for any prop combination', () => {
    /**
     * Validates: Requirements 11.5, 4.5
     *
     * For any valid combination of Input props (label, error, disabled, loading),
     * the rendered input element should include all required focus ring classes.
     */
    fc.assert(
      fc.property(
        optionalStringArb,
        optionalStringArb,
        booleanArb,
        booleanArb,
        (label, error, disabled, loading) => {
          const { container, unmount } = render(
            <Input
              label={label}
              error={error}
              disabled={disabled}
              loading={loading}
              placeholder="Test input"
            />
          );

          const input = container.querySelector('input');
          expect(input).not.toBeNull();
          assertFocusRingClasses(input!.className);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Select includes focus ring classes for any prop combination', () => {
    /**
     * Validates: Requirements 11.5, 4.5
     *
     * For any valid combination of Select props (label, error, disabled, loading,
     * options), the rendered select element should include all required focus
     * ring classes.
     */
    fc.assert(
      fc.property(
        optionalStringArb,
        optionalStringArb,
        booleanArb,
        booleanArb,
        selectOptionsArb,
        (label, error, disabled, loading, options) => {
          const { container, unmount } = render(
            <Select
              label={label}
              error={error}
              disabled={disabled}
              loading={loading}
              options={options}
            />
          );

          const select = container.querySelector('select');
          expect(select).not.toBeNull();
          assertFocusRingClasses(select!.className);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
