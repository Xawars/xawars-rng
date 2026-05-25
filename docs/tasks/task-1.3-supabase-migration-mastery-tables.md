# Task 1.3 — Supabase Migration for Operator Mastery Tables

## What Was Implemented

A single SQL migration file (`migrations/002_operator_mastery_tables.sql`) that provisions the entire persistence layer for the Operator Mastery MVP. It creates five new tables and adds one column to an existing table:

| Table | Purpose | PK Strategy |
|-------|---------|-------------|
| `challenges` | Stores daily, weekly, and operator mission challenges per user | UUID (auto-generated) |
| `operator_mastery` | Tracks per-operator mastery points and current tier | UUID + UNIQUE(user_id, operator_id) |
| `mastery_badges` | Records tier badges unlocked per operator | UUID + UNIQUE(user_id, operator_id, tier) |
| `mastery_streak` | Tracks daily-challenge-specific streak per user | user_id as PK (one row per user) |
| `match_results` | Records match outcomes per deployment | deployment_id as PK (one result per deployment) |
| `deployments` (altered) | Added nullable `match_result` column | Existing table |

All tables include:
- Row Level Security (RLS) enabled with owner-only policies
- CHECK constraints enforcing domain validity
- `updated_at` triggers (reusing the existing `public.update_updated_at()` function)
- Foreign key references with `ON DELETE CASCADE` to `profiles(id)`

---

## Why It Was Implemented

### Business Logic

The Operator Mastery system needs a durable persistence layer to:

1. **Track challenge lifecycle** — Challenges are generated, progress is incremented, and they are eventually completed, expired, or discarded. All of this state must survive page reloads, device switches, and network interruptions.

2. **Maintain per-operator progression** — Mastery Points are monotonically increasing counters that determine a player's tier on each operator. These must be persisted reliably and support max-merge conflict resolution during offline sync.

3. **Enforce idempotent rewards** — Badge unlocks use a `UNIQUE(user_id, operator_id, tier)` constraint so that sync replays of a tier-crossing event produce a `23505` duplicate key error, which the SyncQueue treats as success. This prevents double-awarding.

4. **Support the 10-minute mutability window** — Match results need a `reported_at` timestamp to compute whether the result can still be changed. The `updated_at` column enables latest-timestamp conflict resolution across devices.

5. **Enable streak idempotency** — The `run_id` + `bonuses_awarded_in_run` pattern ensures streak bonuses (50/150/750 XP at milestones 3/7/30) are awarded exactly once per continuous streak run, even under sync replays.

### Requirements Satisfied

| Requirement | What it mandates |
|-------------|-----------------|
| **12.1** | Persist mastery state changes within 5 seconds via SyncQueue |
| **15.4** | Mastery data lives in new tables; no existing schema is modified beyond the one `match_result` column on `deployments` |

### Why a Single Migration File?

All five tables are part of the same logical feature (Operator Mastery MVP) and have no circular dependencies. Shipping them as one atomic migration ensures:
- The schema is always in a consistent state (no partial mastery schema)
- Rollback is straightforward (drop all five tables + the column)
- The migration numbering stays clean (`002` after the initial `001`)

---

## How It Works

### Schema Architecture

```
profiles (existing)
    │
    ├── 1:N ──► challenges (new)
    │             └── Tracks daily/weekly/mission challenges with progress
    │
    ├── 1:N ──► operator_mastery (new)
    │             └── One row per operator, tracks points + tier
    │
    ├── 1:N ──► mastery_badges (new)
    │             └── One row per (operator, tier) badge unlock
    │
    ├── 1:1 ──► mastery_streak (new)
    │             └── Single row tracking daily challenge streak
    │
    └── deployments (existing)
          │
          ├── match_result column (new, nullable)
          │
          └── 1:1 ──► match_results (new)
                        └── Full match result with timestamps
```

### Table-by-Table Breakdown

#### `challenges`

The most complex table. Stores the full challenge definition and its mutable progress state.

**Key constraints:**
- `slot IN ('daily', 'weekly', 'mission')` — enforces the three-slot model
- `objective IN ('complete_deployments', 'win_rounds', 'survive_rounds', 'get_kills')` — valid objectives only
- `target_count BETWEEN 1 AND 50` — prevents zero-target or absurdly large challenges
- `operator_scope IN ('any', 'random_pool', 'specific_operator')` — valid scopes only
- `restriction_kind IN ('gadget_only', 'playstyle', 'loadout_limit')` — valid restriction types (nullable)
- `progress <= target_count` — progress can never exceed the goal
- `(xp_override IS NULL AND xp_override_reason IS NULL) OR (xp_override IS NOT NULL AND xp_override_reason IS NOT NULL)` — the paired-override invariant prevents orphan states at the DB level
- `xp_override BETWEEN 0 AND 10000` — bounds admin overrides

**Partial index:** `idx_challenges_user_active` indexes `(user_id, slot)` but only for rows where `completed_at IS NULL AND discarded_at IS NULL`. This makes "fetch active challenges for user" queries fast without indexing historical/completed challenges.

**Design decision — `operator_pool` as JSONB:** The operator pool is a string array of operator IDs (1–5 elements for `random_pool`, 1 for `specific_operator`, empty for `any`). JSONB was chosen over a junction table because:
- The pool is immutable after generation (never updated independently)
- Pool sizes are tiny (max 5 elements)
- A junction table would add complexity without query benefits

#### `operator_mastery`

Simple counter table. The `UNIQUE(user_id, operator_id)` constraint ensures one row per operator per user, enabling upsert-based writes.

**Design decision — `current_tier` as a stored column:** The tier could be computed from `mastery_points` on every read, but storing it:
- Avoids recomputing on every dashboard render
- Enables efficient "show all Diamond operators" queries
- Is kept consistent by the application layer (MasteryEngine always writes both fields together)

#### `mastery_badges`

The `UNIQUE(user_id, operator_id, tier)` constraint is the structural enforcement of the badge-uniqueness invariant. When the SyncQueue replays a badge-unlock event, the INSERT raises error code `23505` (unique violation), which the SyncQueue's conflict handler treats as a successful no-op.

**Design decision — no `updated_at` trigger:** Badges are write-once. Once unlocked, they are never modified. Adding an `updated_at` trigger would be dead code.

#### `mastery_streak`

Uses `user_id` as the primary key (not a separate UUID) because there's exactly one streak row per user. This simplifies upserts and avoids an unnecessary surrogate key.

**`run_id` and `bonuses_awarded_in_run`:** These two fields work together for idempotent bonus tracking:
- `run_id` is a UUID that changes every time the streak resets to zero
- `bonuses_awarded_in_run` is a JSONB array (subset of `[3, 7, 30]`) tracking which milestone bonuses have been awarded in the current run
- On sync replay: if the bonus length is already in the array, the `awardXP` call is skipped

#### `match_results`

Uses `deployment_id` as the primary key (one result per deployment). The 10-minute mutability window is enforced at the application layer by comparing `NOW() - reported_at` against 10 minutes.

**Design decision — separate table vs. column on `deployments`:** Both exist:
- `match_results` is the source of truth (has timestamps for mutability and sync)
- `deployments.match_result` is a denormalized convenience column for rendering the result chip in the deployment list without a JOIN

The two are kept consistent inside `MasteryContext.reportMatchResult`.

### Row Level Security Model

Every table uses the same policy pattern:

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_owner" ON public.<table>
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

This ensures:
- `SELECT` only returns rows where `user_id` matches the authenticated user
- `INSERT` only succeeds if `user_id` matches the authenticated user
- `UPDATE` and `DELETE` only affect the user's own rows
- No table is accessible without authentication (RLS is enabled, no permissive policies for anon)

### Auto-Updated Timestamps

Tables with mutable state (`challenges`, `operator_mastery`, `mastery_streak`, `match_results`) have a trigger:

```sql
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.<table>
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

This reuses the existing `public.update_updated_at()` function from migration 001, which sets `updated_at = NOW()` on every UPDATE. The SyncQueue uses `updated_at` for last-write-wins conflict resolution.

### Conflict Resolution Strategy

| Data type | Strategy | Enforced by |
|-----------|----------|-------------|
| Monotonic counters (mastery_points, progress) | Max-merge (keep larger value) | Application layer (MasteryContext) |
| Match results | Latest-timestamp wins | `updated_at` column + SyncQueue policy |
| Badge unlocks | UNIQUE constraint (duplicate = no-op) | Database constraint (23505 error) |
| Streak state | Latest-timestamp wins | `updated_at` column |

---

## How to Test It

### Automated Testing

This migration is a SQL schema definition — it doesn't have unit tests in the traditional sense. It's validated through:

1. **Successful execution** — The migration runs without errors in the Supabase SQL Editor
2. **Constraint enforcement** — Downstream property tests (Tasks 2.5, 2.6, 3.3, 5.6–5.9) exercise the constraints indirectly through the application layer
3. **Integration tests** — The MasteryContext persistence layer (Task 5.5) writes to these tables and validates that constraints hold

### Manual Testing — Running the Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Paste the contents of `migrations/002_operator_mastery_tables.sql`
4. Click **Run**
5. Verify no errors in the output

### Manual Testing — Verifying Table Creation

After running the migration, execute these verification queries:

```sql
-- Verify all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('challenges', 'operator_mastery', 'mastery_badges', 'mastery_streak', 'match_results');
-- Expected: 5 rows

-- Verify the new column on deployments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'deployments' AND column_name = 'match_result';
-- Expected: match_result | text | YES

-- Verify RLS is enabled on all new tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('challenges', 'operator_mastery', 'mastery_badges', 'mastery_streak', 'match_results');
-- Expected: all rows show rowsecurity = true

-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'challenges' AND indexname = 'idx_challenges_user_active';
-- Expected: 1 row

-- Verify unique constraints
SELECT constraint_name FROM information_schema.table_constraints
WHERE constraint_type = 'UNIQUE'
AND table_name IN ('operator_mastery', 'mastery_badges');
-- Expected: operator_mastery_user_id_operator_id_key, mastery_badges_user_id_operator_id_tier_key
```

### Manual Testing — Constraint Validation

Test that CHECK constraints reject invalid data:

```sql
-- Should FAIL: invalid slot
INSERT INTO public.challenges (user_id, slot, objective, target_count, operator_scope, xp_reward, mastery_point_reward)
VALUES ('00000000-0000-0000-0000-000000000001', 'invalid_slot', 'win_rounds', 5, 'any', 50, 25);
-- Expected: ERROR: new row violates check constraint

-- Should FAIL: target_count out of range
INSERT INTO public.challenges (user_id, slot, objective, target_count, operator_scope, xp_reward, mastery_point_reward)
VALUES ('00000000-0000-0000-0000-000000000001', 'daily', 'win_rounds', 100, 'any', 50, 25);
-- Expected: ERROR: new row violates check constraint (target_count BETWEEN 1 AND 50)

-- Should FAIL: progress exceeds target_count
INSERT INTO public.challenges (user_id, slot, objective, target_count, operator_scope, xp_reward, mastery_point_reward, progress)
VALUES ('00000000-0000-0000-0000-000000000001', 'daily', 'win_rounds', 5, 'any', 50, 25, 10);
-- Expected: ERROR: new row violates check constraint (progress <= target_count)

-- Should FAIL: orphan xp_override (override without reason)
INSERT INTO public.challenges (user_id, slot, objective, target_count, operator_scope, xp_reward, mastery_point_reward, xp_override)
VALUES ('00000000-0000-0000-0000-000000000001', 'daily', 'win_rounds', 5, 'any', 50, 25, 200);
-- Expected: ERROR: new row violates check constraint (paired override fields)

-- Should FAIL: invalid mastery tier
INSERT INTO public.operator_mastery (user_id, operator_id, current_tier)
VALUES ('00000000-0000-0000-0000-000000000001', 'sledge', 'Legendary');
-- Expected: ERROR: new row violates check constraint

-- Should FAIL: negative mastery points
INSERT INTO public.operator_mastery (user_id, operator_id, mastery_points)
VALUES ('00000000-0000-0000-0000-000000000001', 'sledge', -10);
-- Expected: ERROR: new row violates check constraint (mastery_points >= 0)

-- Should FAIL: invalid match result
INSERT INTO public.match_results (deployment_id, user_id, result)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'draw');
-- Expected: ERROR: new row violates check constraint

-- Should FAIL: invalid match_result on deployments
UPDATE public.deployments SET match_result = 'draw' WHERE id = '...';
-- Expected: ERROR: new row violates check constraint

-- Should SUCCEED: valid paired override
INSERT INTO public.challenges (user_id, slot, objective, target_count, operator_scope, xp_reward, mastery_point_reward, xp_override, xp_override_reason)
VALUES ('00000000-0000-0000-0000-000000000001', 'daily', 'win_rounds', 5, 'any', 50, 25, 200, 'Holiday event');
-- Expected: INSERT 0 1
```

### Manual Testing — Idempotent Badge Unlock

```sql
-- First insert succeeds
INSERT INTO public.mastery_badges (user_id, operator_id, tier)
VALUES ('00000000-0000-0000-0000-000000000001', 'sledge', 'Silver');
-- Expected: INSERT 0 1

-- Duplicate insert fails with unique violation (23505)
INSERT INTO public.mastery_badges (user_id, operator_id, tier)
VALUES ('00000000-0000-0000-0000-000000000001', 'sledge', 'Silver');
-- Expected: ERROR: duplicate key value violates unique constraint "mastery_badges_user_id_operator_id_tier_key"

-- Different tier for same operator succeeds
INSERT INTO public.mastery_badges (user_id, operator_id, tier)
VALUES ('00000000-0000-0000-0000-000000000001', 'sledge', 'Gold');
-- Expected: INSERT 0 1
```

### Manual Testing — RLS Enforcement

```sql
-- As user A, try to read user B's challenges
-- (This requires testing with two different authenticated sessions)

-- User A session:
SELECT * FROM public.challenges WHERE user_id = '<user_b_id>';
-- Expected: 0 rows (RLS blocks access to other users' data)

-- User A session:
INSERT INTO public.challenges (user_id, slot, objective, target_count, operator_scope, xp_reward, mastery_point_reward)
VALUES ('<user_b_id>', 'daily', 'win_rounds', 5, 'any', 50, 25);
-- Expected: ERROR: new row violates row-level security policy
```

---

## Scenarios and Practical Examples

### Scenario 1: New Player's First Daily Challenge

A player signs up and the Challenge_Engine generates their first daily challenge.

```sql
INSERT INTO public.challenges (
  user_id, slot, role, objective, target_count,
  restriction_kind, restriction_value,
  operator_scope, operator_pool,
  xp_reward, mastery_point_reward
) VALUES (
  'abc-123',           -- user_id
  'daily',             -- slot
  'Entry Fragger',     -- role
  'complete_deployments', -- objective
  3,                   -- target_count
  NULL,                -- no restriction
  NULL,
  'random_pool',       -- operator_scope
  '["ash", "zofia", "iana"]'::jsonb, -- operator_pool
  30,                  -- xp_reward (3 × 10)
  15                   -- mastery_point_reward (3 × 5)
);
```

The partial index `idx_challenges_user_active` immediately covers this row (since `completed_at` and `discarded_at` are both NULL), making "fetch active challenges" queries fast.

### Scenario 2: Challenge Progress Increment

The player deploys Ash (in the pool) and the application increments progress:

```sql
UPDATE public.challenges
SET progress = progress + 1
WHERE id = '<challenge_id>'
  AND completed_at IS NULL
  AND progress < target_count;
-- The CHECK (progress <= target_count) prevents overflow even if the app has a bug
```

### Scenario 3: Challenge Completion

Progress reaches `target_count`. The application sets `completed_at`:

```sql
UPDATE public.challenges
SET completed_at = NOW()
WHERE id = '<challenge_id>'
  AND completed_at IS NULL;  -- idempotency anchor
-- If this UPDATE affects 0 rows, the challenge was already completed (sync replay)
-- → awardXP is NOT called
```

### Scenario 4: Mastery Points Award After a Win

Player wins a round with Sledge. The application upserts mastery points:

```sql
INSERT INTO public.operator_mastery (user_id, operator_id, mastery_points, current_tier)
VALUES ('abc-123', 'sledge', 10, 'Bronze')
ON CONFLICT (user_id, operator_id)
DO UPDATE SET
  mastery_points = GREATEST(operator_mastery.mastery_points, EXCLUDED.mastery_points),
  current_tier = EXCLUDED.current_tier;
-- GREATEST implements max-merge for monotonic counters
```

### Scenario 5: Tier Crossing Triggers Badge Unlock

Sledge reaches 100 points (Silver tier). The application inserts a badge:

```sql
INSERT INTO public.mastery_badges (user_id, operator_id, tier)
VALUES ('abc-123', 'sledge', 'Silver')
ON CONFLICT (user_id, operator_id, tier) DO NOTHING;
-- If the badge already exists (sync replay), this is a no-op
-- The application treats "0 rows affected" as success
```

### Scenario 6: Match Result Reported and Changed Within Window

Player reports a win, then realizes it was actually a loss (within 10 minutes):

```sql
-- Initial report
INSERT INTO public.match_results (deployment_id, user_id, result)
VALUES ('deploy-456', 'abc-123', 'win');

-- Change within 10-minute window (application checks reported_at first)
UPDATE public.match_results
SET result = 'loss', updated_at = NOW()
WHERE deployment_id = 'deploy-456'
  AND NOW() - reported_at <= INTERVAL '10 minutes';
-- If 0 rows affected → window has closed, application rejects the change

-- Keep deployments.match_result in sync
UPDATE public.deployments
SET match_result = 'loss'
WHERE id = 'deploy-456';
```

### Scenario 7: Streak Milestone Bonus (Idempotent)

Player completes their 7th consecutive daily challenge:

```sql
UPDATE public.mastery_streak
SET
  current_streak = 7,
  longest_streak = GREATEST(longest_streak, 7),
  last_completed_date = CURRENT_DATE,
  bonuses_awarded_in_run = bonuses_awarded_in_run || '[7]'::jsonb
WHERE user_id = 'abc-123'
  AND NOT (bonuses_awarded_in_run @> '[7]'::jsonb);
-- If 0 rows affected → bonus 7 was already awarded in this run (sync replay)
-- → awardXP(150, 'mastery_streak_bonus') is NOT called
```

### Scenario 8: Streak Reset

Player misses a day. The streak resets:

```sql
UPDATE public.mastery_streak
SET
  current_streak = 0,
  run_id = gen_random_uuid(),          -- new run
  bonuses_awarded_in_run = '[]'::jsonb -- clear awarded bonuses
WHERE user_id = 'abc-123';
```

The new `run_id` means any future bonuses in this new run are tracked independently from the previous run.

### Scenario 9: Cross-Device Sync Conflict on Mastery Points

Player earns 10 points on Device A (offline) and 5 points on Device B (offline). Both sync:

```sql
-- Device A syncs first: mastery_points = 10
-- Device B syncs second with max-merge:
UPDATE public.operator_mastery
SET mastery_points = GREATEST(mastery_points, 15)  -- 10 + 5 = 15 from app logic
WHERE user_id = 'abc-123' AND operator_id = 'sledge';
```

The max-merge policy ensures points never decrease, even under concurrent writes.

### Scenario 10: User Account Deletion

When a user deletes their account, all mastery data is automatically cleaned up:

```sql
DELETE FROM auth.users WHERE id = 'abc-123';
-- CASCADE propagates to profiles → challenges, operator_mastery, mastery_badges, mastery_streak, match_results
-- All user data is removed in a single transaction
```

---

## File Locations

| File | Path |
|------|------|
| Migration file | `migrations/002_operator_mastery_tables.sql` |
| Migrations README | `migrations/README.md` |
| Design document (schema source) | `.kiro/specs/operator-mastery-mvp/design.md` |
| Task definition | `.kiro/specs/operator-mastery-mvp/tasks.md` (Task 1.3) |

---

## Dependencies

- **Prerequisites:**
  - Migration `001_initial_schema.sql` must be applied first (creates `profiles`, `deployments`, `update_updated_at()` function)
  - Supabase Auth must be configured (RLS policies reference `auth.uid()`)

- **Downstream consumers:**
  - `MasteryContext` (Task 5.1–5.5) — reads/writes all five tables via SyncQueue
  - `Challenge_Engine` (Task 2.1) — generates rows in `challenges`
  - `Mastery_Engine` (Task 3.1) — writes to `operator_mastery` and `mastery_badges`
  - Streak calculator (Task 3.2) — writes to `mastery_streak`
  - Match result reporting (Task 5.2) — writes to `match_results` and `deployments.match_result`

---

## Rollback Instructions

If you need to revert this migration:

```sql
-- Remove the new column from deployments
ALTER TABLE public.deployments DROP COLUMN IF EXISTS match_result;

-- Drop new tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.match_results CASCADE;
DROP TABLE IF EXISTS public.mastery_streak CASCADE;
DROP TABLE IF EXISTS public.mastery_badges CASCADE;
DROP TABLE IF EXISTS public.operator_mastery CASCADE;
DROP TABLE IF EXISTS public.challenges CASCADE;
```

This is a clean rollback — no existing data in other tables is affected.
