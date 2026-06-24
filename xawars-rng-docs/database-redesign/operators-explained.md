# The `operators` Table — Explained

**Related file:** [`database-schema.md`](./database-schema.md)

---

## What is it?

The `operators` table is the central entity in the database. Every Rainbow Six Siege operator lives here with their core identity and metadata. It's the foundation that most other tables point back to.

---

## What it stores

| Column | What it is | Example (Mute) |
|--------|-----------|----------------|
| `id` | UUID primary key | `a1b2c3d4-...` |
| `name` | Display name | `Mute` |
| `codename` | Internal/alternate identifier | `mute` |
| `role` | Attacker or Defender | `DEFENDER` |
| `organization` | CTU they belong to | `SAS` |
| `country` | Nationality | `United Kingdom` |
| `release_season` | When they were added to the game | `Y1S0` (base game) |
| `release_year` | Year added | `2015` |
| `health` | 1–3 rating | `2` |
| `speed` | 1–3 rating | `2` |
| `difficulty` | 1–3 rating | `2` |
| `ability_name` | Unique gadget name | `Signal Disruptor` |
| `ability_description` | What it does | `Jams enemy electronic devices` |
| `playstyles` | How they're typically played | `['Anchor', 'Support', 'Intel Denial']` |
| `strengths` | What they're good at | `['Denies drones', 'Denies hard breach']` |
| `weaknesses` | Vulnerabilities | `['Limited range', 'Vulnerable to Thatcher']` |
| `icon_url` | Operator icon image | `https://...` |
| `portrait_url` | Full portrait image | `https://...` |
| `is_active` | Whether they're in the current game | `true` |
| `created_at` / `updated_at` | Timestamps | auto |

---

## What's NOT on this table (by design)

| Data | Where it lives | Why |
|------|---------------|-----|
| Weapons | `weapons` + `operator_weapons` | Shared across operators (MP5 on Rook, Doc, Oryx) |
| Gadgets | `gadgets` + `operator_gadgets` | Shared across operators |
| Map recommendations | `operator_map_recommendations` | Proper relationship with rating/scores |
| Tags | `tags` + `tag_relations` | Global tag system across all entities |
| Pick/win/ban rates | `operator_season_stats` | Historical per season, not a static property |
| Synergies | `operator_synergies` | Relationship between two operators |
| Counters | `operator_counters` | Relationship between two operators |

---

## Design rationale

The operator row is the **identity** — who they are, what they can do, how they play. Everything that's a **relationship** (to weapons, maps, other operators) or **changes over time** (seasonal stats) lives in separate tables linked by FK.

This means you can:

- Query "all defenders with speed 3" directly
- Update an operator's strengths without touching any related data
- Add a new operator in one row, then link weapons/gadgets/maps separately
- Keep the row stable even as meta shifts (seasonal stats are separate)

---

## Access control

- **Who writes:** Admin only (via Supabase service role key). RLS blocks public writes.
- **Who reads:** Everyone. Public read access with no restrictions.

---

## What depends on it

The `operators` table is referenced (via FK) by:

- `operator_weapons` — loadout options
- `operator_gadgets` — secondary gadget options
- `operator_season_stats` — historical meta data
- `operator_map_recommendations` — ranked map suggestions
- `operator_synergies` — team composition pairs
- `operator_counters` — counterplay relationships
- `strategy_operators` — operators in a strategy
- `lesson_operators` — operators related to a lesson
- `quiz_operators` — operators related to a quiz
- `mastery_path_operators` — operators in a mastery path
- `deployments` — user deployment history
- `operator_stats` — user per-operator performance
- `map_performance` — user per-operator per-map stats
- `site_performance` — user per-operator per-site stats
- `user_operator_mastery` — user mastery progression

---

## Example row

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Mute",
  "codename": "mute",
  "role": "DEFENDER",
  "organization": "SAS",
  "country": "United Kingdom",
  "release_season": "Y1S0",
  "release_year": 2015,
  "health": 2,
  "speed": 2,
  "difficulty": 2,
  "ability_name": "Signal Disruptor",
  "ability_description": "Jams enemy electronic devices within range, denying drones, hard breach gadgets, and remote-activated abilities.",
  "playstyles": ["Anchor", "Support", "Intel Denial"],
  "strengths": ["Denies drones", "Denies hard breach gadgets", "Strong site setup"],
  "weaknesses": ["Limited range", "Vulnerable to Thatcher", "Requires setup time"],
  "icon_url": null,
  "portrait_url": null,
  "is_active": true,
  "created_at": "2026-06-20T00:00:00Z",
  "updated_at": "2026-06-20T00:00:00Z"
}
```
