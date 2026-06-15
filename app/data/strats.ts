export type StratRole = 'Anchor' | 'Roam' | 'Flex' | 'Support' | 'Entry' | 'Flank Watch';
export type StratDifficulty = 'Easy' | 'Medium' | 'Hard';
export type StratTag = 'ranked' | 'pro-inspired' | 'soloQ-friendly' | '5-stack-only' | 'beginner' | 'advanced';

export interface StratUtilityPlacement {
  gadget: string;
  location: string;
}

export interface StratRoleEntry {
  operator: string;
  role: StratRole;
  description: string;
}

export interface Strat {
  id: string;
  mapId: string;
  siteId: string;
  operator: string;       // featured operator
  title: string;          // e.g. "Thorn Anchor – Kids Dorms"
  role: StratRole;
  difficulty: StratDifficulty;
  source?: string;        // "G2 SI 2025", "Pengu VOD", etc.
  tags: StratTag[];
  season?: string;        // e.g. "Y11S1"

  winCondition: string;
  setup: {
    reinforcements: string[];
    rotations: string[];
    utility: StratUtilityPlacement[];
  };
  roles: StratRoleEntry[];
  roundFlow: {
    prepPhase: string[];
    earlyRound: string[];
    midRound: string[];
    plantRetake: string[];
  };
  counters: string[];
  adaptations: string[];
}

// --- Example strat to show the structure works ---
export const STRATS: Strat[] = [
  {
    id: 'thorn-oregon-kids',
    mapId: 'oregon',
    siteId: 'kids-dorms',
    operator: 'thorn',
    title: 'Thorn Anchor – Kids Dorms',
    role: 'Anchor',
    difficulty: 'Medium',
    source: 'Inspired by G2 Oregon setup, adapted for ranked',
    tags: ['pro-inspired', 'ranked'],
    season: 'Y11S1',
    winCondition: 'Deny default plant at Kids window and White stairs by stacking Razor Blooms and crossfires.',
    setup: {
      reinforcements: [
        '2x Kids Dorms external walls',
        '2x Attic walls into Kids',
        '1x Meeting wall into Kitchen',
      ],
      rotations: [
        'Kids ↔ Attic rotation hole',
        'Kids ↔ Trophy rotation',
      ],
      utility: [
        { gadget: 'Razor Bloom', location: 'Behind default plant spot at Kids window' },
        { gadget: 'Razor Bloom', location: 'Top of White stairs, tucked behind box' },
        { gadget: 'Razor Bloom', location: 'Attic doorway on default push path' },
      ],
    },
    roles: [
      { operator: 'thorn', role: 'Anchor', description: 'Holds Kids from back corner, swings on Razor Bloom activation audio cues' },
      { operator: 'smoke', role: 'Anchor', description: 'Anchors Games, uses canisters on default plant spots' },
      { operator: 'wamai', role: 'Support', description: 'Protects Thorn position from grenades with Mag-NETs' },
      { operator: 'mute', role: 'Support', description: 'Jams Kids walls and drones, delays hard breach' },
      { operator: 'vigil', role: 'Roam', description: 'Roams Attic/Meeting, wastes attacker time' },
    ],
    roundFlow: {
      prepPhase: [
        'Thorn places Razor Blooms at Kids window plant and White stairs',
        'Mute places jammers on Kids external walls',
        'Wamai sets Mag-NETs near Thorn position',
      ],
      earlyRound: [
        'Thorn holds passive angle from back Kids',
        'Vigil roams Attic to deny early control',
        'Smoke anchors Games with line of sight into Kids',
      ],
      midRound: [
        'If attackers take Attic: Thorn repositions to Trophy angle',
        'If attackers push White stairs: Razor Bloom activates, Thorn swings',
        'Wamai resets Mag-NETs if needed',
      ],
      plantRetake: [
        'Smoke denies plant with gas canisters',
        'Thorn swings on Razor Bloom detonation for trade kills',
        'If site is lost: retake from Trophy + Games crossfire',
      ],
    },
    counters: [
      'Buck/Sledge vertical play destroys Razor Blooms from below',
      'Capitao smokes and fire bolts neutralize crossfires',
      'Thatcher disables Mute jammers for hard breach',
    ],
    adaptations: [
      'If they always open Attic first, shift Thorn to play Dorms main door',
      'If utility clears Razor Blooms early, stack denial on second plant spot',
      'If vertical pressure: have Wamai play below to deny Buck',
    ],
  },
];

// --- Helpers ---

export function getStratsForMap(mapId: string): Strat[] {
  return STRATS.filter(s => s.mapId === mapId);
}

export function getStratsForSite(mapId: string, siteId: string): Strat[] {
  return STRATS.filter(s => s.mapId === mapId && s.siteId === siteId);
}

export function getStratById(id: string): Strat | undefined {
  return STRATS.find(s => s.id === id);
}
