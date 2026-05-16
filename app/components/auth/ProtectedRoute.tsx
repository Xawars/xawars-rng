'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

const GUEST_MODE_KEY = 'xawars_guest_mode';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Validates that a URL path is a safe relative path (not external).
 * Returns the path if valid, or '/' as fallback.
 */
export function getSafeRedirectPath(path: string | null): string {
  if (!path) return '/';
  // Must start with '/' and must NOT start with '//' (protocol-relative URL)
  if (path.startsWith('/') && !path.startsWith('//')) {
    return path;
  }
  return '/';
}

/**
 * Checks if guest mode is active (flag set in localStorage).
 */
export function isGuestMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(GUEST_MODE_KEY) === 'true';
}

/**
 * Activates guest mode by setting the localStorage flag.
 */
export function enableGuestMode(): void {
  localStorage.setItem(GUEST_MODE_KEY, 'true');
}

/**
 * Deactivates guest mode by removing the localStorage flag.
 */
export function clearGuestMode(): void {
  localStorage.removeItem(GUEST_MODE_KEY);
}

/**
 * A wrapper component that protects routes requiring authentication.
 * 
 * Access is granted if:
 * - The user has an active session (authenticated), OR
 * - Guest mode is enabled (localStorage flag)
 * 
 * When neither condition is met:
 * - Redirects to `/login?returnUrl=<original_path>`
 * - After successful auth on the login page, the user is redirected back
 * 
 * While auth state is loading, displays a loading indicator.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !session && !isGuestMode()) {
      const safePathname = getSafeRedirectPath(pathname);
      const loginUrl = safePathname === '/'
        ? '/login'
        : `/login?returnUrl=${encodeURIComponent(safePathname)}`;
      router.push(loginUrl);
    }
  }, [isLoading, session, pathname, router]);

  // Show loading indicator while auth state is being determined
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div
          role="status"
          aria-label="Checking authentication"
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

  // If not authenticated and not in guest mode, don't render (redirect in progress)
  if (!session && !isGuestMode()) {
    return null;
  }

  // Authenticated or guest mode — render the protected content
  return <>{children}</>;
}
