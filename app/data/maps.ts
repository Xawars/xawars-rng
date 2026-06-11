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
  active: boolean;  // Controls visibility in MapSelector
  sites: SiteData[];
}

export interface MapSiteData {
  defense: OperatorRecommendation[];
  attack: OperatorRecommendation[];
  strategyTips?: {
    defense?: string;
    attack?: string;
  };
}

export const MAPS: MapData[] = [
  {
    id: 'chalet',
    name: 'Chalet',
    active: true,
    sites: [
      { id: 'kitchen-dining', name: 'Kitchen/Dining' },
      { id: 'bar-gaming', name: 'Bar/Gaming Room' },
      { id: 'trophy-office', name: 'Trophy Room/Office' },
      { id: 'master-bedroom', name: 'Master Bedroom/Master Bathroom' },
    ],
  },
  {
    id: 'bank',
    name: 'Bank',
    active: true,
    sites: [
      { id: 'ceo-executive', name: 'CEO Office/Executive Lounge' },
      { id: 'locker-cctv', name: 'Locker/CCTV' },
      { id: 'open-archives', name: 'Open Area/Archives' },
      { id: 'tellers-archives', name: 'Tellers/Archives' },
    ],
  },
  {
    id: 'border',
    name: 'Border',
    active: true,
    sites: [
      { id: 'armory-archives', name: 'Armory/Archives' },
      { id: 'ventilation-workshop', name: 'Ventilation/Workshop' },
      { id: 'tellers-bathroom', name: 'Tellers/Bathroom' },
      { id: 'supply-customs', name: 'Supply/Customs' },
    ],
  },
  {
    id: 'clubhouse',
    name: 'Clubhouse',
    active: true,
    sites: [
      { id: 'church-arsenal', name: 'Church/Arsenal' },
      { id: 'cash-cctv', name: 'Cash/CCTV' },
      { id: 'gym-bedroom', name: 'Gym/Bedroom' },
      { id: 'bar-stock', name: 'Bar/Stock' },
    ],
  },
  {
    id: 'kafe',
    name: 'Kafe Dostoyevsky',
    active: true,
    sites: [
      { id: 'reading-dining', name: 'Reading/Dining' },
      { id: 'mining-cocktail', name: 'Mining/Cocktail' },
      { id: 'service-kitchen', name: 'Service/Kitchen' },
      { id: 'vip-clash', name: 'VIP/Clash Room' },
    ],
  },
  {
    id: 'nighthaven-labs',
    name: 'Nighthaven Labs',
    active: true,
    sites: [
      { id: 'command-servers', name: 'Command Center/Servers' },
      { id: 'assembly-control', name: 'Assembly/Control Room' },
      { id: 'kitchen-lab', name: 'Kitchen/Lab' },
      { id: 'aquarium-lounge', name: 'Aquarium/Lounge' },
    ],
  },
  {
    id: 'coastline',
    name: 'Coastline',
    active: true,
    sites: [
      { id: 'hookah-billiards', name: 'Hookah/Billiards' },
      { id: 'penthouse-theater', name: 'Penthouse/Theater' },
      { id: 'kitchen-service', name: 'Kitchen/Service Entrance' },
      { id: 'bluebar-vip', name: 'Blue Bar/VIP' },
    ],
  },
  {
    id: 'consulate',
    name: 'Consulate',
    active: true,
    sites: [
      { id: 'garage-archives', name: 'Garage/Archives' },
      { id: 'ceo-meeting', name: 'CEO Office/Meeting Room' },
      { id: 'press-reception', name: 'Press Room/Reception' },
      { id: 'customs-office', name: 'Customs/Office' },
    ],
  },
  {
    id: 'fortress',
    name: 'Fortress',
    active: true,
    sites: [
      { id: 'armory-archives', name: 'Armory/Archives' },
      { id: 'command-control', name: 'Command/Control Room' },
      { id: 'dining-kitchen', name: 'Dining/Kitchen' },
      { id: 'supply-workshop', name: 'Supply/Workshop' },
    ],
  },
  {
    id: 'oregon',
    name: 'Oregon',
    active: true,
    sites: [
      { id: 'kids-dorms', name: 'Kids/Dorms' },
      { id: 'laundry-supply', name: 'Laundry/Supply' },
      { id: 'kitchen-dining', name: 'Kitchen/Dining' },
      { id: 'meeting-security', name: 'Meeting Hall/Security' },
    ],
  },
  {
    id: 'villa',
    name: 'Villa',
    active: true,
    sites: [
      { id: 'aviator-games', name: 'Aviator/Games Room' },
      { id: 'trophy-statuary', name: 'Trophy/Statuary' },
      { id: 'living-billiards', name: 'Living Room/Billiards' },
      { id: 'master-study', name: 'Master Bedroom/Study' },
    ],
  },
  {
    id: 'emerald-plains',
    name: 'Emerald Plains',
    active: true,
    sites: [
      { id: 'vault-projector', name: 'Vault/Projector' },
      { id: 'office-meeting', name: 'Office/Meeting Room' },
      { id: 'dining-kitchen', name: 'Dining/Kitchen' },
      { id: 'lobby-workroom', name: 'Main Lobby/Workroom' },
    ],
  },
  {
    id: 'lair',
    name: 'Lair',
    active: true,
    sites: [
      { id: 'command-armory', name: 'Command Center/Armory' },
      { id: 'radio-radar', name: 'Radio/Radar' },
      { id: 'bunk-locker', name: 'Bunk/Locker' },
      { id: 'mess-rec', name: 'Mess/Rec' },
    ],
  },
  {
    id: 'kanal',
    name: 'Kanal',
    active: true,
    sites: [
      { id: 'server-map', name: 'Server/Map Room' },
      { id: 'cafeteria-cookhouse', name: 'Cafeteria/Cookhouse' },
      { id: 'radar-communication', name: 'Radar/Communication' },
      { id: 'control-bridge', name: 'Control Room/Bridge' },
    ],
  },
  {
    id: 'skyscraper',
    name: 'Skyscraper',
    active: true,
    sites: [
      { id: 'tea-exhibition', name: 'Tea Room/Exhibition' },
      { id: 'office-exhibition', name: 'Office/Exhibition' },
      { id: 'kitchen-bbq', name: 'Kitchen/BBQ' },
      { id: 'bathroom-bedroom', name: 'Bathroom/Bedroom' },
    ],
  },
  {
    id: 'theme-park',
    name: 'Theme Park',
    active: true,
    sites: [
      { id: 'bunk-arcade', name: 'Bunk/Arcade' },
      { id: 'druglab-daycare', name: 'Drug Lab/Day Care' },
      { id: 'initiation-thrill', name: 'Initiation/Thrill' },
      { id: 'dragon-training', name: 'Dragon/Training' },
    ],
  },
  {
    id: 'outback',
    name: 'Outback',
    active: true,
    sites: [
      { id: 'laundry-party', name: 'Laundry/Party' },
      { id: 'games-petshop', name: 'Games/Pet Shop' },
      { id: 'kitchen-dining', name: 'Kitchen/Dining' },
      { id: 'office-instrument', name: 'Office/Instrument Storage' },
    ],
  },
  {
    id: 'calypso-casino',
    name: 'Calypso Casino',
    active: true,
    sites: [
      { id: 'casino-vip', name: 'Casino Floor/VIP' },
      { id: 'security-count', name: 'Security/Count Room' },
      { id: 'hotel-restaurant', name: 'Hotel/Restaurant' },
      { id: 'backstage-loading', name: 'Backstage/Loading Dock' },
    ],
  },
];

export const MAP_SITE_DATA: Record<string, MapSiteData> = {};

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