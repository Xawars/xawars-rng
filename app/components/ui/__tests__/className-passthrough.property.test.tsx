import { render } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import { Button } from '../Button';
import { Input } from '../Input';
import { Select } from '../Select';
import { Modal } from '../Modal';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { Spinner } from '../Spinner';
import { EmptyState } from '../EmptyState';
import { ErrorBanner } from '../ErrorBanner';

/**
 * Feature: design-system, Property 5: className Prop Passthrough
 *
 * Validates: Requirements 12.1
 *
 * For any core component (Button, Input, Select, Modal, Badge, Card, Spinner,
 * EmptyState, ErrorBanner) and for any valid CSS class string passed as the
 * className prop, that class string should appear in the rendered component's
 * class attribute without overriding the component's base styles.
 */
describe('Feature: design-system, Property 5: className Prop Passthrough', () => {
  // Generate valid CSS class names: lowercase letters, digits, and hyphens (3-20 chars)
  const classNameArb = fc.stringMatching(/^[a-z][a-z0-9-]{2,19}$/);

  const noop = () => {};

  it('Button passes className through and retains base styles', () => {
    /**
     * Validates: Requirements 12.1
     */
    fc.assert(
      fc.property(classNameArb, (customClass) => {
        const { container } = render(
          <Button className={customClass}>Test</Button>
        );
        const button = container.querySelector('button')!;
        const classes = button.className;

        // Custom class is present
        expect(classes).toContain(customClass);

        // Base styles are retained
        expect(classes).toContain('inline-flex');
        expect(classes).toContain('uppercase');
        expect(classes).toContain('tracking-wider');
      }),
      { numRuns: 100 }
    );
  });

  it('Input passes className through and retains base styles', () => {
    /**
     * Validates: Requirements 12.1
     */
    fc.assert(
      fc.property(classNameArb, (customClass) => {
        const { container } = render(
          <Input className={customClass} />
        );
        const input = container.querySelector('input')!;
        const classes = input.className;

        // Custom class is present
        expect(classes).toContain(customClass);

        // Base styles are retained
        expect(classes).toContain('bg-zinc-800/50');
        expect(classes).toContain('border-2');
        expect(classes).toContain('rounded-md');
      }),
      { numRuns: 100 }
    );
  });

  it('Select passes className through and retains base styles', () => {
    /**
     * Validates: Requirements 12.1
     */
    fc.assert(
      fc.property(classNameArb, (customClass) => {
        const { container } = render(
          <Select
            className={customClass}
            options={[{ value: 'a', label: 'A' }]}
          />
        );
        const select = container.querySelector('select')!;
        const classes = select.className;

        // Custom class is present
        expect(classes).toContain(customClass);

        // Base styles are retained
        expect(classes).toContain('bg-zinc-800');
        expect(classes).toContain('rounded-lg');
      }),
      { numRuns: 100 }
    );
  });

  it('Modal passes className through and retains base styles', () => {
    /**
     * Validates: Requirements 12.1
     */
    fc.assert(
      fc.property(classNameArb, (customClass) => {
        const { container } = render(
          <Modal isOpen={true} onClose={noop} className={customClass}>
            <p>Content</p>
          </Modal>
        );
        const dialog = container.querySelector('[role="dialog"]')!;
        const classes = dialog.className;

        // Custom class is present
        expect(classes).toContain(customClass);

        // Base styles are retained
        expect(classes).toContain('bg-zinc-800');
        expect(classes).toContain('rounded-xl');
        expect(classes).toContain('shadow-lg');
      }),
      { numRuns: 100 }
    );
  });

  it('Badge passes className through and retains base styles', () => {
    /**
     * Validates: Requirements 12.1
     */
    fc.assert(
      fc.property(classNameArb, (customClass) => {
        const { container } = render(
          <Badge className={customClass}>Tag</Badge>
        );
        const badge = container.querySelector('span')!;
        const classes = badge.className;

        // Custom class is present
        expect(classes).toContain(customClass);

        // Base styles are retained
        expect(classes).toContain('inline-flex');
        expect(classes).toContain('rounded-sm');
        expect(classes).toContain('uppercase');
      }),
      { numRuns: 100 }
    );
  });

  it('Card passes className through and retains base styles', () => {
    /**
     * Validates: Requirements 12.1
     */
    fc.assert(
      fc.property(classNameArb, (customClass) => {
        const { container } = render(
          <Card className={customClass}>Content</Card>
        );
        const card = container.firstElementChild!;
        const classes = card.className;

        // Custom class is present
        expect(classes).toContain(customClass);

        // Base styles are retained
        expect(classes).toContain('rounded-xl');
      }),
      { numRuns: 100 }
    );
  });

  it('Spinner passes className through and retains base styles', () => {
    /**
     * Validates: Requirements 12.1
     */
    fc.assert(
      fc.property(classNameArb, (customClass) => {
        const { container } = render(
          <Spinner className={customClass} />
        );
        const spinner = container.querySelector('[role="status"]')!;
        const classes = spinner.className;

        // Custom class is present
        expect(classes).toContain(customClass);

        // Base styles are retained
        expect(classes).toContain('inline-flex');
      }),
      { numRuns: 100 }
    );
  });

  it('EmptyState passes className through and retains base styles', () => {
    /**
     * Validates: Requirements 12.1
     */
    fc.assert(
      fc.property(classNameArb, (customClass) => {
        const { container } = render(
          <EmptyState className={customClass} />
        );
        const emptyState = container.firstElementChild!;
        const classes = emptyState.className;

        // Custom class is present
        expect(classes).toContain(customClass);

        // Base styles are retained
        expect(classes).toContain('border-2');
        expect(classes).toContain('border-dashed');
        expect(classes).toContain('rounded-xl');
      }),
      { numRuns: 100 }
    );
  });

  it('ErrorBanner passes className through and retains base styles', () => {
    /**
     * Validates: Requirements 12.1
     */
    fc.assert(
      fc.property(classNameArb, (customClass) => {
        const { container } = render(
          <ErrorBanner message="Test error" className={customClass} />
        );
        const banner = container.querySelector('[role="alert"]')!;
        const classes = banner.className;

        // Custom class is present
        expect(classes).toContain(customClass);

        // Base styles are retained
        expect(classes).toContain('rounded');
        expect(classes).toContain('border-red-500/30');
      }),
      { numRuns: 100 }
    );
  });
});
