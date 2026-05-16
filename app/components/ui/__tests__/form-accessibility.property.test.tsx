import { render, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { Input } from '../Input';
import { Select } from '../Select';

/**
 * Feature: design-system, Property 3: Error Accessibility Semantics
 *
 * Validates: Requirements 5.3, 12.5, 14.3
 *
 * For any non-empty error string passed to a form component (Input, Select),
 * the rendered output should include:
 * - An element with role="alert" containing the error text
 * - aria-invalid="true" on the associated input element
 * - An aria-describedby attribute on the input pointing to the error message element's id
 */
describe('Feature: design-system, Property 3: Error Accessibility Semantics', () => {
  /**
   * Arbitrary for generating non-empty error strings.
   * Uses printable characters to simulate realistic error messages.
   */
  const nonEmptyErrorArb = fc.string({ minLength: 1, maxLength: 100 }).filter(
    (s) => s.trim().length > 0
  );

  const selectOptions = [{ value: 'a', label: 'A' }];

  it('Input: error prop renders role="alert" element containing the error text', () => {
    /**
     * Validates: Requirements 5.3, 14.3
     */
    fc.assert(
      fc.property(nonEmptyErrorArb, (errorMessage) => {
        cleanup();

        const { container } = render(<Input error={errorMessage} />);

        const alertElement = container.querySelector('[role="alert"]');
        expect(alertElement).not.toBeNull();
        expect(alertElement!.textContent).toBe(errorMessage);

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('Input: error prop sets aria-invalid="true" on the input element', () => {
    /**
     * Validates: Requirements 12.5
     */
    fc.assert(
      fc.property(nonEmptyErrorArb, (errorMessage) => {
        cleanup();

        const { container } = render(<Input error={errorMessage} />);

        const inputElement = container.querySelector('input');
        expect(inputElement).not.toBeNull();
        expect(inputElement!.getAttribute('aria-invalid')).toBe('true');

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('Input: error prop sets aria-describedby pointing to the error element id', () => {
    /**
     * Validates: Requirements 5.3, 12.5
     */
    fc.assert(
      fc.property(nonEmptyErrorArb, (errorMessage) => {
        cleanup();

        const { container } = render(<Input error={errorMessage} />);

        const inputElement = container.querySelector('input');
        const alertElement = container.querySelector('[role="alert"]');

        expect(inputElement).not.toBeNull();
        expect(alertElement).not.toBeNull();

        const describedBy = inputElement!.getAttribute('aria-describedby');
        expect(describedBy).not.toBeNull();

        const errorId = alertElement!.getAttribute('id');
        expect(errorId).not.toBeNull();
        expect(describedBy).toBe(errorId);

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('Select: error prop renders role="alert" element containing the error text', () => {
    /**
     * Validates: Requirements 5.3, 14.3
     */
    fc.assert(
      fc.property(nonEmptyErrorArb, (errorMessage) => {
        cleanup();

        const { container } = render(
          <Select error={errorMessage} options={selectOptions} />
        );

        const alertElement = container.querySelector('[role="alert"]');
        expect(alertElement).not.toBeNull();
        expect(alertElement!.textContent).toBe(errorMessage);

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('Select: error prop sets aria-invalid="true" on the select element', () => {
    /**
     * Validates: Requirements 12.5
     */
    fc.assert(
      fc.property(nonEmptyErrorArb, (errorMessage) => {
        cleanup();

        const { container } = render(
          <Select error={errorMessage} options={selectOptions} />
        );

        const selectElement = container.querySelector('select');
        expect(selectElement).not.toBeNull();
        expect(selectElement!.getAttribute('aria-invalid')).toBe('true');

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it('Select: error prop sets aria-describedby pointing to the error element id', () => {
    /**
     * Validates: Requirements 5.3, 12.5
     */
    fc.assert(
      fc.property(nonEmptyErrorArb, (errorMessage) => {
        cleanup();

        const { container } = render(
          <Select error={errorMessage} options={selectOptions} />
        );

        const selectElement = container.querySelector('select');
        const alertElement = container.querySelector('[role="alert"]');

        expect(selectElement).not.toBeNull();
        expect(alertElement).not.toBeNull();

        const describedBy = selectElement!.getAttribute('aria-describedby');
        expect(describedBy).not.toBeNull();

        const errorId = alertElement!.getAttribute('id');
        expect(errorId).not.toBeNull();
        expect(describedBy).toBe(errorId);

        cleanup();
      }),
      { numRuns: 100 }
    );
  });
});
