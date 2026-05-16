'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  validateLoginForm,
  validateSignupForm,
  type ValidationErrors,
} from '@/app/lib/form-validator';

export interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (email: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  serverError: string | null;
  onFieldChange: () => void;
}

export function AuthForm({
  mode,
  onSubmit,
  isSubmitting,
  serverError,
  onFieldChange,
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Reset form state when mode changes
  useEffect(() => {
    setEmail('');
    setPassword('');
    setValidationErrors({});
  }, [mode]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    onFieldChange();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    onFieldChange();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validate = mode === 'login' ? validateLoginForm : validateSignupForm;
    const errors = validate(email, password);

    if (errors.email || errors.password) {
      setValidationErrors(errors);
      // Focus the first errored field
      if (errors.email) {
        emailRef.current?.focus();
      } else if (errors.password) {
        passwordRef.current?.focus();
      }
      return;
    }

    setValidationErrors({});
    await onSubmit(email, password);
  };

  const submitLabel = mode === 'login' ? 'Log In' : 'Sign Up';

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full space-y-5">
      {/* Email Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="auth-email"
          className="block text-sm font-medium text-zinc-300"
        >
          Email
        </label>
        <input
          ref={emailRef}
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={handleEmailChange}
          disabled={isSubmitting}
          aria-describedby={validationErrors.email ? 'email-error' : undefined}
          aria-invalid={!!validationErrors.email}
          className="w-full rounded border-2 border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 transition-colors duration-200 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="you@example.com"
        />
        {validationErrors.email && (
          <p id="email-error" className="text-sm text-red-400" role="alert">
            {validationErrors.email}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="auth-password"
          className="block text-sm font-medium text-zinc-300"
        >
          Password
        </label>
        <input
          ref={passwordRef}
          id="auth-password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={handlePasswordChange}
          disabled={isSubmitting}
          aria-describedby={
            validationErrors.password ? 'password-error' : undefined
          }
          aria-invalid={!!validationErrors.password}
          className="w-full rounded border-2 border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 transition-colors duration-200 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="••••••••"
        />
        {validationErrors.password && (
          <p id="password-error" className="text-sm text-red-400" role="alert">
            {validationErrors.password}
          </p>
        )}
      </div>

      {/* Server Error */}
      {serverError && (
        <div
          role="alert"
          className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {serverError}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded bg-yellow-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-yellow-500/20 transition-all duration-200 hover:bg-yellow-400 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {isSubmitting ? 'Please wait...' : submitLabel}
      </button>
    </form>
  );
}
