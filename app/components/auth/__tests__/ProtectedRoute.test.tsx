import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ProtectedRoute, getSafeRedirectPath } from '../ProtectedRoute';

// Mock next/navigation
const mockPush = vi.fn();
const mockPathname = vi.fn(() => '/dashboard');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

// Mock AuthContext
const mockUseAuth = vi.fn();

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('getSafeRedirectPath', () => {
  it('returns "/" for null input', () => {
    expect(getSafeRedirectPath(null)).toBe('/');
  });

  it('returns "/" for empty string', () => {
    expect(getSafeRedirectPath('')).toBe('/');
  });

  it('returns the path for valid relative paths', () => {
    expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(getSafeRedirectPath('/settings/profile')).toBe('/settings/profile');
    expect(getSafeRedirectPath('/')).toBe('/');
  });

  it('returns "/" for protocol-relative URLs (//)', () => {
    expect(getSafeRedirectPath('//evil.com')).toBe('/');
    expect(getSafeRedirectPath('//evil.com/path')).toBe('/');
  });

  it('returns "/" for absolute URLs', () => {
    expect(getSafeRedirectPath('https://evil.com')).toBe('/');
    expect(getSafeRedirectPath('http://evil.com/path')).toBe('/');
  });

  it('returns "/" for paths not starting with /', () => {
    expect(getSafeRedirectPath('dashboard')).toBe('/');
    expect(getSafeRedirectPath('relative/path')).toBe('/');
  });
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
  });

  it('shows loading indicator while auth state is loading', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      session: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Checking authentication')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      session: { accessToken: 'token', refreshToken: 'refresh', expiresAt: 9999 },
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to /login with returnUrl when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      session: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/login?returnUrl=%2Fdashboard');
  });

  it('redirects to /login without returnUrl when on root path', () => {
    mockPathname.mockReturnValue('/');
    mockUseAuth.mockReturnValue({
      isLoading: false,
      session: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('encodes special characters in returnUrl', () => {
    mockPathname.mockReturnValue('/path/with spaces');
    mockUseAuth.mockReturnValue({
      isLoading: false,
      session: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/login?returnUrl=%2Fpath%2Fwith%20spaces');
  });

  it('does not redirect while loading', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      session: null,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockPush).not.toHaveBeenCalled();
  });
});
