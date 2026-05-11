export type Side = 'attacker' | 'defender';

export type MatchType = 'Ranked' | 'Unranked' | 'Quick Match' | 'Deathmatch';

export type Platform = 'PC' | 'Console';

export interface Loadout {
  primary: string;
  secondary: string;
  gadget: string;
}

export interface Operator {
  id: string;
  name: string;
  side: Side;
  icon?: string;
  primaries: string[];   // e.g. ["R4-C", "G36C"]
  secondaries: string[]; // e.g. ["5.7 USG", "M45 MEUSOC"]
  gadgets: string[];     // e.g. ["Breach Charge", "Claymore"]
  roles: string[];      // e.g. ["Hard Breacher", "Support"]
}

export interface Deployment {
  operator: Operator;
  loadout: Loadout;
  matchType?: MatchType;
  platform?: Platform;
  targetKills: number;
  role?: string;
}

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
  PC: RankProgress;
  Console: RankProgress;
}
