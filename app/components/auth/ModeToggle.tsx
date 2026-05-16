'use client';

import React from 'react';

export type AuthMode = 'login' | 'signup';

interface ModeToggleProps {
  mode: AuthMode;
  onToggle: () => void;
}

export function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  const promptText =
    mode === 'login'
      ? "Don't have an account?"
      : 'Already have an account?';

  const actionText = mode === 'login' ? 'Sign up' : 'Log in';

  return (
    <div className="text-sm text-zinc-400 text-center" data-mode={mode}>
      <span className="text-zinc-500">
        {mode === 'login' ? 'Login' : 'Signup'} mode
      </span>
      <p className="mt-1">
        {promptText}{' '}
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Switch to ${mode === 'login' ? 'signup' : 'login'} mode`}
          className="font-semibold text-yellow-500 hover:text-yellow-400 underline underline-offset-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded"
        >
          {actionText}
        </button>
      </p>
    </div>
  );
}
