/**
 * Represents a user profile in the system.
 * Maps to `public.profiles` joined with Supabase auth metadata.
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

/**
 * Represents an active authentication session.
 */
export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * The current authentication state exposed by AuthContext.
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  sessionExpired: boolean;
}

/**
 * The result of an authentication operation (sign up, sign in).
 */
export interface AuthResult {
  success: boolean;
  error?: string;
}
