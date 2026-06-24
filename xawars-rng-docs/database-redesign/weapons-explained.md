# The `weapons` & `operator_weapons` Tables — Explained

**Related file:** [`database-schema.md`](./database-schema.md)

---

## What are they?

`weapons` stores every weapon in Rainbow Six Siege as a standalone entity. `operator_weapons` is the join table that connects operators to the weapons they can equip, including which slot (primary or secondary) the weapon occupies.

They're separated because weapons are **shared across operators**. The MP5, for example, is available on Rook, Doc, and Oryx. Without normalization, you'd duplicate weapon data across every operator that uses it.

---

## `weapons` — What it stores

| Column | What it is | Example (MP5) |
|--------|-----------|---------------|
| `id` | UUID primary key | `b2c3d4e5-...` |
| `name` | Display name | `MP5` |
| `type` | Weapon category | `SMG` |
| `damage` | Damage per shot | `27` |
| `fire_rate` | Rounds per minute | `800` |
| `mobility` | Movement speed modifier | `50` |
| `capacity` | Magazine size | `30` |
| `created_at` | Timestamp | auto |

**Valid weapon types:** `ASSAULT_RIFLE`, `SMG`, `LMG`, `SHOTGUN`, `DMR`, `MACHINE_PISTOL`, `HANDGUN`, `SHIELD`

---

## `operator_weapons` — What it stores

| Column | What it is | Example |
|--------|-----------|---------|
| `operator_id` | FK → operators | Mute's UUID |
| `weapon_id` | FK → weapons | MP5K's UUID |
| `slot` | Primary or secondary | `primary` |

- PK: `(operator_id, weapon_id, slot)`
- This means an operator can have the same weapon in only one slot, and can have multiple weapons per slot (which is how R6 works — you choose between 2–3 primaries).

---

## Why they exist as separate tables

| Without normalization | With normalization |
|----------------------|-------------------|
| MP5 data duplicated on Rook, Doc, Oryx rows | MP5 exists once in `weapons` |
| Updating MP5 damage requires updating every operator row | Update one row in `weapons` |
| "All operators with MP5" requires scanning all operators | Simple join query |
| Weapon-specific content (recoil guides) has nothing to point to | Lessons can FK to `weapons.id` |

---

## What queries this enables

```sql
-- All operators that use the MP5
SELECT o.name FROM operators o
JOIN operator_weapons ow ON ow.operator_id = o.id
JOIN weapons w ON w.weapon_id = ow.weapon_id
WHERE w.name = 'MP5';

-- All weapons available to Mute
SELECT w.name, w.type, ow.slot FROM weapons w
JOIN operator_weapons ow ON ow.weapon_id = w.id
JOIN operators o ON o.id = ow.operator_id
WHERE o.codename = 'mute';

-- All SMGs in the game
SELECT name, damage, fire_rate FROM weapons WHERE type = 'SMG';
```

---

## Access control

- **Who writes:** Admin only (via service role key).
- **Who reads:** Everyone. Public read access.

---

## What depends on them

**`weapons` is referenced by:**
- `operator_weapons` — which operators carry this weapon
- `lesson_weapons` — lessons about this weapon (recoil guides, etc.)

**`operator_weapons` is referenced by:**
- Nothing directly — it's a leaf join table. But it's the bridge that connects operators to their loadout options.

---

## Example data

**`weapons` rows:**

```json
[
  {
    "id": "w-001",
    "name": "MP5K",
    "type": "SMG",
    "damage": 30,
    "fire_rate": 800,
    "mobility": 50,
    "capacity": 30
  },
  {
    "id": "w-002",
    "name": "M590A1",
    "type": "SHOTGUN",
    "damage": 48,
    "fire_rate": null,
    "mobility": 50,
    "capacity": 7
  },
  {
    "id": "w-003",
    "name": "P226 MK 25",
    "type": "HANDGUN",
    "damage": 52,
    "fire_rate": null,
    "mobility": 45,
    "capacity": 15
  }
]
```

**`operator_weapons` rows (Mute):**

```json
[
  { "operator_id": "mute-uuid", "weapon_id": "w-001", "slot": "primary" },
  { "operator_id": "mute-uuid", "weapon_id": "w-002", "slot": "primary" },
  { "operator_id": "mute-uuid", "weapon_id": "w-003", "slot": "secondary" }
]
```

This means Mute can choose between MP5K or M590A1 as primary, and has the P226 MK 25 as secondary.

---

## Relationship to the learning platform

Weapons being first-class entities enables:
- **Weapon-specific lessons** — "Master the MP5K recoil pattern"
- **Recoil guides** — content linked directly to a weapon
- **Operator recommendations based on weapon preference** — "You like the R4-C? Try Ash and Nomad"
- **Weapon statistics** — damage comparisons, DPS calculations
- **"Show all operators that use this weapon"** — simple join query
