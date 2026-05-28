'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Trophy, Award, Flame } from 'lucide-react';
import type { MasteryTier } from '../../types/mastery';

// --- Toast Types ---

export type MasteryToastType = 'challenge_complete' | 'badge_unlock' | 'streak_milestone';

export interface ChallengeCompletePayload {
  type: 'challenge_complete';
  challengeName: string;
  xpEarned: number;
  masteryPointsEarned: number;
}

export interface BadgeUnlockPayload {
  type: 'badge_unlock';
  operatorName: string;
  tier: MasteryTier;
}

export interface StreakMilestonePayload {
  type: 'streak_milestone';
  streakLength: number;
  bonusXp: number;
}

export type MasteryToastPayload =
  | ChallengeCompletePayload
  | BadgeUnlockPayload
  | StreakMilestonePayload;

export interface MasteryToastItem {
  id: string;
  payload: MasteryToastPayload;
  createdAt: number;
}

// --- Auto-dismiss duration ---
const AUTO_DISMISS_MS = 5000;

// --- Tier color mapping ---
const TIER_COLORS: Record<MasteryTier, string> = {
  Bronze: 'text-amber-600',
  Silver: 'text-zinc-300',
  Gold: 'text-yellow-400',
  Platinum: 'text-cyan-300',
  Diamond: 'text-purple-300',
};

const TIER_BORDER_COLORS: Record<MasteryTier, string> = {
  Bronze: 'border-amber-600/40',
  Silver: 'border-zinc-400/40',
  Gold: 'border-yellow-400/40',
  Platinum: 'border-cyan-300/40',
  Diamond: 'border-purple-300/40',
};

// --- Individual Toast Component ---

interface ToastItemProps {
  item: MasteryToastItem;
  onDismiss: (id: string) => void;
}

function ToastItem({ item, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Trigger enter animation on mount
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    // Set up auto-dismiss
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      clearTimeout(enterTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    // Wait for exit animation to complete before removing
    setTimeout(() => {
      onDismiss(item.id);
    }, 300);
  }, [item.id, onDismiss]);

  const { payload } = item;

  const transitionClasses = isExiting
    ? 'opacity-0 translate-x-full'
    : isVisible
      ? 'opacity-100 translate-x-0'
      : 'opacity-0 translate-x-full';

  return (
    <div
      role="status"
      className={`
        relative flex items-start gap-3 rounded-xl border bg-zinc-900 p-4 shadow-lg
        transition-all duration-300 ease-out
        ${transitionClasses}
        ${payload.type === 'badge_unlock' ? TIER_BORDER_COLORS[payload.tier] : 'border-zinc-700'}
        max-w-sm w-full
      `}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        {payload.type === 'challenge_complete' && (
          <Trophy className="w-5 h-5 text-yellow-400" aria-hidden="true" />
        )}
        {payload.type === 'badge_unlock' && (
          <Award className={`w-5 h-5 ${TIER_COLORS[payload.tier]}`} aria-hidden="true" />
        )}
        {payload.type === 'streak_milestone' && (
          <Flame className="w-5 h-5 text-orange-400" aria-hidden="true" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {payload.type === 'challenge_complete' && (
          <>
            <p className="text-sm font-bold text-white truncate">
              Challenge Complete
            </p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {payload.challengeName}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs font-bold text-yellow-400">
                +{payload.xpEarned} XP
              </span>
              <span className="text-xs font-bold text-cyan-400">
                +{payload.masteryPointsEarned} MP
              </span>
            </div>
          </>
        )}

        {payload.type === 'badge_unlock' && (
          <>
            <p className="text-sm font-bold text-white truncate">
              Badge Unlocked
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              <span className="text-zinc-300">{payload.operatorName}</span>
              {' reached '}
              <span className={`font-bold ${TIER_COLORS[payload.tier]}`}>
                {payload.tier}
              </span>
            </p>
          </>
        )}

        {payload.type === 'streak_milestone' && (
          <>
            <p className="text-sm font-bold text-white truncate">
              Streak Milestone
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {payload.streakLength}-day streak achieved
            </p>
            <span className="text-xs font-bold text-orange-400 mt-1 inline-block">
              +{payload.bonusXp} Bonus XP
            </span>
          </>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Progress bar for auto-dismiss countdown */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
        <div
          className="h-full bg-yellow-500/40 transition-all ease-linear"
          style={{
            width: isVisible && !isExiting ? '0%' : '100%',
            transitionDuration: isVisible && !isExiting ? `${AUTO_DISMISS_MS}ms` : '0ms',
          }}
        />
      </div>
    </div>
  );
}

// --- Toast Container Component ---

export interface MasteryToastContainerProps {
  toasts: MasteryToastItem[];
  onDismiss: (id: string) => void;
}

/**
 * Container that renders mastery toast notifications.
 * Positioned fixed at the top-right of the viewport.
 * Uses an ARIA live region so screen readers announce new toasts.
 */
export function MasteryToastContainer({ toasts, onDismiss }: MasteryToastContainerProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions"
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem item={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// --- Hook for managing toast state ---

let toastIdCounter = 0;

function generateToastId(): string {
  toastIdCounter += 1;
  return `mastery-toast-${toastIdCounter}-${Date.now()}`;
}

/**
 * Hook that manages mastery toast notifications.
 * Returns the current toasts array, a function to show new toasts,
 * and a dismiss handler.
 *
 * Usage:
 * ```tsx
 * const { toasts, showToast, dismissToast } = useMasteryToasts();
 *
 * showToast({ type: 'challenge_complete', challengeName: '...', xpEarned: 50, masteryPointsEarned: 25 });
 * showToast({ type: 'badge_unlock', operatorName: 'Ash', tier: 'Silver' });
 * showToast({ type: 'streak_milestone', streakLength: 7, bonusXp: 150 });
 *
 * return <MasteryToastContainer toasts={toasts} onDismiss={dismissToast} />;
 * ```
 */
export function useMasteryToasts() {
  const [toasts, setToasts] = useState<MasteryToastItem[]>([]);

  const showToast = useCallback((payload: MasteryToastPayload) => {
    const newToast: MasteryToastItem = {
      id: generateToastId(),
      payload,
      createdAt: Date.now(),
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
