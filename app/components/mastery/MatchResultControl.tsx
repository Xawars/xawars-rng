'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, ShieldAlert, Skull, Lock, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { useMastery } from '../../context/MasteryContext';
import type { MatchResult } from '../../types/mastery';

// --- Constants ---

/** 10-minute mutability window in milliseconds. */
const MUTABILITY_WINDOW_MS = 10 * 60 * 1000;

// --- Props ---

export interface MatchResultControlProps {
  /** The deployment ID to report a match result for. */
  deploymentId: string;
  /** Optional initial result if already reported (for re-render scenarios). */
  initialResult?: MatchResult | null;
  /** Optional initial reported-at timestamp (ISO string) for the mutability window. */
  initialReportedAt?: string | null;
  /** Optional additional className. */
  className?: string;
}

// --- Helpers ---

/**
 * Compute the remaining time in the mutability window.
 * Returns milliseconds remaining, or 0 if the window has expired.
 */
function computeRemainingMs(reportedAt: string): number {
  const elapsed = Date.now() - new Date(reportedAt).getTime();
  return Math.max(0, MUTABILITY_WINDOW_MS - elapsed);
}

/**
 * Format milliseconds remaining into a human-readable string like "9m 45s" or "5m".
 */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0m';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0 && seconds > 0) return `${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

// --- Result Button Config ---

interface ResultOption {
  value: MatchResult;
  label: string;
  icon: typeof Trophy;
  activeColor: string;
  hoverColor: string;
  ringColor: string;
}

const RESULT_OPTIONS: ResultOption[] = [
  {
    value: 'win',
    label: 'Win',
    icon: Trophy,
    activeColor: 'bg-green-500/20 border-green-500/60 text-green-400',
    hoverColor: 'hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400',
    ringColor: 'focus:ring-green-500',
  },
  {
    value: 'loss',
    label: 'Loss',
    icon: Skull,
    activeColor: 'bg-red-500/20 border-red-500/60 text-red-400',
    hoverColor: 'hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400',
    ringColor: 'focus:ring-red-500',
  },
  {
    value: 'survived_round',
    label: 'Survived',
    icon: ShieldAlert,
    activeColor: 'bg-blue-500/20 border-blue-500/60 text-blue-400',
    hoverColor: 'hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400',
    ringColor: 'focus:ring-blue-500',
  },
];

// --- Component ---

/**
 * MatchResultControl provides a three-button interface for reporting match results
 * (Win / Loss / Survived) for a deployment.
 *
 * Features:
 * - Shows current result state with visual indicator
 * - Displays time remaining in the 10-minute mutability window
 * - Disables buttons after the mutability window expires
 * - Wires to MasteryContext via useMastery().reportMatchResult()
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */
export function MatchResultControl({
  deploymentId,
  initialResult = null,
  initialReportedAt = null,
  className = '',
}: MatchResultControlProps) {
  const { reportMatchResult } = useMastery();

  // Local state
  const [currentResult, setCurrentResult] = useState<MatchResult | null>(initialResult);
  const [reportedAt, setReportedAt] = useState<string | null>(initialReportedAt);
  const [remainingMs, setRemainingMs] = useState<number>(
    initialReportedAt ? computeRemainingMs(initialReportedAt) : MUTABILITY_WINDOW_MS
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived state
  const isLocked = currentResult !== null && remainingMs <= 0;
  const hasResult = currentResult !== null;
  const canChange = hasResult && remainingMs > 0;

  // --- Timer: countdown for the mutability window ---

  useEffect(() => {
    if (!reportedAt) return;

    // Update remaining time every second
    const updateRemaining = () => {
      const remaining = computeRemainingMs(reportedAt);
      setRemainingMs(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    updateRemaining();
    timerRef.current = setInterval(updateRemaining, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [reportedAt]);

  // --- Handle result selection ---

  const handleSelectResult = useCallback(
    async (result: MatchResult) => {
      // Don't allow selection if locked or already submitting
      if (isLocked || isSubmitting) return;

      // Don't re-submit the same result
      if (result === currentResult) return;

      setIsSubmitting(true);
      setError(null);

      try {
        const outcome = await reportMatchResult(deploymentId, result);

        if (outcome.applied) {
          const now = new Date().toISOString();
          setCurrentResult(result);
          // Only set reportedAt on first report (not on changes within the window)
          if (!reportedAt) {
            setReportedAt(now);
          }
        } else if (outcome.reason === 'outside_mutability_window') {
          setRemainingMs(0);
          setError('Result is locked — the 10-minute window has expired.');
        } else if (outcome.reason === 'no_change') {
          // No-op, result is already set
        } else {
          setError('Failed to save result. Please try again.');
        }
      } catch {
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [deploymentId, reportMatchResult, currentResult, reportedAt, isLocked, isSubmitting]
  );

  // --- Render ---

  const controlId = `match-result-control-${deploymentId}`;

  return (
    <Card variant="elevated" padding="sm" className={className}>
      <div
        role="group"
        aria-labelledby={`${controlId}-label`}
        className="space-y-3"
      >
        {/* Header: label + status */}
        <div className="flex items-center justify-between">
          <span
            id={`${controlId}-label`}
            className="text-xs font-bold uppercase tracking-widest text-zinc-400"
          >
            Match Result
          </span>

          {/* Status indicator */}
          {isLocked && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Lock className="w-3 h-3" aria-hidden="true" />
              <span>Result locked</span>
            </span>
          )}
          {canChange && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Clock className="w-3 h-3" aria-hidden="true" />
              <span aria-live="polite" aria-atomic="true">
                {formatTimeRemaining(remainingMs)} left
              </span>
            </span>
          )}
        </div>

        {/* Three-button control */}
        <div className="flex gap-2" role="radiogroup" aria-label="Match result options">
          {RESULT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = currentResult === option.value;
            const isDisabled = isLocked || isSubmitting;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${option.label}${isSelected ? ' (selected)' : ''}`}
                disabled={isDisabled}
                onClick={() => handleSelectResult(option.value)}
                className={`
                  flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-800
                  ${option.ringColor}
                  ${
                    isSelected
                      ? option.activeColor
                      : 'border-zinc-700 text-zinc-400'
                  }
                  ${
                    !isSelected && !isDisabled
                      ? option.hoverColor
                      : ''
                  }
                  ${
                    isDisabled && !isSelected
                      ? 'opacity-40 cursor-not-allowed'
                      : isDisabled && isSelected
                      ? 'cursor-default'
                      : 'cursor-pointer'
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 ${isSelected ? '' : ''}`}
                  aria-hidden="true"
                />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <p
            role="alert"
            className="text-xs text-red-400 mt-1"
          >
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
