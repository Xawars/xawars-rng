'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useOnboardingContext } from './OnboardingProvider';

interface ProgressiveTipProps {
  /** Unique identifier for this tip */
  tipId: string;
  /** Whether the trigger condition is met */
  show: boolean;
  /** The tip message to display */
  message: string;
  /** Auto-dismiss after this many ms (default 5000, 0 to disable) */
  autoDismissMs?: number;
  /** Position relative to parent */
  position?: 'top' | 'bottom';
  /** Additional className */
  className?: string;
}

/**
 * A reusable milestone-based tip component.
 * Shows once when trigger condition is met, never repeats after dismissal.
 */
export function ProgressiveTip({
  tipId,
  show,
  message,
  autoDismissMs = 5000,
  position = 'bottom',
  className = '',
}: ProgressiveTipProps) {
  const { tipsDisabled, isTipDismissed, dismissTip } = useOnboardingContext();
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsFading(true);
    setTimeout(() => {
      setIsVisible(false);
      dismissTip(tipId);
    }, 200);
  }, [dismissTip, tipId]);

  // Show tip when trigger fires (if not already dismissed)
  useEffect(() => {
    if (show && !tipsDisabled && !isTipDismissed(tipId)) {
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [show, tipsDisabled, isTipDismissed, tipId]);

  // Auto-dismiss
  useEffect(() => {
    if (isVisible && autoDismissMs > 0) {
      const timer = setTimeout(handleDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoDismissMs, handleDismiss]);

  if (!isVisible) return null;

  const positionClasses = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute left-1/2 -translate-x-1/2 z-20 ${positionClasses} transition-opacity duration-200 ${
        isFading ? 'opacity-0' : 'opacity-100'
      } ${className}`}
    >
      <div className="flex items-center gap-2 bg-zinc-800 border border-yellow-500/20 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
        <span className="text-xs text-zinc-300">{message}</span>
        <button
          onClick={handleDismiss}
          className="text-zinc-500 hover:text-white transition-colors shrink-0 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
          aria-label="Dismiss tip"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
