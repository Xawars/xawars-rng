'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateCallsign } from '../../lib/form-validator';
import { supabase } from '../../lib/supabase';

const CALLSIGN_PROMPTED_KEY = 'xawars_callsign_prompted';

interface SetCallsignModalProps {
  /** Called after the callsign is successfully set or the modal is dismissed */
  onComplete: () => void;
}

/**
 * One-time modal prompting existing users (who signed up without a callsign)
 * to set their display name.
 *
 * Shows only once — stores a localStorage flag on dismiss.
 */
export function SetCallsignModal({ onComplete }: SetCallsignModalProps) {
  const { user } = useAuth();
  const [callsign, setCallsign] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateCallsign(callsign);
    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: callsign.trim() },
      });

      if (updateError) {
        setError('Failed to save callsign. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Mark as prompted so it doesn't show again
      localStorage.setItem(CALLSIGN_PROMPTED_KEY, 'true');
      onComplete();
    } catch {
      setError('Connection failed. Please try again.');
      setIsSubmitting(false);
    }
  }, [callsign, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(CALLSIGN_PROMPTED_KEY, 'true');
    onComplete();
  }, [onComplete]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-70 bg-black/70 backdrop-blur-sm"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set your callsign"
        className="fixed z-80 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-[380px] p-6 animate-fade-in"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
          aria-label="Skip"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4">
            <User className="w-7 h-7 text-yellow-500" />
          </div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            Set Your Callsign
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Choose a name that other agents will see
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="relative flex items-center rounded border-2 border-zinc-700 bg-zinc-800/50 transition-colors duration-200 focus-within:border-yellow-500 focus-within:ring-2 focus-within:ring-yellow-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900">
              <span className="pl-4 text-zinc-500" aria-hidden="true">
                <svg className="h-[16px] w-[16px]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </span>
              <input
                ref={inputRef}
                type="text"
                value={callsign}
                onChange={(e) => {
                  setCallsign(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                maxLength={20}
                placeholder="e.g. Viper_X"
                aria-describedby={error ? 'callsign-modal-error' : 'callsign-modal-hint'}
                aria-invalid={!!error}
                className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {error ? (
              <p id="callsign-modal-error" className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : (
              <p id="callsign-modal-hint" className="text-xs text-zinc-600">
                3–20 characters. Letters, numbers, underscores, hyphens.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-yellow-500/20 transition-all duration-200 hover:bg-yellow-400 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Confirm Callsign'}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
          >
            Skip for now
          </button>
        </form>
      </div>
    </>
  );
}

/**
 * Returns true if the user needs to be prompted for a callsign.
 * Conditions: authenticated, no displayName, hasn't been prompted before.
 */
export function shouldPromptCallsign(user: { displayName?: string } | null, isGuest: boolean): boolean {
  if (!user || isGuest) return false;
  if (user.displayName) return false;
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CALLSIGN_PROMPTED_KEY) !== 'true';
}
