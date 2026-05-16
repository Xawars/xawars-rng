import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import fc from 'fast-check';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = vi.fn(() => new URLSearchParams());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams(),
}));

// Mock AuthContext
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Import LoginPage after mocks are set up
import LoginPage from '@/app/login/page';

describe('Feature: login-signup-page, Property 8: Return URL preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isLoading: false,
      session: null,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
    });
  });

  /**
   * Validates: Requirements 1.4
   *
   * For any valid relative URL path provided as the returnUrl query parameter,
   * after successful authentication the page SHALL redirect to that exact path
   * instead of the default `/` route.
   */
  it('redirects to the returnUrl after successful login for any valid relative path', { timeout: 60000 }, async () => {
    // Generate valid relative URL paths: start with '/', not '//', contain path segments
    const validRelativePathArb = fc
      .array(
        fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter((s) => s.length > 0 && s.length <= 20),
        { minLength: 1, maxLength: 5 }
      )
      .map((segments) => '/' + segments.join('/'));

    await fc.assert(
      fc.asyncProperty(validRelativePathArb, async (returnUrl) => {
        cleanup();
        vi.clearAllMocks();

        mockSignIn.mockResolvedValue({ success: true });
        mockUseAuth.mockReturnValue({
          isLoading: false,
          session: null,
          signIn: mockSignIn,
          signUp: mockSignUp,
          signInWithOAuth: mockSignInWithOAuth,
        });

        // Set up search params with the returnUrl
        mockSearchParams.mockReturnValue(new URLSearchParams(`returnUrl=${returnUrl}`));

        render(<LoginPage />);

        // Fill in valid credentials
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);

        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /log in/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        // Verify router.push was called with the returnUrl
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(returnUrl);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('redirects to "/" when returnUrl is absent', { timeout: 30000 }, async () => {
    cleanup();
    vi.clearAllMocks();

    mockSignIn.mockResolvedValue({ success: true });
    mockUseAuth.mockReturnValue({
      isLoading: false,
      session: null,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
    });

    // No returnUrl in search params
    mockSearchParams.mockReturnValue(new URLSearchParams());

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: /log in/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('falls back to "/" for external or protocol-relative URLs in returnUrl', { timeout: 60000 }, async () => {
    /**
     * Validates: Requirements 1.4
     *
     * External URLs (not starting with '/') or protocol-relative URLs (starting with '//')
     * SHALL fall back to '/' for security.
     */
    const externalUrlArb = fc.oneof(
      // Protocol-relative URLs
      fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter((s) => s.length > 0 && s.length <= 20)
        .map((domain) => `//${domain}.com/path`),
      // Absolute URLs with protocol
      fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter((s) => s.length > 0 && s.length <= 20)
        .map((domain) => `https://${domain}.com`),
      // Relative paths without leading slash
      fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter((s) => s.length > 0 && s.length <= 20)
        .map((path) => `${path}/route`)
    );

    await fc.assert(
      fc.asyncProperty(externalUrlArb, async (externalUrl) => {
        cleanup();
        vi.clearAllMocks();

        mockSignIn.mockResolvedValue({ success: true });
        mockUseAuth.mockReturnValue({
          isLoading: false,
          session: null,
          signIn: mockSignIn,
          signUp: mockSignUp,
          signInWithOAuth: mockSignInWithOAuth,
        });

        // Set up search params with the external URL
        mockSearchParams.mockReturnValue(new URLSearchParams(`returnUrl=${encodeURIComponent(externalUrl)}`));

        render(<LoginPage />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);

        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        const submitButton = screen.getByRole('button', { name: /log in/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        // Should fall back to '/' for external URLs
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/');
        });
      }),
      { numRuns: 100 }
    );
  });

  it('redirects to returnUrl after successful signup for any valid relative path', { timeout: 60000 }, async () => {
    /**
     * Validates: Requirements 1.4
     *
     * The returnUrl preservation also applies to signup mode.
     */
    const validRelativePathArb = fc
      .array(
        fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter((s) => s.length > 0 && s.length <= 20),
        { minLength: 1, maxLength: 5 }
      )
      .map((segments) => '/' + segments.join('/'));

    await fc.assert(
      fc.asyncProperty(validRelativePathArb, async (returnUrl) => {
        cleanup();
        vi.clearAllMocks();

        mockSignUp.mockResolvedValue({ success: true });
        mockUseAuth.mockReturnValue({
          isLoading: false,
          session: null,
          signIn: mockSignIn,
          signUp: mockSignUp,
          signInWithOAuth: mockSignInWithOAuth,
        });

        mockSearchParams.mockReturnValue(new URLSearchParams(`returnUrl=${returnUrl}`));

        render(<LoginPage />);

        // Switch to signup mode
        const toggleButton = screen.getByRole('button', { name: /switch to signup mode/i });
        fireEvent.click(toggleButton);

        // Fill in valid credentials (password >= 8 chars for signup)
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);

        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /sign up/i });
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(returnUrl);
        });
      }),
      { numRuns: 100 }
    );
  });
});
