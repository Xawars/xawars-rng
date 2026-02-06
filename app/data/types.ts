export type Side = 'attacker' | 'defender';

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
}
