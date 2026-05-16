'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { AuthForm } from '@/app/components/auth/AuthForm';
import { OAuthButtonGroup } from '@/app/components/auth/OAuthButtonGroup';
import { ModeToggle, type AuthMode } from '@/app/components/auth/ModeToggle';
import { enableGuestMode } from '@/app/components/auth/ProtectedRoute';
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
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black font-sans">
          <div role="status" aria-label="Loading" className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-yellow-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-zinc-400">Loading...</span>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, session, signIn, signUp, signInWithOAuth } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [displayedMode, setDisplayedMode] = useState<AuthMode>('login');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'discord' | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const returnUrl = getSafeReturnUrl(searchParams.get('returnUrl'));

  // Two-phase transition: fade out → swap content → fade in
  useEffect(() => {
    if (mode !== displayedMode) {
      // Phase 1: fade out
      setTransitionPhase('out');
      transitionTimer.current = setTimeout(() => {
        // Swap content after fade-out completes
        setDisplayedMode(mode);
        // Phase 2: start faded-out, then fade in on next frame
        requestAnimationFrame(() => {
          setTransitionPhase('in');
          transitionTimer.current = setTimeout(() => {
            setTransitionPhase('idle');
          }, 250);
        });
      }, 150);
    }
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, [mode, displayedMode]);

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
    async (email: string, password: string, callsign?: string) => {
      setIsSubmitting(true);
      setServerError(null);

      try {
        const result = mode === 'login'
          ? await signIn(email, password)
          : await signUp(email, password, callsign);

        if (result.success) {
          if (mode === 'login') {
            router.push(returnUrl);
          } else {
            // Show verification message instead of redirecting
            setSignupSuccess(true);
          }
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

  // Signup success — show verification message
  if (signupSuccess) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-black px-4 py-8 lg:py-0 font-sans overflow-x-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(39,39,42,0.4) 0%, transparent 70%)',
          }}
        />
        <div className="relative w-full max-w-sm min-w-[280px] space-y-6 text-center">
          <div className="flex flex-col items-center">
            <XAWarsLogo size={72} className="mb-3 drop-shadow-[0_0_12px_rgba(234,179,8,0.3)]" />
            {/* Email icon */}
            <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-emerald-500/10">
              <svg
                className="h-8 w-8 text-emerald-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Check your inbox</h2>
            <p className="text-sm text-zinc-400">
              We sent a verification link to your email. Click the link to activate your account.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSignupSuccess(false);
                setMode('login');
              }}
              className="inline-flex w-full items-center justify-center rounded bg-yellow-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-yellow-500/20 transition-all duration-200 hover:bg-yellow-400 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              Back to Login
            </button>
            <p className="text-xs text-zinc-600">
              Didn&apos;t receive it? Check your spam folder.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render auth page
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black px-4 py-8 lg:py-0 font-sans overflow-x-hidden">
      {/* Subtle radial gradient for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(39,39,42,0.4) 0%, transparent 70%)',
        }}
      />
      <div className="relative w-full max-w-sm min-w-[280px] max-[480px]:max-w-[calc(100vw-32px)] space-y-5 sm:space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <XAWarsLogo size={72} className="mb-3 drop-shadow-[0_0_12px_rgba(234,179,8,0.3)] max-sm:scale-[0.8] max-sm:origin-center" />
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-yellow-500 min-h-[32px]">
            XAWARS
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-zinc-600">
            Rainbow Six Siege Tool
          </p>
        </div>

        {/* Mode-dependent content with fade/slide transition */}
        <div
          className={`space-y-6 transition-all ease-out ${
            transitionPhase === 'out'
              ? 'duration-150 opacity-0 translate-y-1 scale-[0.99]'
              : transitionPhase === 'in'
              ? 'duration-200 opacity-100 translate-y-0 scale-100'
              : 'duration-0 opacity-100 translate-y-0 scale-100'
          }`}
        >
          <p className="text-center text-sm text-zinc-500">
            {displayedMode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>

          {/* OAuth Buttons (primary — Discord prominent) */}
          <OAuthButtonGroup
            onOAuthClick={handleOAuthClick}
            loadingProvider={oauthLoading}
            disabled={isSubmitting}
          />

          {/* Auth Form */}
          <AuthForm
            mode={displayedMode}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
            serverError={serverError}
            onFieldChange={handleFieldChange}
          />

          {/* Mode Toggle */}
          <ModeToggle mode={displayedMode} onToggle={handleModeToggle} />
        </div>

        {/* Guest Mode */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              enableGuestMode();
              router.push(returnUrl);
            }}
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
