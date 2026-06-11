import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { HotStreakIndicator } from '../HotStreakIndicator';

describe('HotStreakIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Flame icon rendering', () => {
    it('renders flame icon when isActive is true', () => {
      render(<HotStreakIndicator streakCount={5} isActive={true} />);
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('renders flame icon even when isActive is false (hidden via animation)', () => {
      render(<HotStreakIndicator streakCount={3} isActive={false} />);
      // The component is always in DOM but hidden via opacity/transform
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });
  });

  describe('Streak count display', () => {
    it('displays streak count correctly when active', () => {
      render(<HotStreakIndicator streakCount={7} isActive={true} />);
      expect(screen.getByText(/7 Kill Streak/)).toBeInTheDocument();
    });

    it('displays streak count of 3 (minimum hot streak threshold)', () => {
      render(<HotStreakIndicator streakCount={3} isActive={true} />);
      expect(screen.getByText(/3 Kill Streak/)).toBeInTheDocument();
    });

    it('displays large streak counts', () => {
      render(<HotStreakIndicator streakCount={42} isActive={true} />);
      expect(screen.getByText(/42 Kill Streak/)).toBeInTheDocument();
    });
  });

  describe('Entry animation', () => {
    it('applies entry animation styles when transitioning to active', () => {
      const { container } = render(<HotStreakIndicator streakCount={5} isActive={true} />);
      const indicator = container.firstElementChild as HTMLElement;

      // During entry animation, should have transition and be visible
      expect(indicator.style.transform).toContain('scale(1)');
      expect(indicator.style.opacity).toBe('1');
      expect(indicator.style.transition).toContain('400ms');
    });

    it('completes entry animation after 400ms timeout', () => {
      const { container } = render(<HotStreakIndicator streakCount={5} isActive={true} />);
      const indicator = container.firstElementChild as HTMLElement;

      act(() => {
        vi.advanceTimersByTime(400);
      });

      // After entry completes, should be visible without transition
      expect(indicator.style.transform).toContain('scale(1)');
      expect(indicator.style.opacity).toBe('1');
    });
  });

  describe('Exit animation', () => {
    it('applies exit animation styles when transitioning to inactive', () => {
      const { rerender, container } = render(
        <HotStreakIndicator streakCount={5} isActive={true} />
      );

      // Complete entry animation
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Transition to inactive
      rerender(<HotStreakIndicator streakCount={5} isActive={false} />);

      const indicator = container.firstElementChild as HTMLElement;
      // During exit animation, should animate out
      expect(indicator.style.opacity).toBe('0');
      expect(indicator.style.transition).toContain('200ms');
    });

    it('completes exit animation to hidden state after 200ms', () => {
      const { rerender, container } = render(
        <HotStreakIndicator streakCount={5} isActive={true} />
      );

      // Complete entry animation
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Transition to inactive
      rerender(<HotStreakIndicator streakCount={5} isActive={false} />);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      const indicator = container.firstElementChild as HTMLElement;
      // After exit completes, should be in hidden state
      expect(indicator.style.opacity).toBe('0');
    });
  });

  describe('Accessible aria-label', () => {
    it('contains dynamic streak count in aria-label', () => {
      render(<HotStreakIndicator streakCount={5} isActive={true} />);
      expect(screen.getByLabelText('Hot streak: 5 kills')).toBeInTheDocument();
    });

    it('updates aria-label when streak count changes', () => {
      const { rerender } = render(
        <HotStreakIndicator streakCount={3} isActive={true} />
      );
      expect(screen.getByLabelText('Hot streak: 3 kills')).toBeInTheDocument();

      rerender(<HotStreakIndicator streakCount={8} isActive={true} />);
      expect(screen.getByLabelText('Hot streak: 8 kills')).toBeInTheDocument();
    });

    it('has role="status" for live region announcements', () => {
      render(<HotStreakIndicator streakCount={4} isActive={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('No side effects on data', () => {
    it('does not call localStorage during render', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      render(<HotStreakIndicator streakCount={5} isActive={true} />);

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(getItemSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();

      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    });

    it('does not make fetch calls during render', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      render(<HotStreakIndicator streakCount={5} isActive={true} />);

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });
  });

  describe('Visual tier escalation', () => {
    it('shows warm tier styling for streak 3-4', () => {
      const { container } = render(<HotStreakIndicator streakCount={3} isActive={true} />);
      const inner = container.querySelector('.border');
      expect(inner?.className).toContain('border-orange-500/30');
    });

    it('shows hot tier styling for streak 5-6', () => {
      const { container } = render(<HotStreakIndicator streakCount={5} isActive={true} />);
      const inner = container.querySelector('.border');
      expect(inner?.className).toContain('border-orange-500/40');
    });

    it('shows epic tier styling for streak 7-9', () => {
      const { container } = render(<HotStreakIndicator streakCount={7} isActive={true} />);
      const inner = container.querySelector('.border');
      expect(inner?.className).toContain('border-red-500/40');
    });

    it('shows legendary tier styling for streak 10+', () => {
      const { container } = render(<HotStreakIndicator streakCount={10} isActive={true} />);
      const inner = container.querySelector('.border');
      expect(inner?.className).toContain('border-yellow-500/50');
    });

    it('shows double flame for legendary streaks', () => {
      render(<HotStreakIndicator streakCount={10} isActive={true} />);
      const flames = screen.getAllByText('🔥');
      expect(flames.length).toBe(2);
    });
  });

  describe('Property 3: Indicator display correctness', () => {
    it('for any counter >= 3, displayed text includes counter value and aria-label is correct', () => {
      fc.assert(
        fc.property(fc.integer({ min: 3, max: 1000 }), (streakCount) => {
          const { container, unmount } = render(
            <HotStreakIndicator streakCount={streakCount} isActive={true} />
          );

          // Visual display: the streak count is shown in the "X Kill Streak" text
          expect(screen.getByText(new RegExp(`${streakCount} Kill Streak`))).toBeInTheDocument();

          // Aria-label: format is "Hot streak: N kills"
          const indicator = container.querySelector('[aria-label]');
          expect(indicator).not.toBeNull();
          expect(indicator!.getAttribute('aria-label')).toBe(
            `Hot streak: ${streakCount} kills`
          );

          unmount();
        }),
        { numRuns: 100 }
      );
    });
  });
});
