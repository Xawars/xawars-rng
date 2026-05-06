export const ATTACKER_ROLES = [
  'Hard Breacher',
  'Soft Breacher',
  'Entry Fragger',
  'Support',
  'Intel / Recon',
  'Flank Watch',
  'Shield',
  'Flex'
] as const;

export const DEFENDER_ROLES = [
  'Anchor',
  'Roamer',
  'Lurker',
  'Intel Denier',
  'Anti-Breach',
  'Trap Operator',
  'Area Denial',
  'Intel / Camera',
  'Shield',
  'Flex'
] as const;

export type AttackerRole = typeof ATTACKER_ROLES[number];
export type DefenderRole = typeof DEFENDER_ROLES[number];
export type Role = AttackerRole | DefenderRole;

export const ROLE_COLORS: Record<Role, string> = {
  // Attack
  'Hard Breacher': 'bg-orange-500',
  'Soft Breacher': 'bg-orange-400',
  'Entry Fragger': 'bg-red-500',
  'Support': 'bg-blue-500',
  'Intel / Recon': 'bg-purple-500',
  'Flank Watch': 'bg-cyan-500',
  'Shield': 'bg-zinc-500',
  'Flex': 'bg-white',
  // Defense
  'Anchor': 'bg-green-500',
  'Roamer': 'bg-red-500',
  'Lurker': 'bg-yellow-500',
  'Intel Denier': 'bg-blue-400',
  'Anti-Breach': 'bg-amber-600',
  'Trap Operator': 'bg-purple-500',
  'Area Denial': 'bg-yellow-600',
  'Intel / Camera': 'bg-purple-400',
};

export function getRoleColor(role: Role): string {
  return ROLE_COLORS[role] || 'bg-zinc-500';
}