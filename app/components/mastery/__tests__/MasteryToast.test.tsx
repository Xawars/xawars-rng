import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MasteryToastContainer,
  useMasteryToasts,
  MasteryToastItem,
} from '../MasteryToast';

// Helper component to test the hook
function TestHarness() {
  const { toasts, showToast, dismissToast } = useMasteryToasts();
  return (
    <div>
      <button
        onClick={() =>
          showToast({
            type: 'challenge_complete',
            challengeName: 'Win 3 Rounds',
            xpEarned: 45,
            masteryPointsEarned: 15,
          })
        }
      >
        Show Challenge Toast
      </button>
      <button
        onClick={() =>
          showToast({
            type: 'badge_unlock',
            operatorName: 'Ash',
            tier: 'Silver',
          })
        }
      >
        Show Badge Toast
      </button>
      <button
        onClick={() =>
          showToast({
            type: 'streak_milestone',
            streakLength: 7,
            bonusXp: 150,
          })
        }
      >
        Show Streak Toast
      </button>
      <MasteryToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

describe('MasteryToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('MasteryToastContainer', () => {
    it('renders nothing when toasts array is empty', () => {
      const { container } = render(
        <MasteryToastContainer toasts={[]} onDismiss={() => {}} />
      );
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.children).toHaveLength(0);
    });

    it('has an ARIA live region for screen reader announcements', () => {
      const { container } = render(
        <MasteryToastContainer toasts={[]} onDismiss={() => {}} />
      );
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-atomic', 'false');
      expect(liveRegion).toHaveAttribute('aria-relevant', 'additions');
    });

    it('renders challenge completion toast with correct content', () => {
      const toasts: MasteryToastItem[] = [
        {
          id: 'test-1',
          payload: {
            type: 'challenge_complete',
            challengeName: 'Deploy 5 Operators',
            xpEarned: 50,
            masteryPointsEarned: 25,
          },
          createdAt: Date.now(),
        },
      ];

      render(<MasteryToastContainer toasts={toasts} onDismiss={() => {}} />);

      expect(screen.getByText('Challenge Complete')).toBeInTheDocument();
      expect(screen.getByText('Deploy 5 Operators')).toBeInTheDocument();
      expect(screen.getByText('+50 XP')).toBeInTheDocument();
      expect(screen.getByText('+25 MP')).toBeInTheDocument();
    });

    it('renders badge unlock toast with operator name and tier', () => {
      const toasts: MasteryToastItem[] = [
        {
          id: 'test-2',
          payload: {
            type: 'badge_unlock',
            operatorName: 'Thermite',
            tier: 'Gold',
          },
          createdAt: Date.now(),
        },
      ];

      render(<MasteryToastContainer toasts={toasts} onDismiss={() => {}} />);

      expect(screen.getByText('Badge Unlocked')).toBeInTheDocument();
      expect(screen.getByText('Thermite')).toBeInTheDocument();
      expect(screen.getByText('Gold')).toBeInTheDocument();
    });

    it('renders streak milestone toast with streak length and bonus XP', () => {
      const toasts: MasteryToastItem[] = [
        {
          id: 'test-3',
          payload: {
            type: 'streak_milestone',
            streakLength: 30,
            bonusXp: 750,
          },
          createdAt: Date.now(),
        },
      ];

      render(<MasteryToastContainer toasts={toasts} onDismiss={() => {}} />);

      expect(screen.getByText('Streak Milestone')).toBeInTheDocument();
      expect(screen.getByText('30-day streak achieved')).toBeInTheDocument();
      expect(screen.getByText('+750 Bonus XP')).toBeInTheDocument();
    });

    it('renders multiple toasts simultaneously', () => {
      const toasts: MasteryToastItem[] = [
        {
          id: 'test-a',
          payload: {
            type: 'challenge_complete',
            challengeName: 'Win 3',
            xpEarned: 30,
            masteryPointsEarned: 15,
          },
          createdAt: Date.now(),
        },
        {
          id: 'test-b',
          payload: {
            type: 'badge_unlock',
            operatorName: 'Jager',
            tier: 'Bronze',
          },
          createdAt: Date.now(),
        },
      ];

      render(<MasteryToastContainer toasts={toasts} onDismiss={() => {}} />);

      expect(screen.getByText('Challenge Complete')).toBeInTheDocument();
      expect(screen.getByText('Badge Unlocked')).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      const toasts: MasteryToastItem[] = [
        {
          id: 'dismiss-test',
          payload: {
            type: 'challenge_complete',
            challengeName: 'Test',
            xpEarned: 10,
            masteryPointsEarned: 5,
          },
          createdAt: Date.now(),
        },
      ];

      render(<MasteryToastContainer toasts={toasts} onDismiss={onDismiss} />);

      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);

      // Wait for exit animation
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onDismiss).toHaveBeenCalledWith('dismiss-test');
    });

    it('auto-dismisses after 5 seconds', () => {
      const onDismiss = vi.fn();
      const toasts: MasteryToastItem[] = [
        {
          id: 'auto-dismiss-test',
          payload: {
            type: 'streak_milestone',
            streakLength: 3,
            bonusXp: 50,
          },
          createdAt: Date.now(),
        },
      ];

      render(<MasteryToastContainer toasts={toasts} onDismiss={onDismiss} />);

      // Should not dismiss before 5 seconds
      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(onDismiss).not.toHaveBeenCalled();

      // Should dismiss after 5 seconds + exit animation (300ms)
      act(() => {
        vi.advanceTimersByTime(301);
      });
      expect(onDismiss).toHaveBeenCalledWith('auto-dismiss-test');
    });

    it('has accessible dismiss button', () => {
      const toasts: MasteryToastItem[] = [
        {
          id: 'a11y-test',
          payload: {
            type: 'badge_unlock',
            operatorName: 'Mute',
            tier: 'Platinum',
          },
          createdAt: Date.now(),
        },
      ];

      render(<MasteryToastContainer toasts={toasts} onDismiss={() => {}} />);

      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton.tagName).toBe('BUTTON');
    });
  });

  describe('useMasteryToasts hook', () => {
    it('starts with empty toasts array', () => {
      render(<TestHarness />);
      // No toast content should be visible initially
      expect(screen.queryByText('Challenge Complete')).not.toBeInTheDocument();
      expect(screen.queryByText('Badge Unlocked')).not.toBeInTheDocument();
      expect(screen.queryByText('Streak Milestone')).not.toBeInTheDocument();
    });

    it('shows a challenge completion toast when triggered', () => {
      render(<TestHarness />);

      act(() => {
        fireEvent.click(screen.getByText('Show Challenge Toast'));
      });

      expect(screen.getByText('Challenge Complete')).toBeInTheDocument();
      expect(screen.getByText('Win 3 Rounds')).toBeInTheDocument();
      expect(screen.getByText('+45 XP')).toBeInTheDocument();
      expect(screen.getByText('+15 MP')).toBeInTheDocument();
    });

    it('shows a badge unlock toast when triggered', () => {
      render(<TestHarness />);

      act(() => {
        fireEvent.click(screen.getByText('Show Badge Toast'));
      });

      expect(screen.getByText('Badge Unlocked')).toBeInTheDocument();
      expect(screen.getByText('Ash')).toBeInTheDocument();
      expect(screen.getByText('Silver')).toBeInTheDocument();
    });

    it('shows a streak milestone toast when triggered', () => {
      render(<TestHarness />);

      act(() => {
        fireEvent.click(screen.getByText('Show Streak Toast'));
      });

      expect(screen.getByText('Streak Milestone')).toBeInTheDocument();
      expect(screen.getByText('7-day streak achieved')).toBeInTheDocument();
      expect(screen.getByText('+150 Bonus XP')).toBeInTheDocument();
    });

    it('can show multiple toasts', () => {
      render(<TestHarness />);

      act(() => {
        fireEvent.click(screen.getByText('Show Challenge Toast'));
        fireEvent.click(screen.getByText('Show Badge Toast'));
      });

      expect(screen.getByText('Challenge Complete')).toBeInTheDocument();
      expect(screen.getByText('Badge Unlocked')).toBeInTheDocument();
    });

    it('removes toast on dismiss', () => {
      render(<TestHarness />);

      act(() => {
        fireEvent.click(screen.getByText('Show Challenge Toast'));
      });

      expect(screen.getByText('Challenge Complete')).toBeInTheDocument();

      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);

      // Wait for exit animation
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByText('Challenge Complete')).not.toBeInTheDocument();
    });
  });
});
