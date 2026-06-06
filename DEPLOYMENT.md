# Deployment Guide — Dev & Prod Split

## Environment Architecture

| Branch | Vercel Environment | Supabase Project |
|--------|-------------------|-----------------|
| `main` | Production | XAWARS RNG PROD |
| `develop` or PRs | Preview | XAWARS RNG DEV |
| local | Development | XAWARS RNG DEV |

---

## Environment Variables

The app uses two env vars to connect to Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

### Local Development

Already configured in `.env.local` (gitignored), pointing to the DEV project:

```
NEXT_PUBLIC_SUPABASE_URL=https://rcmtyvqltnaofjkfwfua.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
```

### Vercel

Set environment variables in **Vercel Dashboard → Project → Settings → Environment Variables**:

- **Production** environment: set to PROD Supabase values
- **Preview** environment: set to DEV Supabase values
- **Development** environment: set to DEV Supabase values

This ensures:
- `main` branch deploys use PROD Supabase
- PR/preview deploys use DEV Supabase
- Local dev uses DEV Supabase (from `.env.local`)

---

## Setting Up the PROD Supabase Project

### 1. Create Schema

Run migrations against the PROD project's SQL Editor. If using the `migrations/` folder, run files in order. Otherwise, create tables manually:

- `profiles`
- `deployments`
- `operator_stats`
- `gamification`
- `achievements`

### 2. Enable RLS & Create Policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Deployments
CREATE POLICY "Users can insert their own deployments"
ON public.deployments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own deployments"
ON public.deployments FOR SELECT USING (auth.uid() = user_id);

-- Operator Stats
CREATE POLICY "Users can manage own operator stats"
ON public.operator_stats FOR ALL USING (auth.uid() = user_id);

-- Profiles
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

### 3. Grant API Access

```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
```

### 4. Set Up Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Secure the trigger function
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION update_updated_at() FROM public;
```

### 5. Configure Auth Providers

In PROD Supabase Dashboard → **Authentication → Providers**:

1. **Email**: Enable (already default)
2. **Discord**: Enable, add Client ID + Secret from Discord Developer Portal
3. **Google**: Enable, add Client ID + Secret from Google Cloud Console

### 6. Configure Auth URLs

In PROD Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://your-production-domain.com`
- **Redirect URLs**: Add your production domain (e.g. `https://xawars.vercel.app`)

### 7. OAuth Provider Redirect URIs

Update redirect URIs in each provider's developer console:

- **Discord Developer Portal** → OAuth2 → Redirects:
  `https://YOUR-PROD-PROJECT.supabase.co/auth/v1/callback`

- **Google Cloud Console** → OAuth 2.0 → Authorized redirect URIs:
  `https://YOUR-PROD-PROJECT.supabase.co/auth/v1/callback`

---

## Security Hardening (PROD)

```sql
-- Fix function search paths
ALTER FUNCTION public.update_updated_at() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- Revoke direct execution of internal functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM public;
```

Enable **Leaked Password Protection** in Authentication → Settings → Security.

---

## Deployment Checklist

- [ ] PROD Supabase: all tables created
- [ ] PROD Supabase: RLS enabled on all tables
- [ ] PROD Supabase: policies created
- [ ] PROD Supabase: API access granted
- [ ] PROD Supabase: `handle_new_user` trigger set up
- [ ] PROD Supabase: Auth providers configured (Discord, Google)
- [ ] PROD Supabase: Site URL and redirect URLs configured
- [ ] PROD Supabase: Security hardening applied
- [ ] Discord Developer Portal: PROD callback URL added
- [ ] Google Cloud Console: PROD callback URL added
- [ ] Vercel: Production env vars set
- [ ] Vercel: Preview env vars set to DEV values
- [ ] `.env.local` in `.gitignore`
- [ ] Deploy to Vercel and verify
- [ ] Test signup, login, OAuth, and deployment persistence in PROD

---

## Useful Commands

```bash
# Local development
npm run dev

# Build (uses .env.local)
npm run build

# Run tests
npm run test
```

---

## Notes

- Never commit `.env.local` or any file containing real keys
- PROD and DEV databases are completely separate — no shared data
- Schema changes should be applied to both projects (use migration files)
- OAuth credentials are per-environment (different apps or different redirect URIs)
