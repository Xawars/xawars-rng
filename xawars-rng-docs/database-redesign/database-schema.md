# Database Schema — Clean Slate Design (v2)

**Target:** Supabase (PostgreSQL)
**Vision:** Long-term learning platform for Rainbow Six Siege

---

## Entity Map

### Core Domain — Game Data (admin-managed)

| Entity | Description |
|--------|-------------|
| operators | All R6S operators with metadata |
| weapons | All weapons |
| operator_weapons | Join: operators ↔ weapons |
| gadgets | Secondary gadgets |
| operator_gadgets | Join: operators ↔ gadgets |
| maps | All competitive maps |
| map_sites | Bomb sites per map |
| operator_season_stats | Historical pick/win/ban rates per season |
| concepts | Abstract gameplay concepts (Hard Breach Denial, Roaming, etc.) |
| operator_map_recommendations | Ranked operator ↔ map relationships |
| operator_synergies | Operator pair synergy scores |
| operator_counters | Operator counterplay relationships |
| tags | Global tag taxonomy |
| tag_relations | Polymorphic join: tag ↔ any entity |

### Content — Learning System (admin-managed)

| Entity | Description |
|--------|-------------|
| lessons | Learning content units with ordered sections |
| lesson_sections | Ordered steps within a lesson |
| lesson_operators | Join: lesson ↔ operators |
| lesson_maps | Join: lesson ↔ maps |
| lesson_sites | Join: lesson ↔ map_sites |
| lesson_weapons | Join: lesson ↔ weapons |
| lesson_concepts | Join: lesson ↔ concepts |
| strategies | Rich site-specific strategy guides |
| strategy_operators | Join: strategy ↔ operators (multi-operator strats) |
| quizzes | Standalone or lesson-attached assessments |
| quiz_questions | Individual questions within a quiz |
| quiz_options | Individual answer options per question |
| quiz_operators | Join: quiz ↔ operators |
| quiz_maps | Join: quiz ↔ maps |
| quiz_concepts | Join: quiz ↔ concepts |
| mastery_paths | Learning tracks (linear or branching) |
| mastery_path_nodes | Ordered nodes within a path (lessons, quizzes, strategies) |
| mastery_path_operators | Join: path ↔ operators |
| mastery_path_maps | Join: path ↔ maps |
| mastery_path_concepts | Join: path ↔ concepts |

### User Data (user-owned)

| Entity | Description |
|--------|-------------|
| profiles | User identity, preferences, rank |
| deployments | Full deployment history (no cap) |
| operator_stats | Per-operator K/D/deployment aggregates |
| map_performance | Per-operator per-map metrics |
| map_win_loss | Per-map win/loss totals |
| site_performance | Per-operator per-map per-site stats |
| gamification | XP, streaks |
| user_achievements | Unlocked achievements |
| achievement_definitions | Achievement templates (admin-managed, in DB) |
| user_operator_mastery | Aggregated mastery progression per operator |
| user_rank_history | Seasonal rank tracking |
| user_lesson_progress | Tracks which lessons/sections a user completed |
| user_quiz_attempts | Quiz submission history |
| user_mastery_progress | Progress through mastery path nodes |

### Computed / In-Memory Only

| Entity | Notes |
|--------|-------|
| StreakState | Consecutive kills, resets on page load |
| SessionSnapshot / SessionDeltaData | Computed at hydration |
| RivalryComparison | Pure computation comparing two operators |

---

## Table Details — Core Domain

### `operators`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL, unique |
| codename | text | NOT NULL, unique |
| role | text | NOT NULL, CHECK IN ('ATTACKER', 'DEFENDER') |
| organization | text | NOT NULL |
| country | text | NOT NULL |
| release_season | text | NOT NULL (e.g. 'Y1S1') |
| release_year | smallint | NOT NULL |
| health | smallint | NOT NULL, CHECK 1–3 |
| speed | smallint | NOT NULL, CHECK 1–3 |
| difficulty | smallint | NOT NULL, CHECK 1–3 |
| ability_name | text | NOT NULL |
| ability_description | text | NOT NULL |
| playstyles | text[] | NOT NULL, default '{}' |
| strengths | text[] | NOT NULL, default '{}' |
| weaknesses | text[] | NOT NULL, default '{}' |
| icon_url | text | nullable |
| portrait_url | text | nullable |
| is_active | boolean | NOT NULL, default true |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- Index: `(role)`
- RLS: public read, admin-only write

---

### `weapons`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL, unique |
| type | text | NOT NULL, CHECK IN ('ASSAULT_RIFLE', 'SMG', 'LMG', 'SHOTGUN', 'DMR', 'MACHINE_PISTOL', 'HANDGUN', 'SHIELD') |
| damage | smallint | nullable |
| fire_rate | smallint | nullable (RPM) |
| mobility | smallint | nullable |
| capacity | smallint | nullable (magazine size) |
| created_at | timestamptz | NOT NULL, default now() |

- RLS: public read, admin-only write

---

### `operator_weapons`

| Column | Type | Constraints |
|--------|------|-------------|
| operator_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |
| weapon_id | uuid | NOT NULL, FK → weapons(id) ON DELETE CASCADE |
| slot | text | NOT NULL, CHECK IN ('primary', 'secondary') |

- PK: `(operator_id, weapon_id, slot)`
- RLS: public read, admin-only write

---

### `gadgets`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL, unique |
| description | text | nullable |
| created_at | timestamptz | NOT NULL, default now() |

- RLS: public read, admin-only write

---

### `operator_gadgets`

| Column | Type | Constraints |
|--------|------|-------------|
| operator_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |
| gadget_id | uuid | NOT NULL, FK → gadgets(id) ON DELETE CASCADE |

- PK: `(operator_id, gadget_id)`
- RLS: public read, admin-only write

---

### `maps`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL, unique |
| image_url | text | nullable |
| is_ranked | boolean | NOT NULL, default true |
| playlist | text | NOT NULL, default 'standard' |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- RLS: public read, admin-only write

---

### `map_sites`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| map_id | uuid | NOT NULL, FK → maps(id) ON DELETE CASCADE |
| name | text | NOT NULL |
| floor | text | NOT NULL |

- Unique: `(map_id, name)`
- RLS: public read, admin-only write

---

### `operator_season_stats`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| operator_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |
| season | text | NOT NULL (e.g. 'Y11S1') |
| pick_rate | numeric(5,2) | nullable |
| win_rate | numeric(5,2) | nullable |
| ban_rate | numeric(5,2) | nullable |
| rank_bracket | text | nullable (e.g. 'Platinum', 'All') |
| created_at | timestamptz | NOT NULL, default now() |

- Unique: `(operator_id, season, rank_bracket)`
- Index: `(season)`
- RLS: public read, admin-only write

---

### `concepts`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL, unique |
| slug | text | NOT NULL, unique |
| description | text | nullable |
| category | text | nullable (e.g. 'defense', 'offense', 'universal') |
| created_at | timestamptz | NOT NULL, default now() |

- Examples: "Hard Breach Denial", "Roaming", "Anchoring", "Vertical Play", "Droning"
- RLS: public read, admin-only write

---

### `operator_map_recommendations`

| Column | Type | Constraints |
|--------|------|-------------|
| operator_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |
| map_id | uuid | NOT NULL, FK → maps(id) ON DELETE CASCADE |
| rating | smallint | NOT NULL, CHECK 1–5 |
| notes | text | nullable |

- PK: `(operator_id, map_id)`
- RLS: public read, admin-only write

---

### `operator_synergies`

| Column | Type | Constraints |
|--------|------|-------------|
| operator_a_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |
| operator_b_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |
| synergy_score | numeric(3,1) | NOT NULL, CHECK 1.0–10.0 |
| notes | text | nullable |
| created_at | timestamptz | NOT NULL, default now() |

- PK: `(operator_a_id, operator_b_id)`
- CHECK: `operator_a_id < operator_b_id` (prevents duplicate pairs)
- RLS: public read, admin-only write

---

### `operator_counters`

| Column | Type | Constraints |
|--------|------|-------------|
| operator_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |
| counter_operator_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |
| explanation | text | NOT NULL |
| strength | text | nullable, CHECK IN ('soft', 'hard') |
| created_at | timestamptz | NOT NULL, default now() |

- PK: `(operator_id, counter_operator_id)`
- RLS: public read, admin-only write

---

### `tags`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL, unique |
| slug | text | NOT NULL, unique |
| category | text | nullable (e.g. 'difficulty', 'playstyle', 'team_size', 'content_type') |
| created_at | timestamptz | NOT NULL, default now() |

- RLS: public read, admin-only write

---

### `tag_relations`

| Column | Type | Constraints |
|--------|------|-------------|
| tag_id | uuid | NOT NULL, FK → tags(id) ON DELETE CASCADE |
| entity_type | text | NOT NULL, CHECK IN ('operator', 'map', 'lesson', 'strategy', 'quiz', 'mastery_path', 'concept') |
| entity_id | uuid | NOT NULL |

- PK: `(tag_id, entity_type, entity_id)`
- Index: `(entity_type, entity_id)` for reverse lookups
- RLS: public read, admin-only write

---

## Table Details — Content / Learning

### `lessons`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| title | text | NOT NULL |
| slug | text | NOT NULL, unique |
| description | text | nullable |
| difficulty | text | nullable, CHECK IN ('beginner', 'intermediate', 'advanced') |
| estimated_minutes | smallint | nullable |
| is_published | boolean | NOT NULL, default false |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- RLS: public read (where is_published = true), admin-only write

---

### `lesson_sections`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| lesson_id | uuid | NOT NULL, FK → lessons(id) ON DELETE CASCADE |
| sort_order | smallint | NOT NULL |
| type | text | NOT NULL, CHECK IN ('text', 'image', 'video', 'example', 'exercise', 'tip', 'warning') |
| title | text | nullable |
| content | text | nullable (markdown or prose) |
| media_url | text | nullable |
| metadata | jsonb | nullable (extra config per type) |

- Unique: `(lesson_id, sort_order)`
- RLS: inherits from lesson visibility

---

### `lesson_operators`

| Column | Type | Constraints |
|--------|------|-------------|
| lesson_id | uuid | NOT NULL, FK → lessons(id) ON DELETE CASCADE |
| operator_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |

- PK: `(lesson_id, operator_id)`
- RLS: public read, admin-only write

---

### `lesson_maps`

| Column | Type | Constraints |
|--------|------|-------------|
| lesson_id | uuid | NOT NULL, FK → lessons(id) ON DELETE CASCADE |
| map_id | uuid | NOT NULL, FK → maps(id) ON DELETE CASCADE |

- PK: `(lesson_id, map_id)`
- RLS: public read, admin-only write

---

### `lesson_sites`

| Column | Type | Constraints |
|--------|------|-------------|
| lesson_id | uuid | NOT NULL, FK → lessons(id) ON DELETE CASCADE |
| site_id | uuid | NOT NULL, FK → map_sites(id) ON DELETE CASCADE |

- PK: `(lesson_id, site_id)`
- RLS: public read, admin-only write

---

### `lesson_weapons`

| Column | Type | Constraints |
|--------|------|-------------|
| lesson_id | uuid | NOT NULL, FK → lessons(id) ON DELETE CASCADE |
| weapon_id | uuid | NOT NULL, FK → weapons(id) ON DELETE CASCADE |

- PK: `(lesson_id, weapon_id)`
- RLS: public read, admin-only write

---

### `lesson_concepts`

| Column | Type | Constraints |
|--------|------|-------------|
| lesson_id | uuid | NOT NULL, FK → lessons(id) ON DELETE CASCADE |
| concept_id | uuid | NOT NULL, FK → concepts(id) ON DELETE CASCADE |

- PK: `(lesson_id, concept_id)`
- RLS: public read, admin-only write

---

### `strategies`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| title | text | NOT NULL |
| slug | text | NOT NULL, unique |
| map_id | uuid | NOT NULL, FK → maps(id) |
| site_id | uuid | NOT NULL, FK → map_sites(id) |
| side | text | NOT NULL, CHECK IN ('attack', 'defense') |
| difficulty | text | nullable, CHECK IN ('easy', 'medium', 'hard') |
| source | text | nullable (e.g. 'G2 SI 2025', 'Pengu VOD') |
| season | text | nullable (e.g. 'Y11S1') |
| description | text | nullable |
| win_condition | text | nullable |
| team_composition | jsonb | nullable |
| reinforcements | text[] | NOT NULL, default '{}' |
| rotations | text[] | NOT NULL, default '{}' |
| utility_placements | jsonb | NOT NULL, default '[]' |
| round_flow | jsonb | nullable |
| counters | text[] | NOT NULL, default '{}' |
| adaptations | text[] | NOT NULL, default '{}' |
| tips | text[] | NOT NULL, default '{}' |
| is_published | boolean | NOT NULL, default false |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- Index: `(map_id, site_id)`
- RLS: public read (where is_published = true), admin-only write

---

### `strategy_operators`

| Column | Type | Constraints |
|--------|------|-------------|
| strategy_id | uuid | NOT NULL, FK → strategies(id) ON DELETE CASCADE |
| operator_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |
| role | text | nullable (e.g. 'Anchor', 'Roam', 'Entry') |
| description | text | nullable (operator-specific instructions) |
| sort_order | smallint | NOT NULL, default 0 |

- PK: `(strategy_id, operator_id)`
- RLS: public read, admin-only write

---

### `quizzes`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| title | text | NOT NULL |
| slug | text | NOT NULL, unique |
| description | text | nullable |
| lesson_id | uuid | nullable, FK → lessons(id) ON DELETE SET NULL |
| difficulty | text | nullable, CHECK IN ('beginner', 'intermediate', 'advanced') |
| passing_score | smallint | NOT NULL, default 70 (percentage) |
| is_published | boolean | NOT NULL, default false |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- Note: `lesson_id` is nullable — quizzes can be standalone or attached to a lesson.
- RLS: public read (where is_published = true), admin-only write

---

### `quiz_questions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| quiz_id | uuid | NOT NULL, FK → quizzes(id) ON DELETE CASCADE |
| sort_order | smallint | NOT NULL |
| type | text | NOT NULL, CHECK IN ('multiple_choice', 'true_false', 'scenario') |
| question | text | NOT NULL |
| image_url | text | nullable |
| explanation | text | nullable (shown after answer) |
| points | smallint | NOT NULL, default 1 |

- Unique: `(quiz_id, sort_order)`
- RLS: public read, admin-only write

---

### `quiz_options`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| question_id | uuid | NOT NULL, FK → quiz_questions(id) ON DELETE CASCADE |
| sort_order | smallint | NOT NULL |
| text | text | NOT NULL |
| is_correct | boolean | NOT NULL, default false |

- Unique: `(question_id, sort_order)`
- RLS: public read, admin-only write

---

### `quiz_operators`

| Column | Type | Constraints |
|--------|------|-------------|
| quiz_id | uuid | NOT NULL, FK → quizzes(id) ON DELETE CASCADE |
| operator_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |

- PK: `(quiz_id, operator_id)`
- RLS: public read, admin-only write

---

### `quiz_maps`

| Column | Type | Constraints |
|--------|------|-------------|
| quiz_id | uuid | NOT NULL, FK → quizzes(id) ON DELETE CASCADE |
| map_id | uuid | NOT NULL, FK → maps(id) ON DELETE CASCADE |

- PK: `(quiz_id, map_id)`
- RLS: public read, admin-only write

---

### `quiz_concepts`

| Column | Type | Constraints |
|--------|------|-------------|
| quiz_id | uuid | NOT NULL, FK → quizzes(id) ON DELETE CASCADE |
| concept_id | uuid | NOT NULL, FK → concepts(id) ON DELETE CASCADE |

- PK: `(quiz_id, concept_id)`
- RLS: public read, admin-only write

---

### `mastery_paths`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| title | text | NOT NULL |
| slug | text | NOT NULL, unique |
| description | text | nullable |
| difficulty | text | nullable, CHECK IN ('beginner', 'intermediate', 'advanced') |
| structure | text | NOT NULL, default 'linear', CHECK IN ('linear', 'branching') |
| is_published | boolean | NOT NULL, default false |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- RLS: public read (where is_published = true), admin-only write

---

### `mastery_path_nodes`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| path_id | uuid | NOT NULL, FK → mastery_paths(id) ON DELETE CASCADE |
| parent_node_id | uuid | nullable, FK → mastery_path_nodes(id) ON DELETE SET NULL |
| sort_order | smallint | NOT NULL |
| node_type | text | NOT NULL, CHECK IN ('lesson', 'quiz', 'strategy', 'checkpoint') |
| content_id | uuid | nullable (FK depends on node_type) |
| title | text | nullable (override for display) |
| is_optional | boolean | NOT NULL, default false |
| unlock_condition | jsonb | nullable (e.g. {"requires_nodes": ["uuid1", "uuid2"]}) |

- Unique: `(path_id, parent_node_id, sort_order)`
- Note: parent_node_id enables tree structure. NULL = root level. Linear paths just leave it NULL for all nodes.
- RLS: public read, admin-only write

---

### `mastery_path_operators`

| Column | Type | Constraints |
|--------|------|-------------|
| path_id | uuid | NOT NULL, FK → mastery_paths(id) ON DELETE CASCADE |
| operator_id | uuid | NOT NULL, FK → operators(id) ON DELETE CASCADE |

- PK: `(path_id, operator_id)`
- RLS: public read, admin-only write

---

### `mastery_path_maps`

| Column | Type | Constraints |
|--------|------|-------------|
| path_id | uuid | NOT NULL, FK → mastery_paths(id) ON DELETE CASCADE |
| map_id | uuid | NOT NULL, FK → maps(id) ON DELETE CASCADE |

- PK: `(path_id, map_id)`
- RLS: public read, admin-only write

---

### `mastery_path_concepts`

| Column | Type | Constraints |
|--------|------|-------------|
| path_id | uuid | NOT NULL, FK → mastery_paths(id) ON DELETE CASCADE |
| concept_id | uuid | NOT NULL, FK → concepts(id) ON DELETE CASCADE |

- PK: `(path_id, concept_id)`
- RLS: public read, admin-only write

---

## Table Details — User Data

### `profiles`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, references `auth.users(id)` ON DELETE CASCADE |
| callsign | text | NOT NULL, 3–20 chars, unique |
| avatar_url | text | nullable |
| current_rank | text | nullable (e.g. 'Gold II', 'Platinum I', 'Diamond') |
| peak_rank | text | nullable |
| rank_points | int | nullable |
| platform | text | nullable, CHECK IN ('PC', 'Console') |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- RLS: users can read/update own row only.
- Auto-created via trigger on `auth.users` insert.

---

### `deployments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| operator_id | uuid | NOT NULL, FK → operators(id) |
| loadout | jsonb | NOT NULL |
| match_type | text | nullable, CHECK IN ('Ranked', 'Unranked', 'Quick Match', 'Deathmatch') |
| platform | text | nullable, CHECK IN ('PC', 'Console') |
| target_kills | smallint | NOT NULL, default 0 |
| role | text | nullable |
| deployed_at | timestamptz | NOT NULL |

- Index: `(user_id, deployed_at DESC)`
- RLS: users can read/insert own rows only.
- No cap — full history retained.

---

### `operator_stats`

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| operator_id | uuid | NOT NULL, FK → operators(id) |
| kills | int | NOT NULL, default 0 |
| deaths | int | NOT NULL, default 0 |
| deployments | int | NOT NULL, default 0 |
| updated_at | timestamptz | NOT NULL, default now() |

- PK: `(user_id, operator_id)`
- RLS: users can read/upsert own rows only.

---

### `map_performance`

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| operator_id | uuid | NOT NULL, FK → operators(id) |
| map_id | uuid | NOT NULL, FK → maps(id) |
| kills | int | NOT NULL, default 0 |
| deaths | int | NOT NULL, default 0 |
| rounds | int | NOT NULL, default 0 |
| rounds_won | int | NOT NULL, default 0 |
| rounds_lost | int | NOT NULL, default 0 |
| matches | int | NOT NULL, default 0 |
| matches_won | int | NOT NULL, default 0 |
| matches_lost | int | NOT NULL, default 0 |
| updated_at | timestamptz | NOT NULL, default now() |

- PK: `(user_id, operator_id, map_id)`
- RLS: users can read/upsert own rows only.

---

### `map_win_loss`

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| map_id | uuid | NOT NULL, FK → maps(id) |
| wins | int | NOT NULL, default 0 |
| losses | int | NOT NULL, default 0 |
| updated_at | timestamptz | NOT NULL, default now() |

- PK: `(user_id, map_id)`
- RLS: users can read/upsert own rows only.

---

### `site_performance`

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| operator_id | uuid | NOT NULL, FK → operators(id) |
| map_id | uuid | NOT NULL, FK → maps(id) |
| site_id | uuid | NOT NULL, FK → map_sites(id) |
| kills | int | NOT NULL, default 0 |
| deaths | int | NOT NULL, default 0 |
| matches | int | NOT NULL, default 0 |
| updated_at | timestamptz | NOT NULL, default now() |

- PK: `(user_id, operator_id, map_id, site_id)`
- RLS: users can read/upsert own rows only.

---

### `gamification`

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | PK, FK → profiles(id) ON DELETE CASCADE |
| total_xp | int | NOT NULL, default 0 |
| current_streak | int | NOT NULL, default 0 |
| longest_streak | int | NOT NULL, default 0 |
| last_active_date | date | nullable |
| updated_at | timestamptz | NOT NULL, default now() |

- RLS: users can read/update own row only.

---

### `achievement_definitions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | text | PK (e.g. 'deploy_10', 'kills_100') |
| title | text | NOT NULL |
| description | text | NOT NULL |
| category | text | NOT NULL, CHECK IN ('deployment', 'kills', 'rank', 'content', 'streak', 'learning') |
| xp_reward | int | NOT NULL, default 0 |
| condition_type | text | NOT NULL, default 'threshold' |
| condition_metric | text | NOT NULL |
| condition_value | int | NOT NULL |
| icon_url | text | nullable |
| is_active | boolean | NOT NULL, default true |
| season | text | nullable (for seasonal achievements) |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

- RLS: public read, admin-only write

---

### `user_achievements`

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| achievement_id | text | NOT NULL, FK → achievement_definitions(id) |
| unlocked_at | timestamptz | NOT NULL, default now() |

- PK: `(user_id, achievement_id)`
- RLS: users can read/insert own rows only.

---

### `user_operator_mastery`

Aggregated progression layer per user × operator. Combines gameplay and learning signals into a single mastery record.

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| operator_id | uuid | NOT NULL, FK → operators(id) |
| tier | text | NOT NULL, default 'unplayed', CHECK IN ('unplayed', 'recruit', 'operative', 'veteran', 'elite') |
| total_xp | int | NOT NULL, default 0 |
| gameplay_xp | int | NOT NULL, default 0 |
| learning_xp | int | NOT NULL, default 0 |
| tier_unlocked_at | timestamptz | nullable (when current tier was achieved) |
| tier_history | jsonb | NOT NULL, default '[]' (array of {tier, unlocked_at}) |
| updated_at | timestamptz | NOT NULL, default now() |

- PK: `(user_id, operator_id)`
- RLS: users can read/upsert own rows only.
- Note: `total_xp = gameplay_xp + learning_xp`. Tier is derived from total_xp thresholds but persisted to avoid recomputation and enable historical tracking.
- Gameplay XP sourced from: deployments, kills, K/D performance (via operator_stats)
- Learning XP sourced from: lessons completed, quizzes passed, strategies studied, mastery path progress

---

### `user_rank_history`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| season | text | NOT NULL (e.g. 'Y11S1') |
| rank | text | NOT NULL |
| rank_points | int | nullable |
| recorded_at | timestamptz | NOT NULL, default now() |

- Unique: `(user_id, season)`
- Index: `(user_id, recorded_at DESC)`
- RLS: users can read/insert own rows only.

---

### `user_lesson_progress`

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| lesson_id | uuid | NOT NULL, FK → lessons(id) ON DELETE CASCADE |
| status | text | NOT NULL, default 'not_started', CHECK IN ('not_started', 'in_progress', 'completed') |
| last_section_id | uuid | nullable, FK → lesson_sections(id) ON DELETE SET NULL |
| completed_at | timestamptz | nullable |
| started_at | timestamptz | NOT NULL, default now() |

- PK: `(user_id, lesson_id)`
- RLS: users can read/upsert own rows only.

---

### `user_quiz_attempts`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| quiz_id | uuid | NOT NULL, FK → quizzes(id) ON DELETE CASCADE |
| score | smallint | NOT NULL (percentage 0–100) |
| passed | boolean | NOT NULL |
| answers | jsonb | NOT NULL (array of {question_id, selected_option_id, is_correct}) |
| attempted_at | timestamptz | NOT NULL, default now() |

- Index: `(user_id, quiz_id, attempted_at DESC)`
- RLS: users can read/insert own rows only.

---

### `user_mastery_progress`

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | NOT NULL, FK → profiles(id) ON DELETE CASCADE |
| path_id | uuid | NOT NULL, FK → mastery_paths(id) ON DELETE CASCADE |
| node_id | uuid | NOT NULL, FK → mastery_path_nodes(id) ON DELETE CASCADE |
| status | text | NOT NULL, default 'locked', CHECK IN ('locked', 'available', 'in_progress', 'completed') |
| completed_at | timestamptz | nullable |
| updated_at | timestamptz | NOT NULL, default now() |

- PK: `(user_id, path_id, node_id)`
- RLS: users can read/upsert own rows only.

---

## Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CORE DOMAIN                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  operators ──┬── operator_weapons ── weapons                    │
│              ├── operator_gadgets ── gadgets                     │
│              ├── operator_season_stats                           │
│              ├── operator_map_recommendations ── maps            │
│              ├── operator_synergies (self-join)                  │
│              ├── operator_counters (self-join)                   │
│              ├── strategy_operators ── strategies                │
│              │                            ├── maps               │
│              │                            └── map_sites          │
│              └── (related via lesson_operators, quiz_operators,  │
│                   mastery_path_operators)                        │
│                                                                  │
│  maps ───── map_sites                                           │
│                                                                  │
│  concepts ── (via lesson_concepts, quiz_concepts,               │
│               mastery_path_concepts)                             │
│                                                                  │
│  tags ───── tag_relations → any entity                          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                     CONTENT                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  lessons ──┬── lesson_sections (ordered)                        │
│            ├── lesson_operators → operators                      │
│            ├── lesson_maps → maps                               │
│            ├── lesson_sites → map_sites                         │
│            ├── lesson_weapons → weapons                         │
│            └── lesson_concepts → concepts                       │
│                                                                  │
│  quizzes ──┬── quiz_questions → quiz_options                    │
│            ├── quiz_operators → operators                        │
│            ├── quiz_maps → maps                                 │
│            └── quiz_concepts → concepts                         │
│                                                                  │
│  mastery_paths ──┬── mastery_path_nodes (tree)                  │
│                  ├── mastery_path_operators → operators          │
│                  ├── mastery_path_maps → maps                   │
│                  └── mastery_path_concepts → concepts            │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                     USER DATA                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  auth.users → profiles (1:1, trigger-created)                   │
│                 ├── deployments                                  │
│                 ├── operator_stats                               │
│                 ├── map_performance                              │
│                 ├── map_win_loss                                 │
│                 ├── site_performance                             │
│                 ├── gamification                                 │
│                 ├── user_operator_mastery → operators            │
│                 ├── user_rank_history                            │
│                 ├── user_achievements → achievement_definitions  │
│                 ├── user_lesson_progress → lessons               │
│                 ├── user_quiz_attempts → quizzes                 │
│                 └── user_mastery_progress → mastery_path_nodes   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## RLS Patterns

### Core domain + content tables (public read, admin write)

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- Anyone can read published content
CREATE POLICY "Public read"
  ON <table> FOR SELECT
  USING (true);  -- or: USING (is_published = true) for content tables

-- Writes happen via service_role key (bypasses RLS)
```

### User data tables (own data only)

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own data"
  ON <table> FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users write own data"
  ON <table> FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Design Decisions

1. **Operators, maps, weapons, gadgets in DB** — core domain entities with FK relationships to content and user data. Enables seasonal updates, admin management, and rich queries without redeploys.
2. **Weapons/gadgets normalized** — shared across operators. Enables weapon-specific content, recoil guides, "all operators with this weapon" queries.
3. **Ability embedded in operators** — unique per operator, no sharing needed.
4. **Dedicated relation tables over polymorphic** — full FK enforcement, cascade deletes, no app-side validation needed. More tables, but stronger data integrity.
5. **Mastery paths as trees via parent_node_id** — supports both linear and branching structures in one table.
6. **operator_season_stats separate from operators** — enables historical tracking and meta trend analysis.
7. **concepts table** — allows tagging content with abstract ideas ("Roaming", "Vertical Play") independent of specific operators/maps. Can evolve into a "skills" system.
8. **Global tag system** — consistent filtering, search, and content discovery across all entity types.
9. **operator_map_recommendations** — enables ranked, queryable operator ↔ map relationships with scores.
10. **operator_synergies / operator_counters** — enables team composition recommendations and counterplay education.
11. **quiz_options normalized** — enables answer analytics, most-missed tracking, and adaptive learning.
12. **achievement_definitions in DB** — enables adding/modifying achievements without redeploy.
13. **No deployment cap** — full history retained for analytics, progression, and achievement tracking.
14. **Expanded rank tracking** — current_rank, peak_rank, rank_points on profiles plus seasonal history table.
15. **user_operator_mastery** — persisted multi-dimensional progression combining gameplay + learning signals.
16. **is_published flag on content tables** — separates draft from live content. RLS enforces this.
17. **All IDs as uuid** — consistent, no collisions, Supabase-native.
18. **jsonb for deeply nested sub-data** — strategy round_flow, utility placements. Rich enough for the UI, avoids over-normalization.

---

## Table Count Summary

| Category | Tables | Count |
|----------|--------|-------|
| Core domain | operators, weapons, operator_weapons, gadgets, operator_gadgets, maps, map_sites, operator_season_stats, concepts, operator_map_recommendations, operator_synergies, operator_counters, tags, tag_relations | 14 |
| Content | lessons, lesson_sections, lesson_operators, lesson_maps, lesson_sites, lesson_weapons, lesson_concepts, strategies, strategy_operators, quizzes, quiz_questions, quiz_options, quiz_operators, quiz_maps, quiz_concepts, mastery_paths, mastery_path_nodes, mastery_path_operators, mastery_path_maps, mastery_path_concepts | 20 |
| User data | profiles, deployments, operator_stats, map_performance, map_win_loss, site_performance, gamification, achievement_definitions, user_achievements, user_operator_mastery, user_rank_history, user_lesson_progress, user_quiz_attempts, user_mastery_progress | 14 |
| **Total** | | **48** |

---

## Next Steps

1. Review this schema for completeness.
2. Write the SQL migration file (`0001_initial_schema.sql`).
3. Write seed scripts for operators, weapons, gadgets, maps, map_sites.
4. Update TypeScript types to match new schema.
5. Update Supabase client calls to use uuid-based references.
