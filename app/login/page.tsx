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
  if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
    return returnUrl;
  }
  return '/';
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-black font-sans">
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
      setTransitionPhase('out');
      transitionTimer.current = setTimeout(() => {
        setDisplayedMode(mode);
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black font-sans overflow-hidden">
        <div role="status" aria-label="Loading authentication" className="flex flex-col items-center gap-3">
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
    );
  }

  // Redirect in progress
  if (session) return null;

  // Signup success — verification message
  if (signupSuccess) {
    return (
      <div className="auth-shell">
        <AuthBackground />
        <div className="relative w-full max-w-sm min-w-[280px] space-y-5 text-center">
          <div className="flex flex-col items-center">
            <XAWarsLogo size={56} className="mb-2 drop-shadow-[0_0_12px_rgba(234,179,8,0.3)]" />
            <div className="mt-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-emerald-500/10">
              <svg
                className="h-7 w-7 text-emerald-400"
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

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-white">Check your inbox</h2>
            <p className="text-sm text-zinc-400">
              We sent a verification link to your email. Click the link to activate your account.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setSignupSuccess(false);
                setMode('login');
              }}
              className="inline-flex w-full items-center justify-center rounded bg-yellow-500 px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-yellow-500/20 transition-all duration-200 hover:bg-yellow-400 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
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

  // Main auth page
  return (
    <div className="auth-shell">
      <AuthBackground />

      <div className="relative w-full max-w-[360px] min-w-[280px] max-[480px]:max-w-[calc(100vw-32px)] flex flex-col">
        {/* Brand — compact */}
        <div className="flex flex-col items-center text-center mb-5">
          <XAWarsLogo size={52} className="mb-2 drop-shadow-[0_0_12px_rgba(234,179,8,0.3)]" />
          <h1 className="text-2xl font-bold uppercase tracking-wider text-yellow-500">
            XAWARS
          </h1>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-medium">
            Tactical Operator Roulette
          </p>
        </div>

        {/* Auth card */}
        <div className="auth-card">
          {/* Mode-dependent content with transition */}
          <div
            className={`space-y-4 transition-all ease-out ${
              transitionPhase === 'out'
                ? 'duration-150 opacity-0 translate-y-1 scale-[0.99]'
                : transitionPhase === 'in'
                ? 'duration-200 opacity-100 translate-y-0 scale-100'
                : 'duration-0 opacity-100 translate-y-0 scale-100'
            }`}
          >
            <p className="text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
              {displayedMode === 'login' ? 'Welcome back, Agent' : 'Create your account'}
            </p>

            {/* OAuth */}
            <OAuthButtonGroup
              onOAuthClick={handleOAuthClick}
              loadingProvider={oauthLoading}
              disabled={isSubmitting}
            />

            {/* Form */}
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
        </div>

        {/* Guest Mode — below the card */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              enableGuestMode();
              router.push(returnUrl);
            }}
            disabled={isSubmitting || oauthLoading !== null}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-black rounded disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue as Guest
          </button>
          <p className="mt-1 text-[10px] text-zinc-700">
            Local data only — no cloud sync
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Atmospheric background with subtle grid texture and radial glow.
 */
function AuthBackground() {
  return (
    <>
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(234,179,8,0.03) 0%, transparent 60%)',
        }}
      />
      {/* Grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </>
  );
}
