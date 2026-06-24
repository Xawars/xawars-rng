# Login/Signup Page — Pending Improvements

**Related files:**
- [`app/login/page.tsx`](../app/login/page.tsx)
- [`app/components/auth/AuthForm.tsx`](../app/components/auth/AuthForm.tsx)
- [`app/context/AuthContext.tsx`](../app/context/AuthContext.tsx)

## Functional Gaps

1. **Password reset / forgot password** — no link or flow. Users who forget their password are stuck.
2. **"Remember me" option** — not critical with session tokens, but some users expect it.
3. **Rate limiting feedback** — if Supabase rate-limits login attempts, the generic error won't tell the user to wait.

## UX Polish

4. **No `prefers-reduced-motion` respect** — the scan line animation and mode transitions run even for users who opt out of motion. Fix: wrap the keyframe in `@media (prefers-reduced-motion: no-preference)`.
5. ~~**No password visibility toggle**~~ — already implemented in `AuthForm`.
6. **No loading skeleton for the auth card** — the Suspense fallback is a spinner; a skeleton of the card shape would feel snappier.

## Bugs

7. **Timer leak on unmount during transition** — if `LoginPageContent` unmounts mid-transition, the `requestAnimationFrame` inside the timeout still fires after cleanup, causing a stale state update. Minor, but technically a React warning in strict mode.
8. **`signInWithOAuth` doesn't catch network failures** — if the fetch itself fails (user is offline), the error propagates unhandled. The `handleOAuthClick` catch will get it, but the error message will be generic.

## Security

9. **Email enumeration on signup** — distinct "already exists" error reveals which emails are registered. Low priority for a gaming tool, but could be tightened by returning the same response regardless. Supabase default behavior.
10. **Confirm PKCE is active for OAuth** — Supabase JS v2+ uses PKCE by default. Worth a quick check that you're not on a legacy config that falls back to implicit flow.

## Code Quality

11. **Password confirm validation uses string matching** — `validationErrors.password === 'Passwords do not match'` to decide which field shows the error. If the message text ever changes, the confirm field won't highlight. Should use a separate `confirmPassword` key in `ValidationErrors`.
12. **`handleSubmit` not wrapped in `useCallback`** — recreates every render. Not a perf issue at this scale but inconsistent with the other handlers.
13. **Callsign field `autoComplete="username"`** — technically correct per spec, but causes some password managers to offer odd autofill suggestions. Consider `autoComplete="off"` or `autoComplete="nickname"`.
