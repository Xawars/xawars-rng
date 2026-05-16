import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validatePassword } from '../AuthContext';

// Mock supabase module
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

describe('validatePassword', () => {
  it('rejects empty string', () => {
    expect(validatePassword('')).toBe(false);
  });

  it('rejects password with 7 characters', () => {
    expect(validatePassword('1234567')).toBe(false);
  });

  it('accepts password with exactly 8 characters', () => {
    expect(validatePassword('12345678')).toBe(true);
  });

  it('accepts password with more than 8 characters', () => {
    expect(validatePassword('a-very-long-password-123')).toBe(true);
  });

  it('rejects single character', () => {
    expect(validatePassword('a')).toBe(false);
  });
});

describe('AuthContext signUp logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('returns error for password shorter than 8 characters without calling supabase', async () => {
    // We test the logic directly via the exported validatePassword + the context behavior
    // The context calls validatePassword before calling supabase
    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for loading to finish
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let authResult: { success: boolean; error?: string };
    await act(async () => {
      authResult = await result.current.signUp('test@example.com', 'short');
    });

    expect(authResult!.success).toBe(false);
    expect(authResult!.error).toBe('Password must be at least 8 characters long.');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls supabase signUp for valid password and returns success', async () => {
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
        session: { access_token: 'token', refresh_token: 'refresh', expires_at: 9999999999 },
      },
      error: null,
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let authResult: { success: boolean; error?: string };
    await act(async () => {
      authResult = await result.current.signUp('test@example.com', 'validpass123');
    });

    expect(authResult!.success).toBe(true);
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'test@example.com', password: 'validpass123' });
  });

  it('returns duplicate email error message', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', status: 422 },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let authResult: { success: boolean; error?: string };
    await act(async () => {
      authResult = await result.current.signUp('existing@example.com', 'validpass123');
    });

    expect(authResult!.success).toBe(false);
    expect(authResult!.error).toBe('An account with this email already exists. Try logging in instead.');
  });

  it('returns network error message on fetch failure', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Failed to fetch', status: 0 },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let authResult: { success: boolean; error?: string };
    await act(async () => {
      authResult = await result.current.signUp('test@example.com', 'validpass123');
    });

    expect(authResult!.success).toBe(false);
    expect(authResult!.error).toBe('Connection failed. Please check your internet and try again.');
  });
});

describe('AuthContext signIn logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('returns success on valid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
        session: { access_token: 'token', refresh_token: 'refresh', expires_at: 9999999999 },
      },
      error: null,
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let authResult: { success: boolean; error?: string };
    await act(async () => {
      authResult = await result.current.signIn('test@example.com', 'validpass123');
    });

    expect(authResult!.success).toBe(true);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'validpass123' });
  });

  it('returns generic invalid credentials error (no field-specific hint)', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let authResult: { success: boolean; error?: string };
    await act(async () => {
      authResult = await result.current.signIn('test@example.com', 'wrongpass');
    });

    expect(authResult!.success).toBe(false);
    expect(authResult!.error).toBe('Email or password is incorrect.');
  });

  it('returns network error on connection failure', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Failed to fetch', status: 0 },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let authResult: { success: boolean; error?: string };
    await act(async () => {
      authResult = await result.current.signIn('test@example.com', 'validpass123');
    });

    expect(authResult!.success).toBe(false);
    expect(authResult!.error).toBe('Connection failed. Please check your internet and try again.');
  });
});

describe('AuthContext isGuest flag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('isGuest is true when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isGuest).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('isGuest is false when session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          access_token: 'token',
          refresh_token: 'refresh',
          expires_at: 9999999999,
        },
      },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isGuest).toBe(false);
    expect(result.current.user).not.toBeNull();
    expect(result.current.session).not.toBeNull();
  });
});

describe('AuthContext signInWithOAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('calls supabase signInWithOAuth with google provider', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/...' }, error: null });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.signInWithOAuth('google');
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({ provider: 'google' });
  });

  it('calls supabase signInWithOAuth with discord provider', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://discord.com/oauth2/...' }, error: null });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.signInWithOAuth('discord');
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({ provider: 'discord' });
  });

  it('throws descriptive error when Google OAuth fails', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'OAuth provider error', status: 400 },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await expect(
      act(async () => {
        await result.current.signInWithOAuth('google');
      })
    ).rejects.toThrow('Login with google failed. Please try again or use email.');
  });

  it('throws descriptive error when Discord OAuth fails', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'OAuth provider error', status: 400 },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await expect(
      act(async () => {
        await result.current.signInWithOAuth('discord');
      })
    ).rejects.toThrow('Login with discord failed. Please try again or use email.');
  });

  it('does not throw when OAuth succeeds', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/...' }, error: null });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await expect(
      act(async () => {
        await result.current.signInWithOAuth('google');
      })
    ).resolves.not.toThrow();
  });
});


describe('AuthContext session management', () => {
  let authStateChangeCallback: (event: string, session: unknown) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authStateChangeCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  it('updates session tokens on TOKEN_REFRESHED event', async () => {
    // Start with an existing session
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          access_token: 'old-token',
          refresh_token: 'old-refresh',
          expires_at: 1000000,
        },
      },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Simulate TOKEN_REFRESHED event with new tokens
    act(() => {
      authStateChangeCallback('TOKEN_REFRESHED', {
        user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_at: 2000000,
      });
    });

    expect(result.current.session?.accessToken).toBe('new-token');
    expect(result.current.session?.refreshToken).toBe('new-refresh');
    expect(result.current.session?.expiresAt).toBe(2000000);
  });

  it('sets sessionExpired flag when SIGNED_OUT fires unexpectedly (session expiry)', async () => {
    // Start with an existing session
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          access_token: 'token',
          refresh_token: 'refresh',
          expires_at: 9999999999,
        },
      },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Verify user is authenticated
    expect(result.current.user).not.toBeNull();
    expect(result.current.sessionExpired).toBe(false);

    // Simulate unexpected SIGNED_OUT (session expiry)
    act(() => {
      authStateChangeCallback('SIGNED_OUT', null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.sessionExpired).toBe(true);
  });

  it('does NOT set sessionExpired when user explicitly signs out', async () => {
    // Start with an existing session
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          access_token: 'token',
          refresh_token: 'refresh',
          expires_at: 9999999999,
        },
      },
    });
    mockSignOut.mockResolvedValue({ error: null });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Explicitly sign out
    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.sessionExpired).toBe(false);
  });

  it('clears sessionExpired flag when user signs in again', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          access_token: 'token',
          refresh_token: 'refresh',
          expires_at: 9999999999,
        },
      },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Simulate session expiry
    act(() => {
      authStateChangeCallback('SIGNED_OUT', null);
    });

    expect(result.current.sessionExpired).toBe(true);

    // Simulate user signing in again
    act(() => {
      authStateChangeCallback('SIGNED_IN', {
        user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_at: 9999999999,
      });
    });

    expect(result.current.sessionExpired).toBe(false);
    expect(result.current.user).not.toBeNull();
  });

  it('clearSessionExpired resets the sessionExpired flag', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          access_token: 'token',
          refresh_token: 'refresh',
          expires_at: 9999999999,
        },
      },
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Simulate session expiry
    act(() => {
      authStateChangeCallback('SIGNED_OUT', null);
    });

    expect(result.current.sessionExpired).toBe(true);

    // Clear the flag
    act(() => {
      result.current.clearSessionExpired();
    });

    expect(result.current.sessionExpired).toBe(false);
  });

  it('maintains session across page refresh via getSession', async () => {
    const existingSession = {
      user: { id: '123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
      access_token: 'persisted-token',
      refresh_token: 'persisted-refresh',
      expires_at: 9999999999,
    };
    mockGetSession.mockResolvedValue({ data: { session: existingSession } });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider, useAuth } = await import('../AuthContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Session should be restored from getSession
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.id).toBe('123');
    expect(result.current.session?.accessToken).toBe('persisted-token');
    expect(result.current.isGuest).toBe(false);
  });
});
