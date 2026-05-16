'use client';

import { useState, useEffect } from 'react';
import { useOnboardingContext } from './OnboardingProvider';

interface TacticalEntryProps {
  children: React.ReactNode;
  onComplete?: () => void;
}

/**
 * Cinematic entry animation wrapper.
 * Shows a brief tactical-style intro on first session load, then reveals the UI.
 * Respects prefers-reduced-motion by skipping the animation entirely.
 */
export function TacticalEntry({ children, onComplete }: TacticalEntryProps) {
  const { hasEntryPlayed, markEntryPlayed } = useOnboardingContext();
  const [phase, setPhase] = useState<'logo' | 'text' | 'reveal' | 'done'>('logo');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
  }, []);

  // If entry already played or reduced motion, skip immediately
  useEffect(() => {
    if (hasEntryPlayed || prefersReducedMotion) {
      setPhase('done');
      return;
    }

    // Phase timing: logo (800ms) → text (1000ms) → reveal (700ms) → done
    const logoTimer = setTimeout(() => setPhase('text'), 800);
    const textTimer = setTimeout(() => setPhase('reveal'), 1800);
    const doneTimer = setTimeout(() => {
      setPhase('done');
      markEntryPlayed();
      onComplete?.();
    }, 2500);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(textTimer);
      clearTimeout(doneTimer);
    };
  }, [hasEntryPlayed, prefersReducedMotion, markEntryPlayed, onComplete]);

  // Already played — just render children
  if (phase === 'done') {
    return <div className="animate-entry-reveal">{children}</div>;
  }

  return (
    <>
      {/* Entry overlay */}
      <div className="fixed inset-0 z-100 bg-black flex flex-col items-center justify-center transition-opacity duration-700"
        style={{ opacity: phase === 'reveal' ? 0 : 1, pointerEvents: phase === 'reveal' ? 'none' : 'auto' }}
      >
        {/* Logo */}
        <h1
          className={`text-4xl font-black uppercase italic tracking-tighter transition-all duration-500 ${
            phase === 'logo' || phase === 'text' || phase === 'reveal'
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95'
          }`}
        >
          <span className="text-yellow-500">Xawars</span>{' '}
          <span className="text-white">RNG</span>
        </h1>

        {/* Typed text */}
        <p
          className={`mt-4 font-mono text-sm uppercase tracking-[0.3em] text-zinc-400 transition-all duration-500 ${
            phase === 'text' || phase === 'reveal'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          Operator Standing By
        </p>

        {/* Subtle pulse ring */}
        <div
          className={`absolute w-32 h-32 rounded-full border border-yellow-500/20 transition-all duration-1000 ${
            phase === 'text' ? 'scale-100 opacity-100' : 'scale-150 opacity-0'
          }`}
        />
      </div>

      {/* Hidden children (pre-rendered for instant reveal) */}
      <div className="opacity-0 pointer-events-none" aria-hidden="true">
        {children}
      </div>
    </>
  );
}
