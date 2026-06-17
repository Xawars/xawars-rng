# Design Document: Round-Based Match Tracking

## Overview

This feature inserts a **Match** layer between the existing Deployment (HistoryItem) and Round levels. Map selection now **starts a Match** (rather than being a free-floating selector), and rounds are appended into the active match until the player explicitly ends it. All state stays within the existing `usePersistedState` pattern — no new stores or contexts.

## Architecture

The architecture stays entirely within the existing `page.tsx` state management pattern — no new context providers, no new stores. Match state lives inside the `HistoryItem.matches[]` array, persisted via the existing `usePersistedState('xawars_history', ...)` hook.

```
Deployment (HistoryItem)
  └── matches: MatchEntry[]
        └── rounds: RoundEntry[]
```

## Data Models

```typescript
// app/components/HistoryList.tsx — updated types

export interface RoundEntry {
  siteId: string | null;
  kills: number;
  deaths: number;
  outcome: 'win' | 'loss';
}

export interface MatchEntry {
  id: string;           // crypto.randomUUID()
  mapId: string | null; // null for legacy matches
  startedAt: string;    // ISO timestamp
  endedAt?: string;     // ISO timestamp, absent while match is open
  rounds: RoundEntry[];
}

export interface HistoryItem {
  id: number;
  operator: Operator;
  loadout: Loadout;
  matchType?: string;
  platform?: Platform;
  targetKills?: number;
  role?: string;
  deploymentId?: string;
  // ponytail: removed mapId/siteId/rounds — replaced by matches[]
  matches?: MatchEntry[];
  surrendered?: boolean;
  schemaVersion?: number; // 2 = new match format
}

// ponytail: the old RoundEntry with mapId is only needed for migration
interface LegacyRoundEntry {
  mapId: string;
  siteId: string | null;
  kills: number;
  deaths: number;
  outcome: 'win' | 'loss';
}
```

**Schema Version:** `2` indicates new match format. Absence or `1` triggers migration.

## Components and Interfaces

### Modified Files

| File | Change |
|------|--------|
| `app/components/HistoryList.tsx` | Update types (MatchEntry, remove old RoundEntry mapId), export new types |
| `app/page.tsx` | Replace handleMatchEnd with handleRoundEnd/handleMatchEnd pair, match lifecycle state, migration on load |
| `app/components/OperatorCardModal.tsx` | Render rounds grouped by match instead of flat list |
| `app/components/MapDeploySelector.tsx` | Add locked state + correction affordance when match is active |

### No New Files

All logic lives in `page.tsx` (match lifecycle) and existing components. Following ponytail: fewest files possible.

## State Management

### New Persisted State (in page.tsx)

None — match state lives inside the existing `history` array (`HistoryItem.matches[]`). The active match is derived:

```typescript
// ponytail: derive active match from current deployment's history item
const activeHistoryItem = history.find(h => h.deploymentId === currentDeploymentId);
const activeMatch = activeHistoryItem?.matches?.find(m => !m.endedAt) ?? null;
```

### Existing State Reuse

- `currentMapId` — now represents the active match's map (set on match start, cleared on match end)
- `currentSiteId` — per-round site selection (cleared after each round)
- `roundStartKillsRef` / `roundStartDeathsRef` — reset on round end (same as today)

## Key Flows

### Start Match

Triggered when player selects a map (via MapDeploySelector) while a deployment is active and no match is open:

1. Create `MatchEntry { id: uuid, mapId: selectedMap, startedAt: now, rounds: [] }`
2. Push into `activeHistoryItem.matches[]`
3. Set `currentMapId` to the selected map
4. Lock the map selector UI

### End Round (Win/Loss)

Replaces current `handleMatchEnd`:

1. Compute `roundKills = kills - roundStartKillsRef.current`
2. Compute `roundDeaths = deaths - roundStartDeathsRef.current`
3. Append `{ siteId: currentSiteId, kills: roundKills, deaths: roundDeaths, outcome }` to `activeMatch.rounds`
4. Call `updateMapWinLoss(activeMatch.mapId, outcome)`
5. Call `updateMapPerformance(operator.id, activeMatch.mapId, { matches: 1 })`
6. If `currentSiteId`: call `updateSitePerformance(operator.id, activeMatch.mapId, currentSiteId, { matches: 1 })`
7. Reset `roundStartKillsRef.current = kills`, `roundStartDeathsRef.current = deaths`
8. Clear `currentSiteId` to null

### End Match

New explicit action (button below the round-end UI):

1. Set `activeMatch.endedAt = new Date().toISOString()`
2. Clear `currentMapId = null`, `currentSiteId = null`
3. Player can now start a new match by selecting another map

### Map Correction

While match is active, a small edit icon on the locked map selector triggers:

1. Open map dropdown in "correction mode"
2. On selection: update `activeMatch.mapId` to new value, update `currentMapId`
3. No new match created, `matches.length` unchanged

## Migration Logic

Runs once on hydration in `page.tsx` (inside the existing `useEffect` that loads persisted state):

```typescript
function migrateHistoryItem(item: HistoryItem): HistoryItem {
  // Already migrated
  if (item.schemaVersion === 2 || item.matches) return { ...item, schemaVersion: 2 };

  // Has old rounds — wrap in legacy match
  if (item.rounds && item.rounds.length > 0) {
    const legacyMatch: MatchEntry = {
      id: crypto.randomUUID(),
      mapId: null, // legacy matches have no single map
      startedAt: new Date(item.id).toISOString(), // approximate from deployment timestamp
      endedAt: new Date(item.id).toISOString(),
      rounds: item.rounds.map(r => ({
        siteId: r.siteId,
        kills: r.kills,
        deaths: r.deaths,
        outcome: r.outcome,
        // ponytail: per-round mapId preserved in a metadata field for legacy display
        _legacyMapId: (r as any).mapId,
      })) as any,
    };
    const { rounds, mapId, siteId, ...rest } = item as any;
    return { ...rest, matches: [legacyMatch], schemaVersion: 2 };
  }

  // No rounds, no matches — fresh deployment
  const { rounds, mapId, siteId, ...rest } = item as any;
  return { ...rest, matches: [], schemaVersion: 2 };
}
```

**On load:**
```typescript
useEffect(() => {
  if (history.some(h => h.schemaVersion !== 2)) {
    setHistory(history.map(migrateHistoryItem));
  }
}, []); // ponytail: runs once on mount
```

## OperatorCardModal Timeline Update

The existing flat round timeline becomes grouped:

```typescript
// For each match in item.matches:
//   - If match.mapId: render map name as header
//   - If match.mapId is null (legacy): render per-round _legacyMapId inline
//   - Render rounds in array order within each match group
```

## Mastery Integration

The existing `handleMatchEnd` calls to `updateMapPerformance`, `updateMapWinLoss`, and `updateSitePerformance` move into the new `handleRoundEnd` function. The key difference: they now use `activeMatch.mapId` (the match-level map) rather than `currentMapId` as a free-standing variable. Since `currentMapId` is set to `activeMatch.mapId` on match start and locked, this is functionally equivalent but semantically clearer.

## Error Handling

- **No active deployment when map selected:** No-op (MapDeploySelector already only shows when deployed)
- **No active match when round-end triggered:** Should not happen (round-end UI only shows when match is active), but guard with early return
- **Migration of corrupted data:** If `rounds` contains malformed entries, skip them (filter with type guard)
- **Page close during active match:** Covered by existing `usePersistedState` — the `history` array (containing open matches) is persisted on every state change

## Testing Strategy

- **Property-based tests**: Core match lifecycle logic (round-end delta computation, migration, schema validation, map-lock invariant) — these are pure functions with varied inputs.
- **Unit tests (example-based)**: UI state transitions (site cleared after round, map cleared after match end), legacy display fallback in OperatorCardModal.
- **Integration tests**: Persistence round-trip via localStorage (verify `xawars_history` contains correct structure after operations).

Property tests target the extracted pure logic functions (migration, round-end computation, match state transitions). UI-coupled behavior uses example-based tests with React Testing Library.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: HistoryItem schema invariant

*For any* HistoryItem with `schemaVersion === 2`, the item SHALL have a `matches` array where every entry contains a string `id`, a nullable string `mapId`, a string `startedAt`, an optional string `endedAt`, and a `rounds` array where every round contains a nullable `siteId`, numeric `kills` >= 0, numeric `deaths` >= 0, and an `outcome` of either 'win' or 'loss'.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Match creation from map selection

*For any* map selection event where a deployment is active and no match is currently open (no match without `endedAt`), the operation SHALL produce exactly one new MatchEntry appended to `matches[]` with the selected `mapId` and a `startedAt` timestamp that is a valid ISO string.

**Validates: Requirements 2.1**

### Property 3: Map locked during active match

*For any* state where an active match exists (a match without `endedAt`), a regular map change operation SHALL be rejected — the `activeMatch.mapId` and `currentMapId` remain unchanged, and no new match is created.

**Validates: Requirements 2.2**

### Property 4: Round-end produces correct delta and resets counters

*For any* round-end operation given `totalKills`, `totalDeaths`, `roundStartKills`, `roundStartDeaths`, and an outcome, the appended round SHALL have `kills === totalKills - roundStartKills`, `deaths === totalDeaths - roundStartDeaths`, and the given outcome. After the operation, `roundStartKills === totalKills` and `roundStartDeaths === totalDeaths`, and `currentSiteId === null`.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Match-end sets valid timestamp

*For any* active match that is ended, the resulting match SHALL have an `endedAt` that is a valid ISO timestamp string and `endedAt >= startedAt` when compared chronologically.

**Validates: Requirements 4.1**

### Property 6: Map correction updates in-place

*For any* map correction operation on an active match, the `matches` array length SHALL remain unchanged, and the active match's `mapId` SHALL equal the newly selected map.

**Validates: Requirements 5.1, 5.2**

### Property 7: Legacy migration preserves all rounds

*For any* old-format HistoryItem containing a `rounds` array of N entries, migration SHALL produce exactly one MatchEntry with `mapId === null` and a `rounds` array of length N, where each migrated round preserves the original `siteId`, `kills`, `deaths`, and `outcome` values.

**Validates: Requirements 6.2, 6.4**

### Property 8: Mastery updates use match-level map

*For any* round-end operation within an active match, the map identifier passed to `updateMapPerformance`, `updateMapWinLoss`, and (when a site is selected) `updateSitePerformance` SHALL equal the active match's `mapId`, not any per-round or free-standing map value.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 9: Partial match state persisted after round-end

*For any* round-end operation, the persisted `history` array SHALL contain the active HistoryItem with its open match (no `endedAt`) including all appended rounds up to and including the just-ended round.

**Validates: Requirements 9.3**
