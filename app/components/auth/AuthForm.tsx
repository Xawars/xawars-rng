'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  validateLoginForm,
  validateSignupForm,
  type ValidationErrors,
} from '@/app/lib/form-validator';

type PasswordStrength = 'none' | 'weak' | 'fair' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 'none';
  if (password.length < 8) return 'weak';

  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;

  if (score <= 2) return 'fair';
  return 'strong';
}

const strengthConfig: Record<Exclude<PasswordStrength, 'none'>, { label: string; segments: number; color: string }> = {
  weak: { label: 'Weak', segments: 1, color: 'bg-red-500' },
  fair: { label: 'Fair', segments: 2, color: 'bg-yellow-500' },
  strong: { label: 'Strong', segments: 3, color: 'bg-emerald-500' },
};

export interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (email: string, password: string, callsign?: string) => Promise<void>;
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [callsign, setCallsign] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const callsignRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Reset form state when mode changes
  useEffect(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCallsign('');
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
    const errors = mode === 'login'
      ? validate(email, password)
      : validateSignupForm(email, password, callsign);

    // Check confirm password match in signup mode
    if (mode === 'signup' && !errors.password && password !== confirmPassword) {
      errors.password = 'Passwords do not match';
    }

    if (errors.email || errors.password || errors.callsign) {
      setValidationErrors(errors);
      // Focus the first errored field
      if (errors.callsign) {
        callsignRef.current?.focus();
      } else if (errors.email) {
        emailRef.current?.focus();
      } else if (errors.password) {
        // Focus confirm field if the mismatch is the issue
        if (password !== confirmPassword && password.length >= 8) {
          confirmPasswordRef.current?.focus();
        } else {
          passwordRef.current?.focus();
        }
      }
      return;
    }

    setValidationErrors({});
    await onSubmit(email, password, mode === 'signup' ? callsign.trim() : undefined);
  };

  const submitLabel = mode === 'login' ? 'Log In' : 'Sign Up';

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full space-y-5">
      {/* Callsign Field (signup only) */}
      {mode === 'signup' && (
        <div className="space-y-1.5">
          <label
            htmlFor="auth-callsign"
            className="block text-sm font-medium text-zinc-300"
          >
            Callsign
          </label>
          <div className="relative flex items-center rounded border-2 border-zinc-700 bg-zinc-800/50 transition-colors duration-200 focus-within:border-yellow-500 focus-within:ring-2 focus-within:ring-yellow-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900">
            <span className="pl-4 text-zinc-500" aria-hidden="true">
              <svg className="h-[16px] w-[16px]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </span>
            <input
              ref={callsignRef}
              id="auth-callsign"
              name="callsign"
              type="text"
              autoComplete="username"
              value={callsign}
              onChange={(e) => {
                setCallsign(e.target.value);
                onFieldChange();
              }}
              disabled={isSubmitting}
              aria-describedby={validationErrors.callsign ? 'callsign-error' : 'callsign-hint'}
              aria-invalid={!!validationErrors.callsign}
              maxLength={20}
              className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="e.g. Viper_X"
            />
          </div>
          {validationErrors.callsign ? (
            <p id="callsign-error" className="text-sm text-red-400" role="alert">
              {validationErrors.callsign}
            </p>
          ) : (
            <p id="callsign-hint" className="text-xs text-zinc-600">
              3–20 characters. Letters, numbers, underscores, hyphens.
            </p>
          )}
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="auth-email"
          className="block text-sm font-medium text-zinc-300"
        >
          Email
        </label>
        <div className="relative flex items-center rounded border-2 border-zinc-700 bg-zinc-800/50 transition-colors duration-200 focus-within:border-yellow-500 focus-within:ring-2 focus-within:ring-yellow-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900">
          <span className="pl-4 text-zinc-500" aria-hidden="true">
            <svg className="h-[16px] w-[16px]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </span>
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
            className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="you@example.com"
          />
        </div>
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
        <div className="relative flex items-center rounded border-2 border-zinc-700 bg-zinc-800/50 transition-colors duration-200 focus-within:border-yellow-500 focus-within:ring-2 focus-within:ring-yellow-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900">
          <span className="pl-4 text-zinc-500" aria-hidden="true">
            <svg className="h-[16px] w-[16px]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </span>
          <input
            ref={passwordRef}
            id="auth-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={handlePasswordChange}
            disabled={isSubmitting}
            aria-describedby={
              validationErrors.password ? 'password-error' : undefined
            }
            aria-invalid={!!validationErrors.password}
            className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isSubmitting}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="shrink-0 px-3 py-2 text-zinc-500 transition-colors duration-150 hover:text-zinc-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showPassword ? (
              <svg
                className="h-[18px] w-[18px]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg
                className="h-[18px] w-[18px]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        </div>
        {validationErrors.password && (
          <p id="password-error" className="text-sm text-red-400" role="alert">
            {validationErrors.password}
          </p>
        )}
        {/* Password Strength Indicator (signup only) */}
        {mode === 'signup' && password.length > 0 && (
          <PasswordStrengthIndicator password={password} />
        )}
      </div>

      {/* Confirm Password Field (signup only) */}
      {mode === 'signup' && (
        <div className="space-y-1.5">
          <label
            htmlFor="auth-confirm-password"
            className="block text-sm font-medium text-zinc-300"
          >
            Confirm Password
          </label>
          <div className="relative flex items-center rounded border-2 border-zinc-700 bg-zinc-800/50 transition-colors duration-200 focus-within:border-yellow-500 focus-within:ring-2 focus-within:ring-yellow-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900">
            <span className="pl-4 text-zinc-500" aria-hidden="true">
              <svg className="h-[16px] w-[16px]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </span>
            <input
              ref={confirmPasswordRef}
              id="auth-confirm-password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                onFieldChange();
              }}
              disabled={isSubmitting}
              aria-describedby={
                validationErrors.password === 'Passwords do not match'
                  ? 'confirm-password-error'
                  : undefined
              }
              aria-invalid={validationErrors.password === 'Passwords do not match'}
              className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>
          {validationErrors.password === 'Passwords do not match' && (
            <p id="confirm-password-error" className="text-sm text-red-400" role="alert">
              {validationErrors.password}
            </p>
          )}
          {/* Real-time match indicator */}
          {confirmPassword.length > 0 && password === confirmPassword && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-400">
              <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Passwords match
            </p>
          )}
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {serverError}
        </div>
      )}

      {/* Forgot Password (login only) */}
      {mode === 'login' && (
        <div className="text-right">
          <button
            type="button"
            disabled
            className="py-1 px-1 -mr-1 text-xs text-zinc-500 cursor-not-allowed hover:text-zinc-500"
            aria-label="Forgot password? (coming soon)"
            title="Coming soon"
          >
            Forgot password?
          </button>
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

      {/* Terms & Privacy (signup only) */}
      {mode === 'signup' && (
        <p className="text-center text-xs text-zinc-600">
          By signing up, you agree to our{' '}
          <a href="/terms" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-300 transition-colors">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-300 transition-colors">
            Privacy Policy
          </a>
          .
        </p>
      )}
    </form>
  );
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (strength === 'none') return null;

  const config = strengthConfig[strength];

  return (
    <div className="flex items-center gap-3 pt-1" aria-live="polite">
      {/* Segmented bar */}
      <div className="flex flex-1 gap-1">
        {[1, 2, 3].map((segment) => (
          <div
            key={segment}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              segment <= config.segments ? config.color : 'bg-zinc-700/50'
            }`}
          />
        ))}
      </div>
      {/* Label */}
      <span
        className={`text-xs font-medium transition-colors duration-300 ${
          strength === 'weak'
            ? 'text-red-400'
            : strength === 'fair'
            ? 'text-yellow-400'
            : 'text-emerald-400'
        }`}
      >
        {config.label}
      </span>
    </div>
  );
}
