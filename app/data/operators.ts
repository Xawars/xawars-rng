import { Operator, Side, Loadout } from './types';

// FULL ROSTER (Pathfinder - Year 10)
export const operators: Operator[] = [
  // --- PATHFINDERS (SAS) ---
  {
    id: "sledge",
    name: "Sledge",
    side: "attacker",
    primaries: ["L85A2", "M590A1"],
    secondaries: ["P226 Mk 25", "Reaper Mk2"],
    gadgets: ["Frag Grenade", "Stun Grenade", "Impact EMP Grenade"]
  },
  {
    id: "thatcher",
    name: "Thatcher",
    side: "attacker",
    primaries: ["AR33", "L85A2", "M590A1"],
    secondaries: ["P226 Mk 25"],
    gadgets: ["Breach Charge", "Claymore"]
  },
  {
    id: "smoke",
    name: "Smoke",
    side: "defender",
    primaries: ["FMG-9", "M590A1"],
    secondaries: ["P226 Mk 25", "SMG-11"],
    gadgets: ["Barbed Wire", "Proximity Alarm"]
  },
  {
    id: "mute",
    name: "Mute",
    side: "defender",
    primaries: ["MP5K", "M590A1"],
    secondaries: ["P226 Mk 25", "SMG-11"],
    gadgets: ["Bulletproof Camera", "Nitro Cell"]
  },

  // --- PATHFINDERS (FBI SWAT) ---
  {
    id: "ash",
    name: "Ash",
    side: "attacker",
    primaries: ["G36C", "R4-C"],
    secondaries: ["5.7 USG", "M45 MEUSOC"],
    gadgets: ["Breach Charge", "Claymore"]
  },
  {
    id: "thermite",
    name: "Thermite",
    side: "attacker",
    primaries: ["M1014", "556xi"],
    secondaries: ["5.7 USG", "M45 MEUSOC"],
    gadgets: ["Smoke Grenade", "Stun Grenade"]
  },
  {
    id: "castle",
    name: "Castle",
    side: "defender",
    primaries: ["UMP45", "M1014"],
    secondaries: ["5.7 USG", "M45 MEUSOC", "Super Shorty"],
    gadgets: ["Bulletproof Camera", "Proximity Alarm"]
  },
  {
    id: "pulse",
    name: "Pulse",
    side: "defender",
    primaries: ["UMP45", "M1014"],
    secondaries: ["5.7 USG", "M45 MEUSOC"],
    gadgets: ["Barbed Wire", "Nitro Cell"]
  },

  // --- PATHFINDERS (GIGN) ---
  {
    id: "twitch",
    name: "Twitch",
    side: "attacker",
    primaries: ["F2", "417", "SG-CQB"],
    secondaries: ["P9", "LFP586"],
    gadgets: ["Claymore", "Smoke Grenade"]
  },
  {
    id: "montagne",
    name: "Montagne",
    side: "attacker",
    primaries: ["Le Roc Shield"],
    secondaries: ["P9", "LFP586"],
    gadgets: ["Hard Breach Charge", "Smoke Grenade", "Emp Grenade"]
  },
  {
    id: "doc",
    name: "Doc",
    side: "defender",
    primaries: ["MP5", "P90", "SG-CQB"],
    secondaries: ["P9", "LFP586", "Bailiff 410"],
    gadgets: ["Bulletproof Camera", "Barbed Wire"]
  },
  {
    id: "rook",
    name: "Rook",
    side: "defender",
    primaries: ["MP5", "P90", "SG-CQB"],
    secondaries: ["P9", "LFP586"],
    gadgets: ["Proximity Alarm", "Impact Grenade"]
  },

  // --- PATHFINDERS (SPETSNAZ) ---
  {
    id: "glaz",
    name: "Glaz",
    side: "attacker",
    primaries: ["OTs-03"],
    secondaries: ["PMM", "GSH-18", "Bearing 9"],
    gadgets: ["Smoke Grenade", "Frag Grenade", "Claymore"]
  },
  {
    id: "fuze",
    name: "Fuze",
    side: "attacker",
    primaries: ["AK-12", "6P41", "Ballistic Shield"],
    secondaries: ["PMM", "GSH-18"],
    gadgets: ["Breach Charge", "Hard Breach Charge", "Smoke Grenade"]
  },
  {
    id: "kapkan",
    name: "Kapkan",
    side: "defender",
    primaries: ["9x19VSN", "SASG-12"],
    secondaries: ["PMM", "GSH-18"],
    gadgets: ["Impact Grenade", "Nitro Cell"]
  },
  {
    id: "tachanka",
    name: "Tachanka",
    side: "defender",
    primaries: ["DP27", "9x19VSN"],
    secondaries: ["PMM", "GSH-18", "Bearing 9"],
    gadgets: ["Barbed Wire", "Proximity Alarm"]
  },

  // --- PATHFINDERS (GSG 9) ---
  {
    id: "blitz",
    name: "Blitz",
    side: "attacker",
    primaries: ["G52-Tactical Shield"],
    secondaries: ["P12"],
    gadgets: ["Smoke Grenade", "Breach Charge"]
  },
  {
    id: "iq",
    name: "IQ",
    side: "attacker",
    primaries: ["AUG A2", "552 Commando", "G8A1"],
    secondaries: ["P12"],
    gadgets: ["Breach Charge", "Claymore", "Frag Grenade"]
  },
  {
    id: "jager",
    name: "Jäger",
    side: "defender",
    primaries: ["416-C Carbine", "M870"],
    secondaries: ["P12", "P-10C"],
    gadgets: ["Observation Blocker", "Bulletproof Camera"]
  },
  {
    id: "bandit",
    name: "Bandit",
    side: "defender",
    primaries: ["MP7", "M870"],
    secondaries: ["P12"],
    gadgets: ["Barbed Wire", "Nitro Cell"]
  },

  // --- YEAR 1 (JTF2, NAVY SEALs, BOPE, SAT) ---
  {
    id: "buck",
    name: "Buck",
    side: "attacker",
    primaries: ["C8-SFW", "CAMRS"],
    secondaries: ["Mk1 9mm"],
    gadgets: ["Stun Grenade", "Hard Breach Charge"]
  },
  {
    id: "frost",
    name: "Frost",
    side: "defender",
    primaries: ["Super 90", "9mm C1"],
    secondaries: ["Mk1 9mm", "ITA12S"],
    gadgets: ["Bulletproof Camera", "Deployable Shield"]
  },
  {
    id: "blackbeard",
    name: "Blackbeard",
    side: "attacker",
    primaries: ["Mk17 CQB", "SR-25"],
    secondaries: ["D-50"],
    gadgets: ["Claymore", "Stun Grenade"]
  },
  {
    id: "valkyrie",
    name: "Valkyrie",
    side: "defender",
    primaries: ["MPX", "SPAS-12"],
    secondaries: ["D-50"],
    gadgets: ["Impact Grenade", "Nitro Cell"]
  },
  {
    id: "capitao",
    name: "Capitao",
    side: "attacker",
    primaries: ["PARA-308", "M249"],
    secondaries: ["PRB92"],
    gadgets: ["Claymore", "Hard Breach Charge", "Emp Grenade"]
  },
  {
    id: "caveira",
    name: "Caveira",
    side: "defender",
    primaries: ["M12", "SPAS-15"],
    secondaries: ["Luison"],
    gadgets: ["Impact Grenade", "Proximity Alarm"]
  },
  {
    id: "hibana",
    name: "Hibana",
    side: "attacker",
    primaries: ["Type-89", "SuperNova"],
    secondaries: ["P229", "Bearing 9"],
    gadgets: ["Stun Grenade", "Breach Charge"] 
  },
  {
    id: "echo",
    name: "Echo",
    side: "defender",
    primaries: ["MP5SD", "SuperNova"],
    secondaries: ["P229", "Bearing 9"],
    gadgets: ["Impact Grenade", "Deployable Shield"]
  },

  // --- YEAR 2 (GEO, SDU, GROM, 707th) ---
  {
    id: "jackal",
    name: "Jackal",
    side: "attacker",
    primaries: ["C7E", "PDW9", "ITA12L"],
    secondaries: ["USP40", "ITA12S"],
    gadgets: ["Claymore", "Smoke Grenade"]
  },
  {
    id: "mira",
    name: "Mira",
    side: "defender",
    primaries: ["Vector .45 ACP", "ITA12L"],
    secondaries: ["USP40", "ITA12S"],
    gadgets: ["Nitro Cell", "Proximity Alarm"]
  },
  {
    id: "lesion",
    name: "Lesion",
    side: "defender",
    primaries: ["T-5 SMG", "SIX12 SD"],
    secondaries: ["Q-929", "Super Shorty"],
    gadgets: ["Impact Grenade", "Bulletproof Camera"]
  },
  {
    id: "ying",
    name: "Ying",
    side: "attacker",
    primaries: ["T-95 LSW", "SIX12"],
    secondaries: ["Q-929"],
    gadgets: ["Hard Breach Charge", "Smoke Grenade"]
  },
  {
    id: "ela",
    name: "Ela",
    side: "defender",
    primaries: ["Scorpion EVO 3 A1", "FO-12"],
    secondaries: ["RG15"],
    gadgets: ["Barbed Wire", "Deployable Shield"]
  },
  {
    id: "zofia",
    name: "Zofia",
    side: "attacker",
    primaries: ["LMG-E", "M762"],
    secondaries: ["RG15"],
    gadgets: ["Breach Charge", "Claymore"]
  },
  {
    id: "dokkaebi",
    name: "Dokkaebi",
    side: "attacker",
    primaries: ["Mk 14 EBR", "BOSG.12.2"],
    secondaries: ["C75 Auto", "SMG-12", "Gonne-6"],
    gadgets: ["Smoke Grenade", "Stun Grenade", "Emp Grenade"]
  },
  {
    id: "vigil",
    name: "Vigil",
    side: "defender",
    primaries: ["K1A", "BOSG.12.2"],
    secondaries: ["C75 Auto", "SMG-12"],
    gadgets: ["Impact Grenade", "Bulletproof Camera"]
  },

  // --- YEAR 3 (CBRN, GIS, GSUTR, GIGR) ---
  {
    id: "lion",
    name: "Lion",
    side: "attacker",
    primaries: ["V308", "417", "SG-CQB"],
    secondaries: ["P9", "LFP586", "Gonne-6"],
    gadgets: ["Stun Grenade", "Claymore", "Frag Grenade"]
  },
  {
    id: "finka",
    name: "Finka",
    side: "attacker",
    primaries: ["Spear .308", "6P41", "SASG-12"],
    secondaries: ["PMM", "GSH-18", "Gonne-6"],
    gadgets: ["Smoke Grenade", "Stun Grenade", "Frag Grenade"]
  },
  {
    id: "maestro",
    name: "Maestro",
    side: "defender",
    primaries: ["ALDA 5.56", "ACS12"],
    secondaries: ["Keratos .357", "Bailiff 410"],
    gadgets: ["Barbed Wire", "Impact Grenade", "Observation Blocker"]
  },
  {
    id: "alibi",
    name: "Alibi",
    side: "defender",
    primaries: ["Mx4 Storm", "ACS12"],
    secondaries: ["Keratos .357", "Bailiff 410"],
    gadgets: ["Impact Grenade", "Proxy Alarm", "Observation Blocker"]
  },
  {
    id: "maverick",
    name: "Maverick",
    side: "attacker",
    primaries: ["AR-15.50", "M4"],
    secondaries: ["1911 TACOPS"],
    gadgets: ["Frag Grenade", "Claymore", "Stun Grenade"]
  },
  {
    id: "clash",
    name: "Clash",
    side: "defender",
    primaries: ["CCE Shield"],
    secondaries: ["Super Shorty", "SPSMG9"],
    gadgets: ["Barbed Wire", "Impact Grenade"]
  },
  {
    id: "nomad",
    name: "Nomad",
    side: "attacker",
    primaries: ["AK-74M", "ARX200"],
    secondaries: [".44 Mag Semi-Auto", "PRB92"],
    gadgets: ["Breach Charge", "Stun Grenade"]
  },
  {
    id: "kaid",
    name: "Kaid",
    side: "defender",
    primaries: ["AUG A3", "TCSG12"],
    secondaries: [".44 Mag Semi-Auto", "LFP586"],
    gadgets: ["Barbed Wire", "Nitro Cell", "Observation Blocker"]
  },

  // --- YEAR 4 ---
  {
    id: "gridlock",
    name: "Gridlock",
    side: "attacker",
    primaries: ["F90", "M249 SAW"],
    secondaries: ["Super Shorty", "SDP 9mm", "Gonne-6"],
    gadgets: ["Smoke Grenade", "Breach Charge", "Emp Grenade", "Frag Grenade"]
  },
  {
    id: "mozzie",
    name: "Mozzie",
    side: "defender",
    primaries: ["Commando 9", "P10 RONI"],
    secondaries: ["SDP 9mm"],
    gadgets: ["Barbed Wire", "Nitro Cell"]
  },
  {
    id: "nokk",
    name: "Nokk",
    side: "attacker",
    primaries: ["FMG-9", "SIX12 SD"],
    secondaries: ["5.7 USG", "D-50"],
    gadgets: ["Frag Grenade", "Hard Breach Charge", "Emp Grenade"]
  },
  {
    id: "warden",
    name: "Warden",
    side: "defender",
    primaries: ["MPX", "M590A1"],
    secondaries: ["P-10C", "SMG-12"],
    gadgets: ["Nitro Cell", "Deployable Shield", "Observation Blocker"]
  },
  {
    id: "amaru",
    name: "Amaru",
    side: "attacker",
    primaries: ["G8A1", "SuperNova"],
    secondaries: ["ITA12S", "SMG-11", "Gonne-6"],
    gadgets: ["Stun Grenade", "Hard Breach Charge"]
  },
  {
    id: "goyo",
    name: "Goyo",
    side: "defender",
    primaries: ["Vector .45 ACP", "TCSG12"],
    secondaries: ["P229"],
    gadgets: ["Proximity Alarm", "Nitro Cell", "Bulletproof Camera"]
  },
  {
    id: "kali",
    name: "Kali",
    side: "attacker",
    primaries: ["CSRX 300"],
    secondaries: ["C75 Auto", "SPSMG9"],
    gadgets: ["Breach Charge", "Claymore", "Smoke Grenade"]
  },
  {
    id: "wamai",
    name: "Wamai",
    side: "defender",
    primaries: ["AUG A2", "MP5K"],
    secondaries: ["D-50", "P12"],
    gadgets: ["Impact Grenade", "Proximity Alarm"]
  },

  // --- YEAR 5 ---
  {
    id: "iana",
    name: "Iana",
    side: "attacker",
    primaries: ["ARX200", "G36C"],
    secondaries: ["Mk1 9mm", "Gonne-6"],
    gadgets: ["Smoke Grenade", "Stun Grenade"]
  },
  {
    id: "oryx",
    name: "Oryx",
    side: "defender",
    primaries: ["T-5 SMG", "SPAS-12"],
    secondaries: ["Bailiff 410", "USP40"],
    gadgets: ["Barbed Wire", "Proximity Alarm"]
  },
  {
    id: "ace",
    name: "Ace",
    side: "attacker",
    primaries: ["AK-12", "M1014"],
    secondaries: ["P9"],
    gadgets: ["Breach Charge", "Claymore"]
  },
  {
    id: "melusi",
    name: "Melusi",
    side: "defender",
    primaries: ["MP5", "Super 90"],
    secondaries: ["RG15"],
    gadgets: ["Impact Grenade", "Bulletproof Camera"]
  },
  {
    id: "zero",
    name: "Zero",
    side: "attacker",
    primaries: ["SC3000K", "MP7"],
    secondaries: ["5.7 USG", "Gonne-6"],
    gadgets: ["Hard Breach Charge", "Claymore"]
  },
  {
    id: "aruni",
    name: "Aruni",
    side: "defender",
    primaries: ["P10 RONI", "Mk 14 EBR"],
    secondaries: ["PRB92"],
    gadgets: ["Barbed Wire", "Bulletproof Camera"]
  },

  // --- YEAR 6 ---
  {
    id: "flores",
    name: "Flores",
    side: "attacker",
    primaries: ["AR33", "SR-25"],
    secondaries: ["GSH-18"],
    gadgets: ["Stun Grenade", "Claymore"]
  },
  {
    id: "thunderbird",
    name: "Thunderbird",
    side: "defender",
    primaries: ["Spear .308", "SPAS-15"],
    secondaries: ["Bearing 9", "Q-929"],
    gadgets: ["Barbed Wire", "Bulletproof Camera"]
  },
  {
    id: "osa",
    name: "Osa",
    side: "attacker",
    primaries: ["556xi", "PDW9"],
    secondaries: ["PMM"],
    gadgets: ["Claymore", "Smoke Grenade", "Emp Grenade", "Frag Grenade"]
  },
  {
    id: "thorn",
    name: "Thorn",
    side: "defender",
    primaries: ["UZK50GI", "M870"],
    secondaries: ["1911 TACOPS", "C75 Auto"],
    gadgets: ["Deployable Shield", "Barbed Wire"]
  },

  // --- YEAR 7 ---
  {
    id: "azami",
    name: "Azami",
    side: "defender",
    primaries: ["9x19VSN", "ACS12"],
    secondaries: ["D-50"],
    gadgets: ["Impact Grenade", "Barbed Wire"]
  },
  {
    id: "sens",
    name: "Sens",
    side: "attacker",
    primaries: ["POF-9", "417"],
    secondaries: ["SDP 9mm", "Gonne-6"],
    gadgets: ["Hard Breach Charge", "Claymore", "Frag Grenade"]
  },
  {
    id: "grim",
    name: "Grim",
    side: "attacker",
    primaries: ["552 Commando", "SG-CQB"],
    secondaries: ["P229", "Bailiff 410"],
    gadgets: ["Breach Charge", "Claymore", "Emp Grenade", "Hard Breach Charge"]
  },
  {
    id: "solis",
    name: "Solis",
    side: "defender",
    primaries: ["P90", "ITA12L"],
    secondaries: ["SMG-11"],
    gadgets: ["Impact Grenade", "Bulletproof Camera"]
  },

  // --- YEAR 8 ---
  {
    id: "brava",
    name: "Brava",
    side: "attacker",
    primaries: ["PARA-308", "CAMRS"],
    secondaries: ["Super Shorty", "USP40"],
    gadgets: ["Smoke Grenade", "Claymore"]
  },
  {
    id: "fenrir",
    name: "Fenrir",
    side: "defender",
    primaries: ["MP7", "SASG-12"],
    secondaries: ["Bailiff 410", "5.7 USG"],
    gadgets: ["Barbed Wire", "Bulletproof Camera", "Observation Blocker"]
  },
  {
    id: "ram",
    name: "Ram",
    side: "attacker",
    primaries: ["R4-C", "LMG-E"],
    secondaries: ["ITA12S", "Mk1 9mm"],
    gadgets: ["Stun Grenade", "Smoke Grenade"]
  },
  {
    id: "tubarao",
    name: "Tubarao",
    side: "defender",
    primaries: ["MPX", "AR-15.50"],
    secondaries: ["P226 Mk 25"],
    gadgets: ["Nitro Cell", "Proximity Alarm"]
  },

  // --- YEAR 9 ---
  {
    id: "deimos",
    name: "Deimos",
    side: "attacker",
    primaries: ["AK-74M", "M590A1"],
    secondaries: ["44 Vendetta"],
    gadgets: ["Frag Grenade", "Hard Breach Charge"]
  },
  {
    id: "striker",
    name: "Striker",
    side: "attacker",
    primaries: ["M4", "M249"],
    secondaries: ["5.7 USG", "ITA12S"],
    gadgets: ["Frag Grenade", "Stun Grenade", "Smoke Grenade", "Breach Charge", "Hard Breach Charge", "Claymore", "Emp Grenade"] 
  },
  {
    id: "sentry",
    name: "Sentry",
    side: "defender",
    primaries: ["Commando 9", "M870"],
    secondaries: ["C75 Auto", "Super Shorty"],
    gadgets: ["Nitro Cell", "Impact Grenade", "Barbed Wire", "Deployable Shield", "Bulletproof Camera", "Proximity Alarm", "Observation Blocker"]
  },
  {
    id: "skopos",
    name: "Skopos",
    side: "defender",
    primaries: ["PCX-33"],
    secondaries: ["P229"],
    gadgets: ["Impact Grenade", "Proximity Alarm"]
  },

  // --- YEAR 10 ---
  {
    id: "denari",
    name: "Denari",
    side: "defender",
    primaries: ["C8-SFW", "PDW9"],
    secondaries: ["D-50"],
    gadgets: ["Stun Grenade", "Breach Charge"]
  },
  {
    id: "rauora",
    name: "Rauora",
    side: "attacker", 
    primaries: ["SC-4000K", "FO-12"],
    secondaries: ["Keratos .357"],
    gadgets: ["Barbed Wire", "Observation Blocker"]
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
  const primary = op.primaries[Math.floor(Math.random() * op.primaries.length)];
  const secondary = op.secondaries[Math.floor(Math.random() * op.secondaries.length)];
  const gadget = op.gadgets[Math.floor(Math.random() * op.gadgets.length)];

  return {
    primary,
    secondary,
    gadget
  };
}
