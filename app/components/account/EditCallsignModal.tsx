'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Pencil, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateCallsign } from '../../lib/form-validator';
import { supabase } from '../../lib/supabase';

interface EditCallsignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal for editing the user's callsign (display name).
 * Pre-fills with the current value and updates via Supabase.
 */
export function EditCallsignModal({ isOpen, onClose }: EditCallsignModalProps) {
  const { user } = useAuth();
  const [callsign, setCallsign] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill with current display name when modal opens
  useEffect(() => {
    if (isOpen) {
      setCallsign(user?.displayName || '');
      setError(null);
      setSuccess(false);
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user?.displayName]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = callsign.trim();

    // If unchanged, just close
    if (trimmed === (user?.displayName || '')) {
      onClose();
      return;
    }

    const validationError = validateCallsign(trimmed);
    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: trimmed },
      });

      if (updateError) {
        setError('Failed to update callsign. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      // Brief success state then close
      setTimeout(() => {
        onClose();
        // Force a page reload to pick up the new metadata in AuthContext
        window.location.reload();
      }, 600);
    } catch {
      setError('Connection failed. Please try again.');
      setIsSubmitting(false);
    }
  }, [callsign, user?.displayName, onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-70 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit callsign"
        className="fixed z-80 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-[380px] p-6 animate-fade-in"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4">
            <Pencil className="w-6 h-6 text-yellow-500" />
          </div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            Edit Callsign
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Change how you appear in the app
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
                  setSuccess(false);
                }}
                disabled={isSubmitting || success}
                maxLength={20}
                placeholder="e.g. Viper_X"
                aria-describedby={error ? 'edit-callsign-error' : 'edit-callsign-hint'}
                aria-invalid={!!error}
                className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {error ? (
              <p id="edit-callsign-error" className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : (
              <p id="edit-callsign-hint" className="text-xs text-zinc-600">
                3–20 characters. Letters, numbers, underscores, hyphens.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || success}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-yellow-500/20 transition-all duration-200 hover:bg-yellow-400 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {success ? '✓ Saved' : isSubmitting ? 'Saving...' : 'Save Callsign'}
          </button>
        </form>
      </div>
    </>
  );
}
