import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { WinLossPrompt } from '../WinLossPrompt';
import { upsertMapWinLoss } from '../../lib/win-loss-logic';
import type { MapWinLossRecord } from '../../types/database';

const defaultProps = {
  mapId: 'bank',
  mapName: 'Bank',
  onWin: vi.fn(),
  onLoss: vi.fn(),
  onDismiss: vi.fn(),
};

function renderPrompt(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<WinLossPrompt {...props} />);
}

describe('WinLossPrompt', () => {
  describe('Won/Lost buttons appear after map confirm', () => {
    it('renders both Won and Lost buttons', () => {
      renderPrompt();
      expect(screen.getByText('Won')).toBeInTheDocument();
      expect(screen.getByText('Lost')).toBeInTheDocument();
    });
  });

  describe('Buttons remain visible until action taken', () => {
    it('buttons are visible in the DOM before any interaction', () => {
      renderPrompt();
      const wonButton = screen.getByText('Won');
      const lostButton = screen.getByText('Lost');
      expect(wonButton).toBeVisible();
      expect(lostButton).toBeVisible();
    });
  });

  describe('Button colors', () => {
    it('Won button uses green color', () => {
      renderPrompt();
      const wonButton = screen.getByText('Won');
      expect(wonButton.className).toContain('green');
    });

    it('Lost button uses red color', () => {
      renderPrompt();
      const lostButton = screen.getByText('Lost');
      expect(lostButton.className).toContain('red');
    });
  });

  describe('Accessible labels', () => {
    it('Won button has aria-label "Record map win"', () => {
      renderPrompt();
      expect(screen.getByLabelText('Record map win')).toBeInTheDocument();
    });

    it('Lost button has aria-label "Record map loss"', () => {
      renderPrompt();
      expect(screen.getByLabelText('Record map loss')).toBeInTheDocument();
    });
  });

  describe('Dismiss does not modify records', () => {
    it('clicking X button calls onDismiss, not onWin or onLoss', () => {
      const onWin = vi.fn();
      const onLoss = vi.fn();
      const onDismiss = vi.fn();
      renderPrompt({ onWin, onLoss, onDismiss });

      const dismissButton = screen.getByLabelText('Dismiss win/loss prompt');
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onWin).not.toHaveBeenCalled();
      expect(onLoss).not.toHaveBeenCalled();
    });

    it('clicking backdrop calls onDismiss, not onWin or onLoss', () => {
      const onWin = vi.fn();
      const onLoss = vi.fn();
      const onDismiss = vi.fn();
      const { container } = renderPrompt({ onWin, onLoss, onDismiss });

      // The backdrop is the outermost div with the dialog role
      const backdrop = container.querySelector('[role="dialog"]') as HTMLElement;
      fireEvent.click(backdrop);

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onWin).not.toHaveBeenCalled();
      expect(onLoss).not.toHaveBeenCalled();
    });
  });

  describe('Property 11: Failed persistence preserves state', () => {
    it('upsertMapWinLoss does not mutate the original records object', () => {
      /**
       * **Validates: Requirements 7.5**
       *
       * Property 11: For any MapWinLossRecords state, calling upsertMapWinLoss
       * returns a new state object while preserving the original state unchanged.
       * This guarantees that if persistence fails, the pre-operation state remains intact.
       */
      const mapWinLossRecordArb = fc.record({
        mapId: fc.string({ minLength: 1, maxLength: 20 }),
        wins: fc.nat({ max: 500 }),
        losses: fc.nat({ max: 500 }),
      });

      const recordsArb = fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        mapWinLossRecordArb,
        { minKeys: 0, maxKeys: 10 }
      );

      const outcomeArb = fc.constantFrom('win' as const, 'loss' as const);
      const mapIdArb = fc.string({ minLength: 1, maxLength: 20 });

      fc.assert(
        fc.property(recordsArb, mapIdArb, outcomeArb, (records, mapId, outcome) => {
          // Deep clone to have a pristine copy for comparison
          const originalSnapshot = JSON.parse(JSON.stringify(records));

          // Call upsert — this simulates the operation before persistence
          upsertMapWinLoss(records, mapId, outcome);

          // Original records must be unchanged (not mutated)
          expect(records).toEqual(originalSnapshot);
        }),
        { numRuns: 100 }
      );
    });
  });
});
