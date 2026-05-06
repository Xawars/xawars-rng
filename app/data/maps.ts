export interface OperatorRecommendation {
  operatorId: string;
  reason: string;
  importance: 'primary' | 'secondary' | 'niche';
}

export interface SiteData {
  id: string;
  name: string;
  nicknames?: string[];
}

export interface MapData {
  id: string;
  name: string;
  sites: SiteData[];
}

export interface MapSiteData {
  defense: OperatorRecommendation[];
  attack: OperatorRecommendation[];
}

export const MAPS: MapData[] = [
  {
    id: 'bank',
    name: 'Bank',
    sites: [
      { id: 'basement', name: 'Basement', nicknames: ['B'] },
      { id: 'ceo', name: 'CEO Office', nicknames: ['C'] },
      { id: 'teller', name: 'Teller', nicknames: ['T'] },
      { id: 'vault', name: 'Vault', nicknames: ['V'] },
    ],
  },
  {
    id: 'border',
    name: 'Border',
    sites: [
      { id: 'archives', name: 'Archives' },
      { id: 'armory', name: 'Armory' },
      { id: 'customs', name: 'Customs' },
      { id: 'supply', name: 'Supply Room' },
      { id: 'west', name: 'West Wing' },
    ],
  },
  {
    id: 'clubhouse',
    name: 'Clubhouse',
    sites: [
      { id: 'gym', name: 'Gym', nicknames: ['Gym/Cash'] },
      { id: 'church', name: 'Church' },
      { id: 'basement', name: 'Basement' },
      { id: 'lounge', name: 'Lounge' },
    ],
  },
  {
    id: 'oregon',
    name: 'Oregon',
    sites: [
      { id: 'basement', name: 'Basement', nicknames: ['B'] },
      { id: 'dorms', name: 'Dorms', nicknames: ['D'] },
      { id: 'kitchen', name: 'Kitchen' },
      { id: 'tower', name: 'Tower' },
    ],
  },
  {
    id: 'chalet',
    name: 'Chalet',
    sites: [
      { id: 'basement', name: 'Basement' },
      { id: 'library', name: 'Library' },
      { id: 'master', name: 'Master Bedroom' },
      { id: 'snow', name: 'Snowmobile Garage' },
    ],
  },
  {
    id: 'kafe',
    name: 'Kafe Dostoyevsky',
    sites: [
      { id: 'kitchen', name: 'Kitchen' },
      { id: 'museum', name: 'Museum' },
      { id: 'piano', name: 'Piano Room' },
    ],
  },
  {
    id: 'consulate',
    name: 'Consulate',
    sites: [
      { id: 'basement', name: 'Basement' },
      { id: 'garage', name: 'Garage' },
      { id: 'lobby', name: 'Lobby' },
      { id: 'upstairs', name: 'Upstairs', nicknames: ['U'] },
    ],
  },
];

export const MAP_SITE_DATA: Record<string, MapSiteData> = {
  // BANK
  'bank-basement': {
    defense: [
      { operatorId: 'smoke', reason: 'Strong plant denial for default plant spots in corridors', importance: 'primary' },
      { operatorId: 'mira', reason: 'Mirror control for long basement corridors', importance: 'primary' },
      { operatorId: 'echo', reason: 'Yokai drone denial and plant disruption', importance: 'secondary' },
      { operatorId: 'maestro', reason: 'Camera control for garage and connector entries', importance: 'secondary' },
      { operatorId: 'lesion', reason: 'Gu mines for main entrance denial', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Essential for opening garage/reinforcements', importance: 'primary' },
      { operatorId: 'hibana', reason: 'Quick hatch opens for vertical plays', importance: 'primary' },
      { operatorId: 'ace', reason: 'Reliable hard breach for multiple walls', importance: 'secondary' },
      { operatorId: 'thatcher', reason: 'Support for hard breachers with EMPs', importance: 'secondary' },
      { operatorId: 'montagne', reason: 'Shield for pushing main hallway', importance: 'niche' },
    ],
  },
  'bank-ceo': {
    defense: [
      { operatorId: 'jager', reason: 'ADS placement for default plant spots', importance: 'primary' },
      { operatorId: 'bandit', reason: 'Bandit tricking for meeting room walls', importance: 'primary' },
      { operatorId: 'valkyrie', reason: 'Cameras for monitoring main entrance', importance: 'secondary' },
      { operatorId: 'wamai', reason: 'Alternative to Jager for utility', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'ash', reason: 'Quick breaching for front push', importance: 'primary' },
      { operatorId: 'thermite', reason: 'Opening main wall to CEO', importance: 'primary' },
      { operatorId: 'buck', reason: 'Soft breach from floor below', importance: 'secondary' },
      { operatorId: 'zofia', reason: 'Soft breach and concussion utility', importance: 'secondary' },
    ],
  },
  'bank-teller': {
    defense: [
      { operatorId: 'castle', reason: 'Window barricades for teller entry denial', importance: 'primary' },
      { operatorId: 'pulse', reason: 'Heartbeat sensor for vault approach intel', importance: 'primary' },
      { operatorId: 'doc', reason: 'Self-revive and anchor potential', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'sledge', reason: 'Sledge for floor above teller', importance: 'primary' },
      { operatorId: 'buck', reason: 'Vertical soft breach from floor 2', importance: 'primary' },
      { operatorId: 'iq', reason: 'Utility spotting through floors', importance: 'secondary' },
    ],
  },
  'bank-vault': {
    defense: [
      { operatorId: 'frost', reason: 'Welcome mats for vault entrance', importance: 'primary' },
      { operatorId: 'kapkan', reason: 'Tripwires on vault approaches', importance: 'primary' },
      { operatorId: 'mute', reason: 'Jammer for drone denial', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'hibana', reason: 'Opening ceiling for vertical play', importance: 'primary' },
      { operatorId: 'twitch', reason: 'Drone utility clearing', importance: 'secondary' },
      { operatorId: 'dokkaebi', reason: 'Hack cameras for intel', importance: 'secondary' },
    ],
  },

  // BORDER
  'border-archives': {
    defense: [
      { operatorId: 'clash', reason: 'Shield denial for archives entry', importance: 'primary' },
      { operatorId: 'kaid', reason: 'Electroclaw for ceiling denial', importance: 'primary' },
      { operatorId: 'goyo', reason: 'Volcano shields for site denial', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'montagne', reason: 'Shield for pushing archives hallway', importance: 'primary' },
      { operatorId: 'fuze', reason: 'Cluster charge for site clearing', importance: 'secondary' },
      { operatorId: 'gridlock', reason: 'Trax deployment for map control', importance: 'niche' },
    ],
  },
  'border-armory': {
    defense: [
      { operatorId: 'echo', reason: 'Drone denial and intel for armory hallway', importance: 'primary' },
      { operatorId: 'maestro', reason: 'Evil eyes for armory windows', importance: 'primary' },
      { operatorId: 'smoke', reason: 'Smoke for armory plant denial', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening armory wall', importance: 'primary' },
      { operatorId: 'thatcher', reason: 'EMP support for hard breach', importance: 'primary' },
      { operatorId: 'zofia', reason: 'Concussion for holding angles', importance: 'secondary' },
    ],
  },
  'border-customs': {
    defense: [
      { operatorId: ' Ela', reason: 'Concussion mines for customs approach', importance: 'primary' },
      { operatorId: 'vigil', reason: 'Hidden intel denial and roam potential', importance: 'primary' },
      { operatorId: ' lesion', reason: 'Gu mines for main entrance', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'ash', reason: 'Quick soft breach into customs', importance: 'primary' },
      { operatorId: 'thermite', reason: 'Breaching customs wall', importance: 'primary' },
      { operatorId: 'buck', reason: 'Soft breach from outside', importance: 'secondary' },
    ],
  },
  'border-supply': {
    defense: [
      { operatorId: 'mira', reason: 'Black mirrors for supply control', importance: 'primary' },
      { operatorId: 'jager', reason: 'ADS for default plant spots', importance: 'primary' },
      { operatorId: 'rook', reason: 'Armor for team utility', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'buck', reason: 'Soft breach from archives floor', importance: 'primary' },
      { operatorId: 'sledge', reason: 'Sledge for vertical plays', importance: 'primary' },
      { operatorId: 'iq', reason: 'Finding defender utilities', importance: 'secondary' },
    ],
  },
  'border-west': {
    defense: [
      { operatorId: 'castle', reason: 'Window barricades for west wing denial', importance: 'primary' },
      { operatorId: 'azami', reason: 'Kiba barriers for site hardening', importance: 'primary' },
      { operatorId: 'wamai', reason: 'Utility magnet for anti-nade', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'maverick', reason: 'Quiet hard breach for windows', importance: 'primary' },
      { operatorId: 'nomad', reason: 'Airjabs for holding flanks', importance: 'secondary' },
      { operatorId: 'flores', reason: 'Drone clearing for push', importance: 'secondary' },
    ],
  },

  // CLUBHOUSE
  'clubhouse-gym': {
    defense: [
      { operatorId: 'jager', reason: 'ADS for gym entrance denial', importance: 'primary' },
      { operatorId: 'bandit', reason: 'Bandit tricking for cash room walls', importance: 'primary' },
      { operatorId: 'echo', reason: 'Drone intel for room clearing', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening cash room wall', importance: 'primary' },
      { operatorId: 'ash', reason: 'Quick breaching for main entry', importance: 'primary' },
      { operatorId: 'montagne', reason: 'Shield for hallway push', importance: 'secondary' },
    ],
  },
  'clubhouse-church': {
    defense: [
      { operatorId: 'mira', reason: 'Black mirrors for church control', importance: 'primary' },
      { operatorId: 'smoke', reason: 'Plant denial for altar spots', importance: 'primary' },
      { operatorId: 'valkyrie', reason: 'Cameras for church approach intel', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'sledge', reason: 'Sledge for soft breaching altar', importance: 'primary' },
      { operatorId: 'zofia', reason: 'Concussion for clearing church', importance: 'primary' },
      { operatorId: 'thatcher', reason: 'EMP for Mira denial', importance: 'secondary' },
    ],
  },
  'clubhouse-basement': {
    defense: [
      { operatorId: 'lesion', reason: 'Gu mines for basement corridors', importance: 'primary' },
      { operatorId: 'kapkan', reason: 'Tripwires for main entry', importance: 'primary' },
      { operatorId: 'frost', reason: 'Welcome mats for stair entries', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening garage/reinforcements', importance: 'primary' },
      { operatorId: 'hibana', reason: 'Quick hatch openings', importance: 'primary' },
      { operatorId: 'twitch', reason: 'Drone utility clearing', importance: 'secondary' },
    ],
  },
  'clubhouse-lounge': {
    defense: [
      { operatorId: 'kaid', reason: 'Electroclaw for lounge walls', importance: 'primary' },
      { operatorId: 'goyo', reason: 'Volcano shields for site denial', importance: 'primary' },
      { operatorId: 'azami', reason: 'Kiba barriers for lounge', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'buck', reason: 'Soft breach from bar floor', importance: 'primary' },
      { operatorId: 'ace', reason: 'Reliable hard breach for multiple walls', importance: 'primary' },
      { operatorId: 'gridlock', reason: 'Trax for map control', importance: 'niche' },
    ],
  },

  // OREGON
  'oregon-basement': {
    defense: [
      { operatorId: 'smoke', reason: 'Plant denial for basement corridors', importance: 'primary' },
      { operatorId: 'mira', reason: 'Mirror control for long hallway', importance: 'primary' },
      { operatorId: 'echo', reason: 'Yokai for drone denial', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening boiler room walls', importance: 'primary' },
      { operatorId: 'hibana', reason: 'Hatch opening for vertical play', importance: 'primary' },
      { operatorId: 'ace', reason: 'Reliable breach for multiple points', importance: 'secondary' },
    ],
  },
  'oregon-dorms': {
    defense: [
      { operatorId: 'jager', reason: 'ADS for dorms entry', importance: 'primary' },
      { operatorId: 'vigil', reason: 'ERC and roam potential', importance: 'primary' },
      { operatorId: 'ela', reason: 'Concussion for hallway denial', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'ash', reason: 'Quick breach for main entry', importance: 'primary' },
      { operatorId: 'sledge', reason: 'Sledge for floor soft breach', importance: 'primary' },
      { operatorId: 'zofia', reason: 'Concussion and breach utility', importance: 'secondary' },
    ],
  },
  'oregon-kitchen': {
    defense: [
      { operatorId: 'castle', reason: 'Window denial for kitchen', importance: 'primary' },
      { operatorId: 'pulse', reason: 'Heartbeat for stairs intel', importance: 'primary' },
      { operatorId: 'doc', reason: 'Anchor with revive potential', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening kitchen wall', importance: 'primary' },
      { operatorId: 'buck', reason: 'Soft breach from dining', importance: 'primary' },
      { operatorId: 'maverick', reason: 'Quiet breach for surprise entry', importance: 'secondary' },
    ],
  },
  'oregon-tower': {
    defense: [
      { operatorId: 'azami', reason: 'Kiba barriers for tower entry', importance: 'primary' },
      { operatorId: 'maestro', reason: 'Camera control for tower', importance: 'primary' },
      { operatorId: 'thunderbird', reason: 'Healer for tower hold', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'maverick', reason: 'Quiet hard breach for tower', importance: 'primary' },
      { operatorId: 'sens', reason: 'Roe camera for recon', importance: 'secondary' },
      { operatorId: 'ram', reason: 'Breaching robot for entry', importance: 'niche' },
    ],
  },

  // CHALET
  'chalet-basement': {
    defense: [
      { operatorId: 'smoke', reason: 'Plant denial for basement site', importance: 'primary' },
      { operatorId: 'goyo', reason: 'Volcano shields for main entrance', importance: 'primary' },
      { operatorId: 'lesion', reason: 'Gu mines for hallway', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening garage/main entrance walls', importance: 'primary' },
      { operatorId: 'fuze', reason: 'Cluster charge for site clearing', importance: 'primary' },
      { operatorId: 'gridlock', reason: 'Trax for area denial', importance: 'secondary' },
    ],
  },
  'chalet-library': {
    defense: [
      { operatorId: 'mira', reason: 'Black mirrors for library control', importance: 'primary' },
      { operatorId: 'jager', reason: 'ADS for main entrance', importance: 'primary' },
      { operatorId: 'valkyrie', reason: 'Cameras for library intel', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'sledge', reason: 'Sledge for stairs soft breach', importance: 'primary' },
      { operatorId: 'zofia', reason: 'Concussion and breach utility', importance: 'primary' },
      { operatorId: 'iq', reason: 'Finding Mira mirrors', importance: 'secondary' },
    ],
  },
  'chalet-master': {
    defense: [
      { operatorId: 'mozzie', reason: 'Drone denial for master bedroom', importance: 'primary' },
      { operatorId: 'wamai', reason: 'Magnet for anti-utility', importance: 'primary' },
      { operatorId: 'caveira', reason: 'Roam potential and silent step', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'jackal', reason: 'Track roaming defenders', importance: 'primary' },
      { operatorId: 'dokkaebi', reason: 'Hack cameras for intel', importance: 'primary' },
      { operatorId: 'flores', reason: 'Drone utility clearing', importance: 'secondary' },
    ],
  },
  'chalet-snow': {
    defense: [
      { operatorId: 'frost', reason: 'Welcome mats for snow entrance', importance: 'primary' },
      { operatorId: 'kapkan', reason: 'Tripwires for garage approaches', importance: 'primary' },
      { operatorId: 'bandit', reason: 'Bandit tricking for garage wall', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening garage walls', importance: 'primary' },
      { operatorId: 'montagne', reason: 'Shield for garage push', importance: 'primary' },
      { operatorId: 'thatcher', reason: 'EMP for utility denial', importance: 'secondary' },
    ],
  },

  // KAFE
  'kafe-kitchen': {
    defense: [
      { operatorId: 'smoke', reason: 'Plant denial for kitchen site', importance: 'primary' },
      { operatorId: 'mira', reason: 'Mirror control for kitchen', importance: 'primary' },
      { operatorId: 'goyo', reason: 'Volcano shields for denial', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening kitchen walls', importance: 'primary' },
      { operatorId: 'ash', reason: 'Quick breach for main entry', importance: 'primary' },
      { operatorId: 'sledge', reason: 'Soft breach from floor above', importance: 'secondary' },
    ],
  },
  'kafe-museum': {
    defense: [
      { operatorId: 'jager', reason: 'ADS for museum entry', importance: 'primary' },
      { operatorId: 'echo', reason: 'Drone for museum denial', importance: 'primary' },
      { operatorId: 'rook', reason: 'Armor utility', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'buck', reason: 'Soft breach from top floor', importance: 'primary' },
      { operatorId: 'zofia', reason: 'Concussion for holding angles', importance: 'primary' },
      { operatorId: 'iq', reason: 'Finding defender utilities', importance: 'secondary' },
    ],
  },
  'kafe-piano': {
    defense: [
      { operatorId: 'maestro', reason: 'Evil eyes for piano windows', importance: 'primary' },
      { operatorId: 'ela', reason: 'Concussion for main entry', importance: 'primary' },
      { operatorId: 'pulse', reason: 'Heartbeat for stairs intel', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'maverick', reason: 'Quiet hard breach for piano', importance: 'primary' },
      { operatorId: 'thermite', reason: 'Opening main piano wall', importance: 'primary' },
      { operatorId: 'sens', reason: 'Roe camera for entry intel', importance: 'secondary' },
    ],
  },

  // CONSULATE
  'consulate-basement': {
    defense: [
      { operatorId: 'smoke', reason: 'Plant denial for basement corridors', importance: 'primary' },
      { operatorId: 'echo', reason: 'Drone denial for stairs', importance: 'primary' },
      { operatorId: 'lesion', reason: 'Gu mines for main entrance', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening garage walls', importance: 'primary' },
      { operatorId: 'hibana', reason: 'Hatch openings for vertical play', importance: 'primary' },
      { operatorId: 'ace', reason: 'Reliable breach for multiple points', importance: 'secondary' },
    ],
  },
  'consulate-garage': {
    defense: [
      { operatorId: 'kaid', reason: 'Electroclaw for garage walls', importance: 'primary' },
      { operatorId: 'bandit', reason: 'Bandit tricking for garage wall', importance: 'primary' },
      { operatorId: 'clash', reason: 'Shield denial for garage entry', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening garage wall', importance: 'primary' },
      { operatorId: 'montagne', reason: 'Shield for garage push', importance: 'primary' },
      { operatorId: 'nomad', reason: 'Airjabs for holding flank', importance: 'secondary' },
    ],
  },
  'consulate-lobby': {
    defense: [
      { operatorId: 'castle', reason: 'Window barricades for lobby denial', importance: 'primary' },
      { operatorId: 'mira', reason: 'Mirror control for lobby', importance: 'primary' },
      { operatorId: 'wamai', reason: 'Magnet for anti-utility', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'ash', reason: 'Quick breach for main entry', importance: 'primary' },
      { operatorId: 'sledge', reason: 'Sledge for floor soft breach', importance: 'primary' },
      { operatorId: 'maverick', reason: 'Quiet breach for windows', importance: 'secondary' },
    ],
  },
  'consulate-upstairs': {
    defense: [
      { operatorId: 'azami', reason: 'Kiba barriers for site hardening', importance: 'primary' },
      { operatorId: 'jager', reason: 'ADS for default spots', importance: 'primary' },
      { operatorId: 'maestro', reason: 'Camera control for stairs', importance: 'secondary' },
    ],
    attack: [
      { operatorId: 'thermite', reason: 'Opening main wall to upstairs', importance: 'primary' },
      { operatorId: 'buck', reason: 'Soft breach from adjacent room', importance: 'primary' },
      { operatorId: 'zofia', reason: 'Concussion for clearing', importance: 'secondary' },
    ],
  },
};

export function getMapData(mapId: string, siteId: string): MapSiteData | undefined {
  const key = `${mapId}-${siteId}`;
  return MAP_SITE_DATA[key];
}

export function getMapById(mapId: string): MapData | undefined {
  return MAPS.find(m => m.id === mapId);
}

export function getSiteById(mapId: string, siteId: string): SiteData | undefined {
  const map = getMapById(mapId);
  return map?.sites.find(s => s.id === siteId);
}