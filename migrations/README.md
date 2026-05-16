# Database Migrations

## Overview

This folder contains SQL migrations for the XAWARS RNG Supabase database. Migrations are numbered sequentially and should be run in order via the Supabase SQL Editor.

## How to Run

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Paste the contents of the migration file
4. Click **Run**

> **Important:** Before running the migration, ensure you have enabled the auth providers you plan to use (Email, Google, Discord) in **Authentication → Providers**.

---

## Migration Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Creates all application tables, RLS policies, indexes, and triggers |

---

## Schema Diagram

```
auth.users (managed by Supabase)
    │
    ├── 1:1 ──► profiles
    ├── 1:N ──► deployments
    ├── 1:N ──► operator_stats (unique per operator)
    ├── 1:1 ──► gamification
    ├── 1:N ──► achievements (unique per achievement)
    ├── 1:N ──► ranked_stats (unique per platform)
    └── 1:N ──► content_ideas
```

All tables reference `auth.users(id)` with `ON DELETE CASCADE` — deleting a user removes all their data.

---

## Table Documentation

### `profiles`

Extends the built-in `auth.users` table with application-specific user data. A profile row is **automatically created** via a database trigger whenever a new user signs up (email or OAuth).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | References `auth.users(id)` |
| `email` | text | User's email address |
| `display_name` | text | Display name (from OAuth provider or user-set) |
| `avatar_url` | text | Profile picture URL (from OAuth provider) |
| `created_at` | timestamptz | When the profile was created |
| `updated_at` | timestamptz | Last modification timestamp |

**RLS Policies:** Users can only read and update their own profile.

**Trigger:** `on_auth_user_created` — automatically inserts a profile row when a user signs up, pulling `display_name` and `avatar_url` from the OAuth provider's metadata.

---

### `deployments`

Records each operator deployment from the roulette wheel. Used to display deployment history and feed into operator stats.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated unique ID |
| `user_id` | uuid (FK) | References `auth.users(id)` |
| `operator_id` | text | Internal operator identifier |
| `operator_name` | text | Human-readable operator name |
| `operator_side` | text | `'attacker'` or `'defender'` |
| `loadout` | jsonb | The randomized loadout (primary, secondary, gadget) |
| `match_type` | text | Match type (casual, ranked, unranked) |
| `platform` | text | Platform (PC, PlayStation, Xbox) |
| `target_kills` | int | Kill target for this deployment |
| `role` | text | Operator role category |
| `deployed_at` | timestamptz | When the deployment was rolled |
| `updated_at` | timestamptz | Last modification timestamp |

**RLS Policies:** Users can only access their own deployments.

**Indexes:** `user_id`, `(user_id, deployed_at DESC)` for efficient history queries.

---

### `operator_stats`

Aggregated per-operator statistics. One row per user + operator combination. Updated incrementally as deployments are recorded.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated unique ID |
| `user_id` | uuid (FK) | References `auth.users(id)` |
| `operator_id` | text | Internal operator identifier |
| `operator_name` | text | Human-readable operator name |
| `operator_side` | text | `'attacker'` or `'defender'` |
| `kills` | int | Total kills with this operator |
| `deaths` | int | Total deaths with this operator |
| `deployments` | int | Number of times this operator was deployed |
| `updated_at` | timestamptz | Last modification timestamp |

**Unique constraint:** `(user_id, operator_id)` — one stats row per operator per user.

**RLS Policies:** Users can only access their own stats.

---

### `gamification`

Tracks XP and streak data for gamification features. One row per user.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid (PK, FK) | References `auth.users(id)` |
| `total_xp` | int | Cumulative experience points |
| `current_streak` | int | Current consecutive-day streak |
| `longest_streak` | int | All-time longest streak |
| `last_active_date` | date | Last date the user was active (for streak calculation) |
| `updated_at` | timestamptz | Last modification timestamp |

**RLS Policies:** Users can only access their own gamification data.

---

### `achievements`

Records which achievements a user has unlocked. One row per user + achievement combination.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated unique ID |
| `user_id` | uuid (FK) | References `auth.users(id)` |
| `achievement_id` | text | Achievement identifier (matches app-side achievement definitions) |
| `unlocked_at` | timestamptz | When the achievement was earned |

**Unique constraint:** `(user_id, achievement_id)` — prevents duplicate unlocks.

**RLS Policies:** Users can only access their own achievements.

---

### `ranked_stats`

Stores ranked mode statistics per platform. The `data` column holds the full `RankedStats` JSON structure (wins, losses, rank progress, MMR, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated unique ID |
| `user_id` | uuid (FK) | References `auth.users(id)` |
| `platform` | text | Platform identifier (PC, PlayStation, Xbox) |
| `data` | jsonb | Full ranked stats object |
| `updated_at` | timestamptz | Last modification timestamp |

**Unique constraint:** `(user_id, platform)` — one stats row per platform per user.

**RLS Policies:** Users can only access their own ranked stats.

---

### `content_ideas`

Stores content ideas generated by the AI content generator tool. Tags and platforms are stored as JSONB arrays for flexible querying.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated unique ID |
| `user_id` | uuid (FK) | References `auth.users(id)` |
| `title` | text | Content idea title |
| `description` | text | Detailed description or notes |
| `tags` | jsonb | Array of tag strings (e.g., `["tips", "ranked"]`) |
| `platforms` | jsonb | Array of target platforms (e.g., `["youtube", "tiktok"]`) |
| `created_at` | timestamptz | When the idea was generated |
| `updated_at` | timestamptz | Last modification timestamp |

**RLS Policies:** Users can only access their own content ideas.

---

## Security Model

All tables use **Row Level Security (RLS)**. The policies ensure:

- Users can only read, insert, update, and delete their own rows
- The `auth.uid()` function (provided by Supabase) identifies the current user
- No table is accessible without authentication
- `ON DELETE CASCADE` on all foreign keys ensures clean user deletion

## Auto-Updated Timestamps

Every table with an `updated_at` column has a trigger (`set_updated_at`) that automatically sets the value to `now()` on every UPDATE. This is used by the app's sync queue for conflict resolution (last-write-wins based on `updated_at`).

## Future Migrations

When adding new tables or modifying existing ones, create a new file with the next sequential number:

```
002_add_user_preferences.sql
003_add_map_stats.sql
```

Always include `enable row level security` and appropriate policies for new tables.
