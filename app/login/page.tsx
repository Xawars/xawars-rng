'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { AuthForm } from '@/app/components/auth/AuthForm';
import { OAuthButtonGroup } from '@/app/components/auth/OAuthButtonGroup';
import { ModeToggle, type AuthMode } from '@/app/components/auth/ModeToggle';
import { XAWarsLogo } from '@/app/components/XAWarsLogo';

/**
 * Validates that a returnUrl is a safe relative path.
 * Returns the URL if valid, or '/' as fallback.
 */
function getSafeReturnUrl(returnUrl: string | null): string {
  if (!returnUrl) return '/';
  // Must start with '/' and must NOT start with '//' (protocol-relative URL)
  if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
    return returnUrl;
  }
  return '/';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, session, signIn, signUp, signInWithOAuth } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'discord' | null>(null);

  const returnUrl = getSafeReturnUrl(searchParams.get('returnUrl'));

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && session) {
      router.push(returnUrl);
    }
  }, [isLoading, session, router, returnUrl]);

  const handleModeToggle = useCallback(() => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setServerError(null);
  }, []);

  const handleFieldChange = useCallback(() => {
    setServerError(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (email: string, password: string) => {
      setIsSubmitting(true);
      setServerError(null);

      try {
        const result = mode === 'login'
          ? await signIn(email, password)
          : await signUp(email, password);

        if (result.success) {
          router.push(returnUrl);
        } else {
          setServerError(result.error ?? 'An unexpected error occurred.');
        }
      } catch {
        setServerError('An unexpected error occurred.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [mode, signIn, signUp, router, returnUrl]
  );

  const handleOAuthClick = useCallback(
    async (provider: 'google' | 'discord') => {
      setOauthLoading(provider);
      setServerError(null);

      try {
        await signInWithOAuth(provider);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'OAuth login failed. Please try again.';
        setServerError(message);
        setOauthLoading(null);
      }
    },
    [signInWithOAuth]
  );

  // Loading state: show full-page loading indicator
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black font-sans overflow-x-hidden">
        <div
          role="status"
          aria-label="Loading authentication"
          className="flex flex-col items-center gap-3"
        >
          <svg
            className="animate-spin h-8 w-8 text-yellow-500"
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
          <span className="text-sm text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  // If session exists (redirect in progress), don't render the form
  if (session) {
    return null;
  }

  // Render auth page
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 font-sans overflow-x-hidden">
      <div className="w-full max-w-sm min-w-[280px] max-[480px]:max-w-[calc(100vw-32px)] space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <XAWarsLogo size={72} className="mb-3 drop-shadow-[0_0_12px_rgba(234,179,8,0.3)]" />
          <h1 className="text-3xl font-bold uppercase tracking-wider text-yellow-500 min-h-[32px]">
            XAWARS
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-zinc-600">
            RNG Operator Selector
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Auth Form */}
        <AuthForm
          mode={mode}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          serverError={serverError}
          onFieldChange={handleFieldChange}
        />

        {/* OAuth Buttons */}
        <OAuthButtonGroup
          onOAuthClick={handleOAuthClick}
          loadingProvider={oauthLoading}
          disabled={isSubmitting}
        />

        {/* Mode Toggle */}
        <ModeToggle mode={mode} onToggle={handleModeToggle} />

        {/* Guest Mode */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push(returnUrl)}
            disabled={isSubmitting || oauthLoading !== null}
            className="w-full rounded border border-zinc-700 bg-transparent px-4 py-3 text-sm font-medium text-zinc-400 transition-all duration-200 hover:border-zinc-500 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue as Guest
          </button>
          <p className="mt-2 text-center text-xs text-zinc-600">
            Your data will only be saved locally
          </p>
        </div>
      </div>
    </div>
  );
}
