import { Loadout } from './types';

/**
 * Best meta loadouts for every operator based on community and guide analysis
 * for Year 11 Season 1-2 era competitive/ranked play.
 *
 * Source: docs/Best Loadouts for Every Operator in Rainbow Six Siege.md
 *
 * These map operator IDs to their recommended primary, secondary, and gadget.
 * When an operator is deployed, this loadout is used instead of a random pick.
 */
export const bestLoadouts: Record<string, Loadout> = {
  // ===== ATTACKERS =====

  striker: {
    primary: "M4",
    secondary: "ITA12S",
    gadget: "Frag Grenade",
  },
  sledge: {
    primary: "L85A2",
    secondary: "Reaper Mk2",
    gadget: "Frag Grenade",
  },
  thatcher: {
    primary: "L85A2",
    secondary: "P226 Mk 25",
    gadget: "Claymore",
  },
  ash: {
    primary: "R4-C",
    secondary: "5.7 USG",
    gadget: "Claymore",
  },
  thermite: {
    primary: "556xi",
    secondary: "ITA12S",
    gadget: "Stun Grenade",
  },
  twitch: {
    primary: "417",
    secondary: "P9",
    gadget: "Smoke Grenade",
  },
  montagne: {
    primary: "Le Roc Shield",
    secondary: "P9",
    gadget: "Smoke Grenade",
  },
  glaz: {
    primary: "OTs-03",
    secondary: "Bearing 9",
    gadget: "Smoke Grenade",
  },
  fuze: {
    primary: "AK-12",
    secondary: "PMM",
    gadget: "Hard Breach Charge",
  },
  blitz: {
    primary: "G52-Tactical Shield",
    secondary: "P12",
    gadget: "Smoke Grenade",
  },
  iq: {
    primary: "552 Commando",
    secondary: "P12",
    gadget: "Frag Grenade",
  },
  buck: {
    primary: "C8-SFW",
    secondary: "Mk1 9mm",
    gadget: "Stun Grenade",
  },
  blackbeard: {
    primary: "Mk17 CQB",
    secondary: "D-50",
    gadget: "Frag Grenade",
  },
  capitao: {
    primary: "PARA-308",
    secondary: "PRB92",
    gadget: "Hard Breach Charge",
  },
  hibana: {
    primary: "Type-89",
    secondary: "Bearing 9",
    gadget: "Stun Grenade",
  },
  jackal: {
    primary: "C7E",
    secondary: "ITA12S",
    gadget: "Smoke Grenade",
  },
  ying: {
    primary: "T-95 LSW",
    secondary: "Q-929",
    gadget: "Smoke Grenade",
  },
  zofia: {
    primary: "M762",
    secondary: "RG15",
    gadget: "Claymore",
  },
  dokkaebi: {
    primary: "Mk 14 EBR",
    secondary: "SMG-12",
    gadget: "Stun Grenade",
  },
  lion: {
    primary: "417",
    secondary: "P9",
    gadget: "Frag Grenade",
  },
  finka: {
    primary: "6P41",
    secondary: "PMM",
    gadget: "Frag Grenade",
  },
  maverick: {
    primary: "M4",
    secondary: "1911 TACOPS",
    gadget: "Stun Grenade",
  },
  nomad: {
    primary: "ARX200",
    secondary: ".44 Mag Semi-Auto",
    gadget: "Stun Grenade",
  },
  gridlock: {
    primary: "F90",
    secondary: "Super Shorty",
    gadget: "Frag Grenade",
  },
  nokk: {
    primary: "FMG-9",
    secondary: "D-50",
    gadget: "Emp Grenade",
  },
  amaru: {
    primary: "G8A1",
    secondary: "SMG-11",
    gadget: "Stun Grenade",
  },
  kali: {
    primary: "CSRX 300",
    secondary: "SPSMG9",
    gadget: "Smoke Grenade",
  },
  iana: {
    primary: "ARX200",
    secondary: "Gonne-6",
    gadget: "Stun Grenade",
  },
  ace: {
    primary: "AK-12",
    secondary: "P9",
    gadget: "Claymore",
  },
  zero: {
    primary: "MP7",
    secondary: "Gonne-6",
    gadget: "Hard Breach Charge",
  },
  flores: {
    primary: "AR33",
    secondary: "GSH-18",
    gadget: "Stun Grenade",
  },
  osa: {
    primary: "556xi",
    secondary: "PMM",
    gadget: "Frag Grenade",
  },
  sens: {
    primary: "POF-9",
    secondary: "SDP 9mm",
    gadget: "Frag Grenade",
  },
  grim: {
    primary: "552 Commando",
    secondary: "Bailiff 410",
    gadget: "Claymore",
  },
  brava: {
    primary: "PARA-308",
    secondary: "Super Shorty",
    gadget: "Smoke Grenade",
  },
  ram: {
    primary: "R4-C",
    secondary: "Mk1 9mm",
    gadget: "Stun Grenade",
  },
  deimos: {
    primary: "AK-74M",
    secondary: "44 Vendetta",
    gadget: "Frag Grenade",
  },
  rauora: {
    primary: "SC-4000K",
    secondary: "Keratos .357",
    gadget: "Observation Blocker",
  },
  snake: {
    primary: "F2",
    secondary: "TACIT .45",
    gadget: "Frag Grenade",
  },

  // ===== DEFENDERS =====

  sentry: {
    primary: "Commando 9",
    secondary: "Super Shorty",
    gadget: "Nitro Cell",
  },
  smoke: {
    primary: "M590A1",
    secondary: "SMG-11",
    gadget: "Barbed Wire",
  },
  mute: {
    primary: "M590A1",
    secondary: "SMG-11",
    gadget: "Nitro Cell",
  },
  castle: {
    primary: "UMP45",
    secondary: "Super Shorty",
    gadget: "Proximity Alarm",
  },
  pulse: {
    primary: "UMP45",
    secondary: "5.7 USG",
    gadget: "Nitro Cell",
  },
  doc: {
    primary: "MP5",
    secondary: "Bailiff 410",
    gadget: "Barbed Wire",
  },
  rook: {
    primary: "MP5",
    secondary: "LFP586",
    gadget: "Impact Grenade",
  },
  kapkan: {
    primary: "9x19VSN",
    secondary: "PMM",
    gadget: "Barbed Wire",
  },
  tachanka: {
    primary: "DP27",
    secondary: "Bearing 9",
    gadget: "Barbed Wire",
  },
  jager: {
    primary: "416-C Carbine",
    secondary: "P-10C",
    gadget: "Bulletproof Camera",
  },
  bandit: {
    primary: "MP7",
    secondary: "P12",
    gadget: "Nitro Cell",
  },
  frost: {
    primary: "9mm C1",
    secondary: "ITA12S",
    gadget: "Deployable Shield",
  },
  valkyrie: {
    primary: "MPX",
    secondary: "D-50",
    gadget: "Nitro Cell",
  },
  caveira: {
    primary: "SPAS-15",
    secondary: "Luison",
    gadget: "Impact Grenade",
  },
  echo: {
    primary: "MP5SD",
    secondary: "Bearing 9",
    gadget: "Impact Grenade",
  },
  mira: {
    primary: "Vector .45 ACP",
    secondary: "ITA12S",
    gadget: "Nitro Cell",
  },
  lesion: {
    primary: "T-5 SMG",
    secondary: "Q-929",
    gadget: "Bulletproof Camera",
  },
  ela: {
    primary: "Scorpion EVO 3 A1",
    secondary: "RG15",
    gadget: "Barbed Wire",
  },
  vigil: {
    primary: "K1A",
    secondary: "SMG-12",
    gadget: "Impact Grenade",
  },
  maestro: {
    primary: "ALDA 5.56",
    secondary: "Bailiff 410",
    gadget: "Barbed Wire",
  },
  alibi: {
    primary: "Mx4 Storm",
    secondary: "Bailiff 410",
    gadget: "Proxy Alarm",
  },
  clash: {
    primary: "CCE Shield",
    secondary: "SPSMG9",
    gadget: "Impact Grenade",
  },
  kaid: {
    primary: "TCSG12",
    secondary: ".44 Mag Semi-Auto",
    gadget: "Nitro Cell",
  },
  mozzie: {
    primary: "P10 RONI",
    secondary: "SDP 9mm",
    gadget: "Nitro Cell",
  },
  warden: {
    primary: "M590A1",
    secondary: "SMG-12",
    gadget: "Nitro Cell",
  },
  goyo: {
    primary: "Vector .45 ACP",
    secondary: "P229",
    gadget: "Proximity Alarm",
  },
  wamai: {
    primary: "MP5K",
    secondary: "D-50",
    gadget: "Impact Grenade",
  },
  oryx: {
    primary: "T-5 SMG",
    secondary: "Bailiff 410",
    gadget: "Proximity Alarm",
  },
  melusi: {
    primary: "MP5",
    secondary: "RG15",
    gadget: "Impact Grenade",
  },
  aruni: {
    primary: "Mk 14 EBR",
    secondary: "PRB92",
    gadget: "Barbed Wire",
  },
  thunderbird: {
    primary: "Spear .308",
    secondary: "Bearing 9",
    gadget: "Barbed Wire",
  },
  thorn: {
    primary: "UZK50GI",
    secondary: "C75 Auto",
    gadget: "Barbed Wire",
  },
  azami: {
    primary: "9x19VSN",
    secondary: "D-50",
    gadget: "Impact Grenade",
  },
  solis: {
    primary: "P90",
    secondary: "SMG-11",
    gadget: "Impact Grenade",
  },
  fenrir: {
    primary: "MP7",
    secondary: "Bailiff 410",
    gadget: "Bulletproof Camera",
  },
  tubarao: {
    primary: "AR-15.50",
    secondary: "P226 Mk 25",
    gadget: "Nitro Cell",
  },
  skopos: {
    primary: "PCX-33",
    secondary: "P229",
    gadget: "Impact Grenade",
  },
  denari: {
    primary: "C8-SFW",
    secondary: "D-50",
    gadget: "Stun Grenade",
  },
};
