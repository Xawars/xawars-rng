'use client';

import { useRef, useEffect, useState } from 'react';

interface HotStreakIndicatorProps {
  streakCount: number;
  isActive: boolean;
}

/**
 * Purely decorative hot streak indicator.
 * Displays a flame banner with streak count when the user has 3+ consecutive kills.
 * Uses CSS transitions for entry/exit animations with interruption handling.
 * Has no effect on game logic, statistics, or persistence.
 */
export function HotStreakIndicator({ streakCount, isActive }: HotStreakIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animState, setAnimState] = useState<'hidden' | 'entering' | 'visible' | 'exiting'>(
    isActive ? 'visible' : 'hidden'
  );
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isActive) {
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = null;
      }

      setAnimState('entering');
      entryTimeoutRef.current = setTimeout(() => {
        setAnimState('visible');
        entryTimeoutRef.current = null;
      }, 400);
    } else {
      if (entryTimeoutRef.current) {
        clearTimeout(entryTimeoutRef.current);
        entryTimeoutRef.current = null;
      }

      setAnimState('exiting');
      exitTimeoutRef.current = setTimeout(() => {
        setAnimState('hidden');
        exitTimeoutRef.current = null;
      }, 200);
    }

    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      if (entryTimeoutRef.current) clearTimeout(entryTimeoutRef.current);
    };
  }, [isActive]);

  const getTransformStyles = (): React.CSSProperties => {
    switch (animState) {
      case 'hidden':
        return { transform: 'translateY(-8px) scale(0.8)', opacity: 0, maxHeight: 0 };
      case 'entering':
        return {
          transform: 'translateY(0) scale(1)',
          opacity: 1,
          maxHeight: '60px',
          transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease-out, max-height 300ms ease-out',
        };
      case 'visible':
        return { transform: 'translateY(0) scale(1)', opacity: 1, maxHeight: '60px' };
      case 'exiting':
        return {
          transform: 'translateY(-4px) scale(0.9)',
          opacity: 0,
          maxHeight: 0,
          transition: 'transform 200ms ease-in, opacity 150ms ease-in, max-height 200ms ease-in',
        };
    }
  };

  // Determine streak tier for visual escalation
  const tier = streakCount >= 10 ? 'legendary' : streakCount >= 7 ? 'epic' : streakCount >= 5 ? 'hot' : 'warm';

  const tierStyles = {
    warm: 'from-orange-500/10 to-transparent border-orange-500/30 text-orange-400',
    hot: 'from-orange-500/15 to-red-500/5 border-orange-500/40 text-orange-300',
    epic: 'from-red-500/15 to-orange-500/10 border-red-500/40 text-red-400',
    legendary: 'from-red-500/20 to-yellow-500/10 border-yellow-500/50 text-yellow-400',
  };

  const tierGlow = {
    warm: '',
    hot: 'shadow-[0_0_12px_rgba(249,115,22,0.15)]',
    epic: 'shadow-[0_0_16px_rgba(239,68,68,0.2)]',
    legendary: 'shadow-[0_0_20px_rgba(234,179,8,0.25)]',
  };

  return (
    <div
      ref={containerRef}
      className="overflow-hidden"
      style={{
        willChange: animState === 'entering' || animState === 'exiting' ? 'transform, opacity, max-height' : 'auto',
        ...getTransformStyles(),
      }}
      aria-label={`Hot streak: ${streakCount} kills`}
      role="status"
      aria-live="polite"
    >
      <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border bg-linear-to-r ${tierStyles[tier]} ${tierGlow[tier]}`}>
        <span className="text-base leading-none" aria-hidden="true">🔥</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${tier === 'legendary' ? 'text-yellow-400' : tier === 'epic' ? 'text-red-400' : 'text-orange-400'}`}>
          {streakCount} Kill Streak
        </span>
        {tier === 'legendary' && <span className="text-base leading-none" aria-hidden="true">🔥</span>}
      </div>
    </div>
  );
}

