'use client';

import { useState, useEffect } from 'react';
import { useOnboardingContext } from './OnboardingProvider';

interface FirstActionTooltipProps {
  /** The target element to attach the tooltip to (wraps children) */
  children: React.ReactNode;
}

/**
 * Wraps the deploy button with a one-shot pulse animation and tooltip.
 * Disappears permanently after the first roll.
 */
export function FirstActionTooltip({ children }: FirstActionTooltipProps) {
  const { isOnboardingComplete, hasFirstRoll } = useOnboardingContext();
  const [showTooltip, setShowTooltip] = useState(false);

  // Show tooltip only after onboarding is complete and before first roll
  useEffect(() => {
    if (isOnboardingComplete && !hasFirstRoll) {
      const timer = setTimeout(() => setShowTooltip(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowTooltip(false);
    }
  }, [isOnboardingComplete, hasFirstRoll]);

  if (!showTooltip) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Pulse ring behind the button */}
      <div className="absolute inset-0 rounded-lg animate-first-action-pulse pointer-events-none" />

      {children}

      {/* Tooltip */}
      <div
        role="tooltip"
        className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-800 border border-yellow-500/30 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg pointer-events-none"
      >
        Tap here to deploy your first operator
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-r border-b border-yellow-500/30 rotate-45 -mt-1" />
      </div>
    </div>
  );
}
