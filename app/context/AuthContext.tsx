'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { clearGuestMode } from '../components/auth/ProtectedRoute';
import type { AuthState, AuthResult, User, Session } from '../types/auth';

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, callsign?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithOAuth: (provider: 'google' | 'discord') => Promise<void>;
  signOut: () => Promise<void>;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const NETWORK_ERROR_MESSAGE = 'Connection failed. Please check your internet and try again.';
const INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect.';
const DUPLICATE_EMAIL_MESSAGE = 'An account with this email already exists. Try logging in instead.';

/**
 * Validates that a password meets the minimum length requirement.
 */
export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Maps Supabase auth errors to user-friendly messages.
 */
function mapAuthError(error: { message: string; status?: number }): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || error.status === 0) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  if (msg.includes('user already registered') || msg.includes('already been registered') || msg.includes('already exists')) {
    return DUPLICATE_EMAIL_MESSAGE;
  }

  // Fallback for unknown errors
  return error.message;
}

/**
 * Converts a Supabase user object to our User type.
 */
function mapSupabaseUser(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at?: string }): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    displayName: (supabaseUser.user_metadata?.display_name as string) ?? undefined,
    avatarUrl: (supabaseUser.user_metadata?.avatar_url as string) ?? undefined,
    createdAt: supabaseUser.created_at ?? new Date().toISOString(),
  };
}

/**
 * Converts a Supabase session to our Session type.
 */
function mapSupabaseSession(supabaseSession: { access_token: string; refresh_token: string; expires_at?: number }): Session {
  return {
    accessToken: supabaseSession.access_token,
    refreshToken: supabaseSession.refresh_token,
    expiresAt: supabaseSession.expires_at ?? 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Ref to track whether sign-out was explicitly triggered by the user
  const explicitSignOutRef = useRef(false);
  // Ref to track whether user was authenticated (for detecting session expiry)
  const wasAuthenticatedRef = useRef(false);

  const isGuest = session === null;

  // Keep the wasAuthenticated ref in sync with session state
  useEffect(() => {
    wasAuthenticatedRef.current = session !== null;
  }, [session]);

  // Initialize auth state from existing Supabase session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          setUser(mapSupabaseUser(existingSession.user));
          setSession(mapSupabaseSession(existingSession));
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'TOKEN_REFRESHED' && newSession) {
        // Token was successfully refreshed — update session tokens
        setUser(mapSupabaseUser(newSession.user));
        setSession(mapSupabaseSession(newSession));
      } else if (event === 'SIGNED_OUT') {
        // User signed out or session expired
        setUser(null);
        setSession(null);
        // If the user was previously authenticated and didn't explicitly sign out,
        // this indicates session expiry. We track this via a ref to distinguish
        // explicit sign-out from unexpected session loss.
        if (wasAuthenticatedRef.current && !explicitSignOutRef.current) {
          setSessionExpired(true);
        }
        explicitSignOutRef.current = false;
      } else if (event === 'SIGNED_IN' && newSession) {
        // User signed in — clear any session expired flag and guest mode
        setUser(mapSupabaseUser(newSession.user));
        setSession(mapSupabaseSession(newSession));
        setSessionExpired(false);
        clearGuestMode();
      } else if (newSession) {
        // Other events with a valid session (e.g., INITIAL_SESSION, USER_UPDATED)
        setUser(mapSupabaseUser(newSession.user));
        setSession(mapSupabaseSession(newSession));
      } else {
        // No session for other events
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, callsign?: string): Promise<AuthResult> => {
    if (!validatePassword(password)) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: callsign ? { data: { display_name: callsign } } : undefined,
      });

      if (error) {
        return { success: false, error: mapAuthError(error) };
      }

      if (data.user) {
        setUser(mapSupabaseUser(data.user));
      }
      if (data.session) {
        setSession(mapSupabaseSession(data.session));
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: NETWORK_ERROR_MESSAGE };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { success: false, error: mapAuthError(error) };
      }

      if (data.user) {
        setUser(mapSupabaseUser(data.user));
      }
      if (data.session) {
        setSession(mapSupabaseSession(data.session));
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: NETWORK_ERROR_MESSAGE };
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'discord'): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({ provider });

    if (error) {
      throw new Error(`Login with ${provider} failed. Please try again or use email.`);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    explicitSignOutRef.current = true;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSessionExpired(false);
  }, []);

  const clearSessionExpired = useCallback((): void => {
    setSessionExpired(false);
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isGuest,
    sessionExpired,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    clearSessionExpired,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
