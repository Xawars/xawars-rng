'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

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
 * A wrapper component that protects routes requiring authentication.
 * 
 * When an unauthenticated user navigates to a protected route:
 * - Redirects to `/login?returnUrl=<original_path>`
 * - After successful auth on the login page, the user is redirected back
 * 
 * While auth state is loading, displays a loading indicator.
 * When authenticated, renders the children normally.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !session) {
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

  // If not authenticated, don't render children (redirect is in progress)
  if (!session) {
    return null;
  }

  // Authenticated — render the protected content
  return <>{children}</>;
}
