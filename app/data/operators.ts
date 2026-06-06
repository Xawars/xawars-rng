import { Operator, Side, Loadout, MatchType, Platform } from './types';
import { bestLoadouts } from './best-loadouts';

// FULL ROSTER (Pathfinder - Year 10)
export const operators: Operator[] = [
  // --- PATHFINDERS (SAS) ---
  {
    id: "sledge",
    name: "Sledge",
    side: "attacker",
    primaries: ["L85A2", "M590A1"],
    secondaries: ["P226 Mk 25", "Reaper Mk2"],
    gadgets: ["Frag Grenade", "Stun Grenade", "Impact EMP Grenade"],
    roles: ["Soft Breacher", "Entry Fragger"]
  },
  {
    id: "thatcher",
    name: "Thatcher",
    side: "attacker",
    primaries: ["AR33", "L85A2", "M590A1"],
    secondaries: ["P226 Mk 25"],
    gadgets: ["Breach Charge", "Claymore"],
    roles: ["Support", "Intel / Recon"]
  },
  {
    id: "smoke",
    name: "Smoke",
    side: "defender",
    primaries: ["FMG-9", "M590A1"],
    secondaries: ["P226 Mk 25", "SMG-11"],
    gadgets: ["Barbed Wire", "Proximity Alarm"],
    roles: ["Anchor", "Area Denial"]
  },
  {
    id: "mute",
    name: "Mute",
    side: "defender",
    primaries: ["MP5K", "M590A1"],
    secondaries: ["P226 Mk 25", "SMG-11"],
    gadgets: ["Bulletproof Camera", "Nitro Cell"],
    roles: ["Intel Denier", "Lurker"]
  },

  // --- PATHFINDERS (FBI SWAT) ---
  {
    id: "ash",
    name: "Ash",
    side: "attacker",
    primaries: ["G36C", "R4-C"],
    secondaries: ["5.7 USG", "M45 MEUSOC"],
    gadgets: ["Breach Charge", "Claymore"],
    roles: ["Soft Breacher", "Entry Fragger"]
  },
  {
    id: "thermite",
    name: "Thermite",
    side: "attacker",
    primaries: ["M1014", "556xi"],
    secondaries: ["5.7 USG", "M45 MEUSOC"],
    gadgets: ["Smoke Grenade", "Stun Grenade"],
    roles: ["Hard Breacher", "Support"]
  },
  {
    id: "castle",
    name: "Castle",
    side: "defender",
    primaries: ["UMP45", "M1014"],
    secondaries: ["5.7 USG", "M45 MEUSOC", "Super Shorty"],
    gadgets: ["Bulletproof Camera", "Proximity Alarm"],
    roles: ["Anchor", "Area Denial"]
  },
  {
    id: "pulse",
    name: "Pulse",
    side: "defender",
    primaries: ["UMP45", "M1014"],
    secondaries: ["5.7 USG", "M45 MEUSOC"],
    gadgets: ["Barbed Wire", "Nitro Cell"],
    roles: ["Intel / Camera", "Anchor"]
  },

  // --- PATHFINDERS (GIGN) ---
  {
    id: "twitch",
    name: "Twitch",
    side: "attacker",
    primaries: ["F2", "417", "SG-CQB"],
    secondaries: ["P9", "LFP586"],
    gadgets: ["Claymore", "Smoke Grenade"],
    roles: ["Support", "Intel / Recon"]
  },
  {
    id: "montagne",
    name: "Montagne",
    side: "attacker",
    primaries: ["Le Roc Shield"],
    secondaries: ["P9", "LFP586"],
    gadgets: ["Hard Breach Charge", "Smoke Grenade", "Emp Grenade"],
    roles: ["Shield", "Support"]
  },
  {
    id: "doc",
    name: "Doc",
    side: "defender",
    primaries: ["MP5", "P90", "SG-CQB"],
    secondaries: ["P9", "LFP586", "Bailiff 410"],
    gadgets: ["Bulletproof Camera", "Barbed Wire"],
    roles: ["Anchor", "Support"]
  },
  {
    id: "rook",
    name: "Rook",
    side: "defender",
    primaries: ["MP5", "P90", "SG-CQB"],
    secondaries: ["P9", "LFP586"],
    gadgets: ["Proximity Alarm", "Impact Grenade"],
    roles: ["Anchor", "Anti-Breach"]
  },

  // --- PATHFINDERS (SPETSNAZ) ---
  {
    id: "glaz",
    name: "Glaz",
    side: "attacker",
    primaries: ["OTs-03"],
    secondaries: ["PMM", "GSH-18", "Bearing 9"],
    gadgets: ["Smoke Grenade", "Frag Grenade", "Claymore"],
    roles: ["Flank Watch", "Support"]
  },
  {
    id: "fuze",
    name: "Fuze",
    side: "attacker",
    primaries: ["AK-12", "6P41", "Ballistic Shield"],
    secondaries: ["PMM", "GSH-18"],
    gadgets: ["Breach Charge", "Hard Breach Charge", "Smoke Grenade"],
    roles: ["Soft Breacher", "Flank Watch"]
  },
  {
    id: "kapkan",
    name: "Kapkan",
    side: "defender",
    primaries: ["9x19VSN", "SASG-12"],
    secondaries: ["PMM", "GSH-18"],
    gadgets: ["Barbed Wire", "Bulletproof Camera"],
    roles: ["Trap Operator", "Roamer"]
  },
  {
    id: "tachanka",
    name: "Tachanka",
    side: "defender",
    primaries: ["DP27", "9x19VSN"],
    secondaries: ["PMM", "GSH-18", "Bearing 9"],
    gadgets: ["Barbed Wire", "Proximity Alarm"],
    roles: ["Anchor", "Area Denial"]
  },

  // --- PATHFINDERS (GSG 9) ---
  {
    id: "blitz",
    name: "Blitz",
    side: "attacker",
    primaries: ["G52-Tactical Shield"],
    secondaries: ["P12"],
    gadgets: ["Smoke Grenade", "Breach Charge"],
    roles: ["Shield", "Entry Fragger"]
  },
  {
    id: "iq",
    name: "IQ",
    side: "attacker",
    primaries: ["AUG A2", "552 Commando", "G8A1"],
    secondaries: ["P12"],
    gadgets: ["Breach Charge", "Claymore", "Frag Grenade"],
    roles: ["Intel / Recon", "Support"]
  },
  {
    id: "jager",
    name: "Jäger",
    side: "defender",
    primaries: ["416-C Carbine", "M870"],
    secondaries: ["P12", "P-10C"],
    gadgets: ["Observation Blocker", "Bulletproof Camera"],
    roles: ["Anchor", "Anti-Breach"]
  },
  {
    id: "bandit",
    name: "Bandit",
    side: "defender",
    primaries: ["MP7", "M870"],
    secondaries: ["P12"],
    gadgets: ["Barbed Wire", "Nitro Cell"],
    roles: ["Anti-Breach", "Trap Operator"]
  },

  // --- YEAR 1 (JTF2, NAVY SEALs, BOPE, SAT) ---
  {
    id: "buck",
    name: "Buck",
    side: "attacker",
    primaries: ["C8-SFW", "CAMRS"],
    secondaries: ["Mk1 9mm"],
    gadgets: ["Stun Grenade", "Hard Breach Charge"],
    roles: ["Soft Breacher", "Entry Fragger"]
  },
  {
    id: "frost",
    name: "Frost",
    side: "defender",
    primaries: ["Super 90", "9mm C1"],
    secondaries: ["Mk1 9mm", "ITA12S"],
    gadgets: ["Bulletproof Camera", "Deployable Shield"],
    roles: ["Trap Operator", "Anchor"]
  },
  {
    id: "blackbeard",
    name: "Blackbeard",
    side: "attacker",
    primaries: ["Mk17 CQB", "SR-25"],
    secondaries: ["D-50"],
    gadgets: ["Claymore", "Stun Grenade"],
    roles: ["Entry Fragger", "Support"]
  },
  {
    id: "valkyrie",
    name: "Valkyrie",
    side: "defender",
    primaries: ["MPX", "SPAS-12"],
    secondaries: ["D-50"],
    gadgets: ["Impact Grenade", "Nitro Cell"],
    roles: ["Intel / Camera", "Roamer"]
  },
  {
    id: "capitao",
    name: "Capitao",
    side: "attacker",
    primaries: ["PARA-308", "M249"],
    secondaries: ["PRB92"],
    gadgets: ["Claymore", "Hard Breach Charge", "Emp Grenade"],
    roles: ["Hard Breacher", "Support"]
  },
  {
    id: "caveira",
    name: "Caveira",
    side: "defender",
    primaries: ["M12", "SPAS-15"],
    secondaries: ["Luison"],
    gadgets: ["Impact Grenade", "Proximity Alarm"],
    roles: ["Roamer", "Lurker"]
  },
  {
    id: "hibana",
    name: "Hibana",
    side: "attacker",
    primaries: ["Type-89", "SuperNova"],
    secondaries: ["P229", "Bearing 9"],
    gadgets: ["Stun Grenade", "Breach Charge"],
    roles: ["Hard Breacher", "Entry Fragger"]
  },
  {
    id: "echo",
    name: "Echo",
    side: "defender",
    primaries: ["MP5SD", "SuperNova"],
    secondaries: ["P229", "Bearing 9"],
    gadgets: ["Impact Grenade", "Deployable Shield"],
    roles: ["Intel / Camera", "Anchor"]
  },

  // --- YEAR 2 (GEO, SDU, GROM, 707th) ---
  {
    id: "jackal",
    name: "Jackal",
    side: "attacker",
    primaries: ["C7E", "PDW9", "ITA12L"],
    secondaries: ["USP40", "ITA12S"],
    gadgets: ["Claymore", "Smoke Grenade"],
    roles: ["Intel / Recon", "Flank Watch"]
  },
  {
    id: "mira",
    name: "Mira",
    side: "defender",
    primaries: ["Vector .45 ACP", "ITA12L"],
    secondaries: ["USP40", "ITA12S"],
    gadgets: ["Nitro Cell", "Proximity Alarm"],
    roles: ["Anchor", "Intel / Camera"]
  },
  {
    id: "lesion",
    name: "Lesion",
    side: "defender",
    primaries: ["T-5 SMG", "SIX12 SD"],
    secondaries: ["Q-929", "Super Shorty"],
    gadgets: ["Impact Grenade", "Bulletproof Camera"],
    roles: ["Trap Operator", "Lurker"]
  },
  {
    id: "ying",
    name: "Ying",
    side: "attacker",
    primaries: ["T-95 LSW", "SIX12"],
    secondaries: ["Q-929"],
    gadgets: ["Hard Breach Charge", "Smoke Grenade"],
    roles: ["Entry Fragger", "Support"]
  },
  {
    id: "ela",
    name: "Ela",
    side: "defender",
    primaries: ["Scorpion EVO 3 A1", "FO-12"],
    secondaries: ["RG15"],
    gadgets: ["Barbed Wire", "Deployable Shield"],
    roles: ["Roamer", "Trap Operator"]
  },
  {
    id: "zofia",
    name: "Zofia",
    side: "attacker",
    primaries: ["LMG-E", "M762"],
    secondaries: ["RG15"],
    gadgets: ["Breach Charge", "Claymore"],
    roles: ["Soft Breacher", "Entry Fragger", "Support"]
  },
  {
    id: "dokkaebi",
    name: "Dokkaebi",
    side: "attacker",
    primaries: ["Mk 14 EBR", "BOSG.12.2"],
    secondaries: ["C75 Auto", "SMG-12", "Gonne-6"],
    gadgets: ["Smoke Grenade", "Stun Grenade", "Emp Grenade"],
    roles: ["Intel / Recon", "Entry Fragger"]
  },
  {
    id: "vigil",
    name: "Vigil",
    side: "defender",
    primaries: ["K1A", "BOSG.12.2"],
    secondaries: ["C75 Auto", "SMG-12"],
    gadgets: ["Impact Grenade", "Bulletproof Camera"],
    roles: ["Roamer", "Lurker"]
  },

  // --- YEAR 3 (CBRN, GIS, GSUTR, GIGR) ---
  {
    id: "lion",
    name: "Lion",
    side: "attacker",
    primaries: ["V308", "417", "SG-CQB"],
    secondaries: ["P9", "LFP586", "Gonne-6"],
    gadgets: ["Stun Grenade", "Claymore", "Frag Grenade"],
    roles: ["Support", "Intel / Recon"]
  },
  {
    id: "finka",
    name: "Finka",
    side: "attacker",
    primaries: ["Spear .308", "6P41", "SASG-12"],
    secondaries: ["PMM", "GSH-18", "Gonne-6"],
    gadgets: ["Smoke Grenade", "Stun Grenade", "Frag Grenade"],
    roles: ["Support", "Entry Fragger"]
  },
  {
    id: "maestro",
    name: "Maestro",
    side: "defender",
    primaries: ["ALDA 5.56", "ACS12"],
    secondaries: ["Keratos .357", "Bailiff 410"],
    gadgets: ["Barbed Wire", "Impact Grenade", "Observation Blocker"],
    roles: ["Intel / Camera", "Anchor"]
  },
  {
    id: "alibi",
    name: "Alibi",
    side: "defender",
    primaries: ["Mx4 Storm", "ACS12"],
    secondaries: ["Keratos .357", "Bailiff 410"],
    gadgets: ["Impact Grenade", "Proxy Alarm", "Observation Blocker"],
    roles: ["Intel / Camera", "Roamer"]
  },
  {
    id: "maverick",
    name: "Maverick",
    side: "attacker",
    primaries: ["AR-15.50", "M4"],
    secondaries: ["1911 TACOPS"],
    gadgets: ["Frag Grenade", "Claymore", "Stun Grenade"],
    roles: ["Hard Breacher", "Entry Fragger"]
  },
  {
    id: "clash",
    name: "Clash",
    side: "defender",
    primaries: ["CCE Shield"],
    secondaries: ["Super Shorty", "SPSMG9"],
    gadgets: ["Barbed Wire", "Impact Grenade"],
    roles: ["Shield", "Area Denial"]
  },
  {
    id: "nomad",
    name: "Nomad",
    side: "attacker",
    primaries: ["AK-74M", "ARX200"],
    secondaries: [".44 Mag Semi-Auto", "PRB92"],
    gadgets: ["Breach Charge", "Stun Grenade"],
    roles: ["Flank Watch", "Support"]
  },
  {
    id: "kaid",
    name: "Kaid",
    side: "defender",
    primaries: ["AUG A3", "TCSG12"],
    secondaries: [".44 Mag Semi-Auto", "LFP586"],
    gadgets: ["Barbed Wire", "Nitro Cell", "Observation Blocker"],
    roles: ["Anti-Breach", "Anchor"]
  },

  // --- YEAR 4 ---
  {
    id: "gridlock",
    name: "Gridlock",
    side: "attacker",
    primaries: ["F90", "M249 SAW"],
    secondaries: ["Super Shorty", "SDP 9mm", "Gonne-6"],
    gadgets: ["Smoke Grenade", "Breach Charge", "Emp Grenade", "Frag Grenade"],
    roles: ["Flank Watch", "Support"]
  },
  {
    id: "mozzie",
    name: "Mozzie",
    side: "defender",
    primaries: ["Commando 9", "P10 RONI"],
    secondaries: ["SDP 9mm"],
    gadgets: ["Barbed Wire", "Nitro Cell"],
    roles: ["Intel Denier", "Roamer"]
  },
  {
    id: "nokk",
    name: "Nokk",
    side: "attacker",
    primaries: ["FMG-9", "SIX12 SD"],
    secondaries: ["5.7 USG", "D-50"],
    gadgets: ["Frag Grenade", "Hard Breach Charge", "Emp Grenade"],
    roles: ["Entry Fragger", "Intel / Recon"]
  },
  {
    id: "warden",
    name: "Warden",
    side: "defender",
    primaries: ["MPX", "M590A1"],
    secondaries: ["P-10C", "SMG-12"],
    gadgets: ["Nitro Cell", "Deployable Shield", "Observation Blocker"],
    roles: ["Intel Denier", "Anchor"]
  },
  {
    id: "amaru",
    name: "Amaru",
    side: "attacker",
    primaries: ["G8A1", "SuperNova"],
    secondaries: ["ITA12S", "SMG-11", "Gonne-6"],
    gadgets: ["Stun Grenade", "Hard Breach Charge"],
    roles: ["Entry Fragger", "Flank Watch"]
  },
  {
    id: "goyo",
    name: "Goyo",
    side: "defender",
    primaries: ["Vector .45 ACP", "TCSG12"],
    secondaries: ["P229"],
    gadgets: ["Proximity Alarm", "Nitro Cell", "Bulletproof Camera"],
    roles: ["Area Denial", "Anchor"]
  },
  {
    id: "kali",
    name: "Kali",
    side: "attacker",
    primaries: ["CSRX 300"],
    secondaries: ["C75 Auto", "SPSMG9"],
    gadgets: ["Breach Charge", "Claymore", "Smoke Grenade"],
    roles: ["Hard Breacher", "Intel / Recon"]
  },
  {
    id: "wamai",
    name: "Wamai",
    side: "defender",
    primaries: ["AUG A2", "MP5K"],
    secondaries: ["D-50", "P12"],
    gadgets: ["Impact Grenade", "Proximity Alarm"],
    roles: ["Anti-Breach", "Roamer"]
  },

  // --- YEAR 5 ---
  {
    id: "iana",
    name: "Iana",
    side: "attacker",
    primaries: ["ARX200", "G36C"],
    secondaries: ["Mk1 9mm", "Gonne-6"],
    gadgets: ["Smoke Grenade", "Stun Grenade"],
    roles: ["Entry Fragger", "Intel / Recon"]
  },
  {
    id: "oryx",
    name: "Oryx",
    side: "defender",
    primaries: ["T-5 SMG", "SPAS-12"],
    secondaries: ["Bailiff 410", "USP40"],
    gadgets: ["Barbed Wire", "Proximity Alarm"],
    roles: ["Roamer", "Anchor"]
  },
  {
    id: "ace",
    name: "Ace",
    side: "attacker",
    primaries: ["AK-12", "M1014"],
    secondaries: ["P9"],
    gadgets: ["Breach Charge", "Claymore"],
    roles: ["Hard Breacher", "Soft Breacher"]
  },
  {
    id: "melusi",
    name: "Melusi",
    side: "defender",
    primaries: ["MP5", "Super 90"],
    secondaries: ["RG15"],
    gadgets: ["Impact Grenade", "Bulletproof Camera"],
    roles: ["Trap Operator", "Area Denial"]
  },
  {
    id: "zero",
    name: "Zero",
    side: "attacker",
    primaries: ["SC3000K", "MP7"],
    secondaries: ["5.7 USG", "Gonne-6"],
    gadgets: ["Hard Breach Charge", "Claymore"],
    roles: ["Intel / Recon", "Hard Breacher"]
  },
  {
    id: "aruni",
    name: "Aruni",
    side: "defender",
    primaries: ["P10 RONI", "Mk 14 EBR"],
    secondaries: ["PRB92"],
    gadgets: ["Barbed Wire", "Bulletproof Camera"],
    roles: ["Anchor", "Intel Denier"]
  },

  // --- YEAR 6 ---
  {
    id: "flores",
    name: "Flores",
    side: "attacker",
    primaries: ["AR33", "SR-25"],
    secondaries: ["GSH-18"],
    gadgets: ["Stun Grenade", "Claymore"],
    roles: ["Soft Breacher", "Support"]
  },
  {
    id: "thunderbird",
    name: "Thunderbird",
    side: "defender",
    primaries: ["Spear .308", "SPAS-15"],
    secondaries: ["Bearing 9", "Q-929"],
    gadgets: ["Barbed Wire", "Bulletproof Camera"],
    roles: ["Anchor", "Support"]
  },
  {
    id: "osa",
    name: "Osa",
    side: "attacker",
    primaries: ["556xi", "PDW9"],
    secondaries: ["PMM"],
    gadgets: ["Claymore", "Smoke Grenade", "Emp Grenade", "Frag Grenade"],
    roles: ["Support", "Entry Fragger"]
  },
  {
    id: "thorn",
    name: "Thorn",
    side: "defender",
    primaries: ["UZK50GI", "M870"],
    secondaries: ["1911 TACOPS", "C75 Auto"],
    gadgets: ["Deployable Shield", "Barbed Wire"],
    roles: ["Trap Operator", "Roamer"]
  },

  // --- YEAR 7 ---
  {
    id: "azami",
    name: "Azami",
    side: "defender",
    primaries: ["9x19VSN", "ACS12"],
    secondaries: ["D-50"],
    gadgets: ["Impact Grenade", "Barbed Wire"],
    roles: ["Anchor", "Area Denial"]
  },
  {
    id: "sens",
    name: "Sens",
    side: "attacker",
    primaries: ["POF-9", "417"],
    secondaries: ["SDP 9mm", "Gonne-6"],
    gadgets: ["Hard Breach Charge", "Claymore", "Frag Grenade"],
    roles: ["Intel / Recon", "Support"]
  },
  {
    id: "grim",
    name: "Grim",
    side: "attacker",
    primaries: ["552 Commando", "SG-CQB"],
    secondaries: ["P229", "Bailiff 410"],
    gadgets: ["Breach Charge", "Claymore", "Emp Grenade", "Hard Breach Charge"],
    roles: ["Support", "Intel / Recon"]
  },
  {
    id: "solis",
    name: "Solis",
    side: "defender",
    primaries: ["P90", "ITA12L"],
    secondaries: ["SMG-11"],
    gadgets: ["Impact Grenade", "Bulletproof Camera"],
    roles: ["Intel / Camera", "Roamer"]
  },

  // --- YEAR 8 ---
  {
    id: "brava",
    name: "Brava",
    side: "attacker",
    primaries: ["PARA-308", "CAMRS"],
    secondaries: ["Super Shorty", "USP40"],
    gadgets: ["Smoke Grenade", "Claymore"],
    roles: ["Intel / Recon", "Entry Fragger"]
  },
  {
    id: "fenrir",
    name: "Fenrir",
    side: "defender",
    primaries: ["MP7", "SASG-12"],
    secondaries: ["Bailiff 410", "5.7 USG"],
    gadgets: ["Barbed Wire", "Bulletproof Camera", "Observation Blocker"],
    roles: ["Trap Operator", "Intel / Camera"]
  },
  {
    id: "ram",
    name: "Ram",
    side: "attacker",
    primaries: ["R4-C", "LMG-E"],
    secondaries: ["ITA12S", "Mk1 9mm"],
    gadgets: ["Stun Grenade", "Smoke Grenade"],
    roles: ["Entry Fragger", "Soft Breacher"]
  },
  {
    id: "tubarao",
    name: "Tubarao",
    side: "defender",
    primaries: ["MPX", "AR-15.50"],
    secondaries: ["P226 Mk 25"],
    gadgets: ["Nitro Cell", "Proximity Alarm"],
    roles: ["Lurker", "Roamer"]
  },

  // --- YEAR 9 ---
  {
    id: "deimos",
    name: "Deimos",
    side: "attacker",
    primaries: ["AK-74M", "M590A1"],
    secondaries: ["44 Vendetta"],
    gadgets: ["Frag Grenade", "Hard Breach Charge"],
    roles: ["Entry Fragger", "Flank Watch"]
  },
  {
    id: "striker",
    name: "Striker",
    side: "attacker",
    primaries: ["M4", "M249"],
    secondaries: ["5.7 USG", "ITA12S"],
    gadgets: ["Frag Grenade", "Stun Grenade", "Smoke Grenade", "Breach Charge", "Hard Breach Charge", "Claymore", "Emp Grenade"],
    roles: ["Entry Fragger", "Flex"]
  },
  {
    id: "sentry",
    name: "Sentry",
    side: "defender",
    primaries: ["Commando 9", "M870"],
    secondaries: ["C75 Auto", "Super Shorty"],
    gadgets: ["Nitro Cell", "Impact Grenade", "Barbed Wire", "Deployable Shield", "Bulletproof Camera", "Proximity Alarm", "Observation Blocker"],
    roles: ["Anchor", "Intel / Camera"]
  },
  {
    id: "skopos",
    name: "Skopos",
    side: "defender",
    primaries: ["PCX-33"],
    secondaries: ["P229"],
    gadgets: ["Impact Grenade", "Proximity Alarm"],
    roles: ["Intel / Camera", "Roamer"]
  },

  // --- YEAR 10 ---
  {
    id: "denari",
    name: "Denari",
    side: "defender",
    primaries: ["C8-SFW", "PDW9"],
    secondaries: ["D-50"],
    gadgets: ["Stun Grenade", "Breach Charge"],
    roles: ["Roamer", "Intel Denier"]
  },
  {
    id: "rauora",
    name: "Rauora",
    side: "attacker",
    primaries: ["SC-4000K", "FO-12"],
    secondaries: ["Keratos .357"],
    gadgets: ["Barbed Wire", "Observation Blocker"],
    roles: ["Entry Fragger", "Support"]
  },

  // --- GUESTS ---
  {
    id: "snake",
    name: "Solid Snake",
    side: "attacker",
    primaries: ["F2", "PMR90A2"],
    secondaries: ["TACIT .45"],
    gadgets: ["Frag Grenade", "Stun Grenade", "Impact EMP Grenade"],
    roles: ["Entry Fragger", "Intel / Recon"]
  }
];

export const attackers = operators.filter(op => op.side === 'attacker');
export const defenders = operators.filter(op => op.side === 'defender');

export function getRandomOperator(side?: Side): Operator {
  const pool = side ? (side === 'attacker' ? attackers : defenders) : operators;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function generateLoadout(op: Operator): Loadout {
  // Use the best meta loadout if available for this operator
  const best = bestLoadouts[op.id];
  if (best) {
    return { ...best };
  }

  // Fallback to random selection if no best loadout is defined
  const primary = op.primaries[Math.floor(Math.random() * op.primaries.length)];
  const secondary = op.secondaries[Math.floor(Math.random() * op.secondaries.length)];
  const gadget = op.gadgets[Math.floor(Math.random() * op.gadgets.length)];

  return {
    primary,
    secondary,
    gadget
  };
}

export const MATCH_TYPES: MatchType[] = ['Ranked', 'Unranked', 'Quick Match', 'Deathmatch'];

export function getRandomMatchType(): MatchType {
  return MATCH_TYPES[Math.floor(Math.random() * MATCH_TYPES.length)];
}

export function getRandomPlatform(): Platform {
  return Math.random() < 0.5 ? 'PC' : 'Console';
}

export function getRandomTargetKills(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function getRandomRole(operator: Operator): string {
  if (!operator.roles || operator.roles.length === 0) {
    return operator.side === 'attacker' ? 'Flex' : 'Flex';
  }
  return operator.roles[Math.floor(Math.random() * operator.roles.length)];
}
