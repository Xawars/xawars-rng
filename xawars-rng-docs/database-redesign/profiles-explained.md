# The `profiles` Entity — Explained

**Related file:** [`pending/database-schema.md`](./database-schema.md)

---

## What is it?

`profiles` is your app's extension of Supabase's `auth.users` table. It stores app-specific user data that doesn't belong in the auth system.

---

## What Supabase gives you automatically (`auth.users`)

- `id` (uuid)
- `email`
- `encrypted_password`
- `created_at`
- OAuth metadata, tokens, confirmation status, etc.

You can't (and shouldn't) add custom columns to `auth.users` — it's managed by Supabase internally.

---

## What `profiles` adds

A public-facing table in your `public` schema that stores:

| Column | Purpose |
|--------|---------|
| id | Same UUID as `auth.users(id)`, foreign key |
| callsign | Display name visible to the app (e.g. "Viper_X") |
| avatar_url | Profile picture |
| created_at | When the profile was created |
| updated_at | Last modification timestamp |

Future candidates: rank, preferred platform, bio, linked accounts, etc.

---

## Why it exists

1. **Separation of concerns** — Supabase auth handles login. `profiles` handles identity within your app.
2. **RLS-friendly** — you can query it like any other table with row-level security policies.
3. **Uniqueness enforcement** — callsign uniqueness is enforced at the DB level (not just app logic).
4. **Public visibility** — other users could read someone's callsign without accessing auth internals (useful for leaderboards, rivalry profiles).
5. **Anchor for all user data** — all other tables (`deployments`, `operator_stats`, etc.) reference `profiles.id` via foreign key.

---

## How it relates to your current code

The `User` type in `app/types/auth.ts` already models this:

```ts
interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}
```

Currently this is pulled from `auth.users` metadata (`user_metadata.display_name`). A proper `profiles` table replaces that pattern.

---

## Auto-creation via trigger

The standard Supabase pattern is to auto-create a profile row when a user signs up:

```sql
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, callsign)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

This means every new signup automatically gets a `profiles` row — no extra API call needed from the client.

---

## Summary

```
auth.users (Supabase managed, private)
  └── profiles (your table, public schema, 1:1)
        └── All other user-owned tables FK here
```

Think of it as: **auth.users = "can this person log in?" / profiles = "who is this person in the app?"**
