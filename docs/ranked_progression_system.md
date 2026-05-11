# Ranked Progression System Specification

## Overview

Separate ranked progression tracking for PC and Console platforms, inspired by Rainbow Six Siege's rank system. Users manually track wins/losses to earn RP and climb the tier ladder.

---

## Data Types

### File: `app/data/types.ts`

```typescript
export type RankTier = 'Copper' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Emerald' | 'Diamond' | 'Champion';

export type RankDivision = 1 | 2 | 3 | 4 | 5;

export interface RankProgress {
  tier: RankTier;
  division: RankDivision;
  rp: number;
  peakTier: RankTier;
  peakDivision: RankDivision;
}

export interface RankedStats {
  pc: RankProgress;
  console: RankProgress;
}
```

### Default Starting Values

```typescript
const DEFAULT_RANK_PROGRESS: RankProgress = {
  tier: 'Copper',
  division: 1,
  rp: 0,
  peakTier: 'Copper',
  peakDivision: 1,
};

const DEFAULT_RANKED_STATS: RankedStats = {
  pc: DEFAULT_RANK_PROGRESS,
  console: DEFAULT_RANK_PROGRESS,
};
```

---

## Tier System

### Tier Hierarchy (Lowest to Highest)

| Tier | Order | Color (Hex) | Notes |
|------|-------|-------------|-------|
| Copper | 1 | `#B87333` | Starting tier |
| Bronze | 2 | `#CD7F32` | |
| Silver | 3 | `#C0C0C0` | |
| Gold | 4 | `#FFD700` | |
| Platinum | 5 | `#E5E4E2` | |
| Emerald | 6 | `#50C878` | |
| Diamond | 7 | `#B9F2FF` | |
| Champion | 8 | `rainbow-gradient` | Top tier |

### RP Requirements per Tier

| Tier | Divisions | RP per Division | Total to Tier Up |
|------|-----------|-----------------|------------------|
| Copper | I, II, III, IV, V | 100 | 500 |
| Bronze | I, II, III, IV, V | 100 | 500 |
| Silver | I, II, III, IV, V | 100 | 500 |
| Gold | I, II, III, IV, V | 100 | 500 |
| Platinum | I, II, III, IV, V | 100 | 500 |
| Emerald | I, II, III, IV, V | 100 | 500 |
| Diamond | I, II, III, IV, V | 100 | 500 |
| Champion | - | Max (cap at 500) | - |

**Note**: 1000 RP = 1 Division up. 5 Divisions = 1 Tier up.

---

## RP System (Manual)

### Win/Loss Values

| Action | RP Gain/Loss |
|--------|--------------|
| Win | +100 RP |
| Loss | -50 RP |

### Progression Logic

```
if (rp >= 1000) {
  // Division up
  rp = rp - 1000;
  division++;
  
  if (division > 5) {
    // Tier up
    division = 1;
    tier = nextTier; // e.g., Copper -> Bronze
    
    if (tier === 'Champion') {
      // Cap at max
      rp = 500;
      division = 1;
    }
  }
}

if (rp < 0) {
  // Division down (cannot go below Copper I)
  rp = 0;
  // Division cannot go below 1
}

// Track peak
if (tier > peakTier || (tier === peakTier && division > peakDivision)) {
  peakTier = tier;
  peakDivision = division;
}
```

### Edge Cases

- **Loss at 0 RP**: RP stays at 0, no negative
- **Champion**: RP caps at 500, cannot tier up further
- **Tier down on loss**: Not implemented (to keep it positive/encouraging)

---

## Persistence

### Storage Key

`xawars_ranked_stats`

### Auto-Save Triggers

- On any RP change (Win/Loss button press)
- On platform selection change (to track which platform is "active")
- On reset

### Reset Behavior

- "Reset Season" button clears:
  - Current RP to 0
  - Current tier/division to Copper I
  - **Keeps** peak rank (optional: ask user)

---

## UI Components

### Layout Location

Replace the empty left `<div></div>` in the main grid with the RankedDisplay component.

### Main Grid Structure (page.tsx)

```tsx
<div className="relative z-10 grid grid-cols-[1fr_auto_1fr] gap-6 max-w-[1400px] mx-auto pb-20">
  
  {/* Left Column - Ranked Display */}
  <div className="pt-[72px]">
    <RankedDisplay
      rankedStats={rankedStats}
      selectedPlatform={rankedPlatform}
      onWin={() => handleRPRankChange('win')}
      onLoss={() => handleRPRankChange('loss')}
      onPlatformChange={setRankedPlatform}
      onReset={handleRankedReset}
    />
  </div>

  {/* Center Column - Main Content */}
  <div className="w-[448px] flex flex-col gap-6">
    {/* ... existing content ... */}
  </div>

  {/* Right Column - History */}
  {/* ... existing content ... */}
</div>
```

### RankedDisplay Component

**File**: `app/components/RankedDisplay.tsx`

#### Layout Wireframe

```
┌─────────────────────────────────────────┐
│  ╔═══════════════════════════════════╗  │
│  ║         RANKED                     ║  │
│  ╚═══════════════════════════════════╝  │
├─────────────────────────────────────────┤
│                                         │
│  🟦 PC                                  │
│  ┌─────────────────────────────────┐   │
│  │  [Tier Icon]  Gold II           │   │
│  │  ████████████░░░░░  800/1000    │   │
│  │  Peak: Gold III                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🟪 CONSOLE                             │
│  ┌─────────────────────────────────┐   │
│  │  [Tier Icon]  Silver IV        │   │
│  │  ██████████░░░░░░  600/1000     │   │
│  │  Peak: Silver IV                 │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  Active: [PC ▼] or [Console ▼]        │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐     │
│  │ +100 RP     │  │ -50 RP       │     │
│  │   (WIN)     │  │   (LOSS)     │     │
│  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────┤
│  [Reset Season]                         │
└─────────────────────────────────────────┘
```

### Tier Icons

Use colored shields or ranks from lucide-react or custom SVGs:

| Tier | Icon Suggestion |
|------|-----------------|
| Copper | Shield with bronze color |
| Bronze | Shield with bronze color |
| Silver | Shield with silver color |
| Gold | Shield with gold color |
| Platinum | Shield with platinum color |
| Emerald | Shield with emerald color |
| Diamond | Shield with diamond color |
| Champion | Crown or star |

### Component States

| State | Visual |
|-------|--------|
| Active Platform | Highlighted border (blue for PC, purple for Console) |
| RP at 0 | Progress bar empty |
| RP near 1000 | Progress bar nearly full, pulse animation |
| Tier Up | Celebration animation (confetti or glow) |
| Champion | Special rainbow border/glow effect |

---

## Integration with page.tsx

### State Management

```typescript
import { RankedStats, RankProgress, RankTier, RankDivision } from './data/types';

// Add to existing usePersistedState calls
const [rankedStats, setRankedStats] = usePersistedState<RankedStats>('xawars_ranked_stats', DEFAULT_RANKED_STATS);
const [rankedPlatform, setRankedPlatform] = usePersistedState<'PC' | 'Console'>('xawars_ranked_platform', 'PC');
```

### RP Change Handler

```typescript
const handleRPRankChange = (result: 'win' | 'loss') => {
  setRankedStats(prev => {
    const currentPlatform = rankedPlatform;
    const platformStats = prev[currentPlatform];
    const { tier, division, rp, peakTier, peakDivision } = platformStats;
    
    let newRp = result === 'win' ? rp + 100 : Math.max(0, rp - 50);
    let newDivision = division;
    let newTier = tier;
    let newPeakTier = peakTier;
    let newPeakDivision = peakDivision;
    
    // Division up logic
    if (newRp >= 1000) {
      newRp -= 1000;
      newDivision = (newDivision + 1) as RankDivision;
      
      if (newDivision > 5) {
        newDivision = 1;
        const tierOrder: RankTier[] = ['Copper', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Champion'];
        const currentIndex = tierOrder.indexOf(tier);
        
        if (currentIndex < tierOrder.length - 1) {
          newTier = tierOrder[currentIndex + 1];
        }
      }
    }
    
    // Update peak
    const tierOrder: RankTier[] = ['Copper', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Champion'];
    const currentIsHigher = tierOrder.indexOf(newTier) > tierOrder.indexOf(peakTier) ||
      (newTier === peakTier && newDivision > peakDivision);
    
    if (currentIsHigher) {
      newPeakTier = newTier;
      newPeakDivision = newDivision;
    }
    
    return {
      ...prev,
      [currentPlatform]: {
        tier: newTier,
        division: newDivision,
        rp: newRp,
        peakTier: newPeakTier,
        peakDivision: newPeakDivision,
      },
    };
  });
};
```

### Reset Handler

```typescript
const handleRankedReset = () => {
  if (confirm('Reset your ranked season progress? Peak rank will be kept.')) {
    setRankedStats(prev => ({
      ...prev,
      [rankedPlatform]: {
        ...prev[rankedPlatform],
        tier: 'Copper',
        division: 1,
        rp: 0,
      },
    }));
  }
};
```

---

## Color Reference

### Tailwind Classes for Tiers

```typescript
const TIER_COLORS = {
  Copper: 'text-orange-700 border-orange-700',
  Bronze: 'text-amber-600 border-amber-600',
  Silver: 'text-gray-300 border-gray-300',
  Gold: 'text-yellow-400 border-yellow-400',
  Platinum: 'text-gray-200 border-gray-200',
  Emerald: 'text-emerald-400 border-emerald-400',
  Diamond: 'text-cyan-200 border-cyan-200',
  Champion: 'bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text',
};
```

### Progress Bar Colors

| Tier | Progress Bar Color |
|------|-------------------|
| Copper | `bg-orange-700` |
| Bronze | `bg-amber-600` |
| Silver | `bg-gray-300` |
| Gold | `bg-yellow-400` |
| Platinum | `bg-gray-200` |
| Emerald | `bg-emerald-400` |
| Diamond | `bg-cyan-200` |
| Champion | Rainbow animation |

---

## Acceptance Criteria

1. **Separate tracking**: PC and Console have independent rank progress
2. **Manual RP**: User clicks +100 for win, -50 for loss
3. **Tier/division progression**: 1000 RP = division up, 5 divisions = tier up
4. **Peak tracking**: Always shows highest rank achieved per platform
5. **Persistence**: All data survives page refresh
6. **Reset option**: "Reset Season" button clears current progress
7. **UI matches spec**: Left panel shows both platforms with active selection
8. **Responsive**: Works on desktop, responsive to window size changes

---

## File Checklist

| File | Action |
|------|--------|
| `app/data/types.ts` | Add RankTier, RankDivision, RankProgress, RankedStats types |
| `app/components/RankedDisplay.tsx` | **CREATE** - Main ranked UI component |
| `app/page.tsx` | Import RankedDisplay, add state and handlers |

---

## Future Considerations (Out of Scope)

- Cloud sync across devices (requires auth)
- Match history (wins/losses per operator)
- Win streak bonus
- Seasonal rewards/badges
- Leaderboard