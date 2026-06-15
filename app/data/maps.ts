export interface SiteData {
  id: string;
  name: string;
  floor: string;
}

export interface MapData {
  id: string;
  name: string;
  sites: SiteData[];
  image?: string; // placeholder for map photos
}

export const MAPS: MapData[] = [
  {
    id: 'bank',
    name: 'Bank',
    sites: [
      { id: 'cctv-lockers', name: 'CCTV Room / Lockers', floor: 'B' },
      { id: 'tellers-archives', name: "Tellers' Office / Archives", floor: '1F' },
      { id: 'staff-open', name: 'Staff Room / Open Area', floor: '1F' },
      { id: 'ceo-executive', name: 'CEO Office / Executive Lounge', floor: '2F' },
    ],
  },
  {
    id: 'border',
    name: 'Border',
    sites: [
      { id: 'armory-archives', name: 'Armory Lockers / Archives', floor: '2F' },
      { id: 'workshop-ventilation', name: 'Workshop / Ventilation Room', floor: '1F' },
      { id: 'customs-supply', name: 'Customs Inspection / Supply Room', floor: '1F' },
      { id: 'tellers-bathroom', name: 'Tellers / Bathroom', floor: '1F' },
    ],
  },
  {
    id: 'calypso-casino',
    name: 'Calypso Casino',
    sites: [
      { id: 'cigar-pool', name: 'Cigar Room / Pool', floor: '2F' },
      { id: 'blackjack-poker', name: 'Blackjack / Poker', floor: '1F' },
      { id: 'bar-betting', name: 'Bar / Betting', floor: '1F' },
      { id: 'cctv-vault', name: 'CCTV / Vault Checkpoint', floor: 'B' },
    ],
  },
  {
    id: 'chalet',
    name: 'Chalet',
    sites: [
      { id: 'master-office', name: 'Master Bedroom / Office', floor: '2F' },
      { id: 'bar-gaming', name: 'Bar / Gaming Room', floor: '1F' },
      { id: 'dining-kitchen', name: 'Dining Room / Kitchen', floor: '1F' },
      { id: 'wine-snowmobile', name: 'Wine Cellar / Snowmobile Garage', floor: 'B' },
    ],
  },
  {
    id: 'clubhouse',
    name: 'Clubhouse',
    sites: [
      { id: 'bedroom-gym', name: 'Bedroom / Gym', floor: '2F' },
      { id: 'cash-cctv', name: 'Cash Room / CCTV Room', floor: '2F' },
      { id: 'bar-stock', name: 'Bar / Stock Room', floor: '1F' },
      { id: 'church-arsenal', name: 'Church / Arsenal', floor: 'B' },
    ],
  },
  {
    id: 'coastline',
    name: 'Coastline',
    sites: [
      { id: 'theater-penthouse', name: 'Theater / Penthouse', floor: '2F' },
      { id: 'hookah-billiards', name: 'Hookah Lounge / Billiards Room', floor: '2F' },
      { id: 'bluebar-sunrise', name: 'Blue Bar / Sunrise Bar', floor: '1F' },
      { id: 'service-kitchen', name: 'Service Entrance / Kitchen', floor: '1F' },
    ],
  },
  {
    id: 'consulate',
    name: 'Consulate',
    sites: [
      { id: 'consul-meeting', name: 'Consul Office / Meeting Room', floor: '2F' },
      { id: 'archives-tellers', name: 'Archives / Tellers', floor: 'B/1F' },
      { id: 'lobby-press', name: 'Lobby / Press Room', floor: '1F' },
      { id: 'garage-cafeteria', name: 'Garage / Cafeteria', floor: 'B/1F' },
    ],
  },
  {
    id: 'emerald-plains',
    name: 'Emerald Plains',
    sites: [
      { id: 'ceo-administration', name: 'CEO Office / Administration', floor: '2F' },
      { id: 'gallery-meeting', name: 'Private Gallery (Art) / Meeting', floor: '2F' },
      { id: 'kitchen-dining', name: 'Kitchen / Dining', floor: '1F' },
      { id: 'bar-lounge', name: 'Bar / Lounge', floor: '1F' },
    ],
  },
  {
    id: 'favela',
    name: 'Favela',
    sites: [
      { id: 'meth-packaging', name: 'Meth Lab / Packaging Room', floor: '2F-3F' },
      { id: 'football-bedroom-office', name: 'Football Bedroom / Football Office', floor: '2F' },
      { id: 'aunt-bedroom-apartment', name: "Aunt's Bedroom / Aunt's Apartment", floor: '2F-1F' },
      { id: 'biker-apartment-bedroom', name: "Biker's Apartment / Biker's Bedroom", floor: '1F' },
    ],
  },
  {
    id: 'fortress',
    name: 'Fortress',
    sites: [
      { id: 'dormitory-briefing', name: 'Dormitory / Briefing Room', floor: '2F' },
      { id: 'bedroom-commander', name: "Bedroom / Commander's Office", floor: '2F' },
      { id: 'kitchen-cafeteria', name: 'Kitchen / Cafeteria', floor: '1F' },
      { id: 'hammam-sitting', name: 'Hammam / Sitting Room', floor: '1F' },
    ],
  },
  {
    id: 'hereford',
    name: 'Hereford Base',
    sites: [
      { id: 'ammo-tractor', name: 'Ammo Storage / Tractor Storage', floor: '3F' },
      { id: 'master-kids', name: 'Master Bedroom / Kids Room', floor: '2F' },
      { id: 'dining-kitchen', name: 'Dining Room / Kitchen', floor: '1F' },
      { id: 'fermentation-brewery', name: 'Fermentation Chamber / Brewery', floor: 'B' },
    ],
  },
  {
    id: 'house',
    name: 'House',
    sites: [
      { id: 'car-pink', name: 'Car Room / Pink Room', floor: '2F' },
      { id: 'master-car', name: 'Master Bedroom / Car Room', floor: '2F' },
      { id: 'tv-music', name: 'TV Room / Music Room', floor: '1F' },
      { id: 'garage-gym', name: 'Garage / Gym', floor: 'B' },
    ],
  },
  {
    id: 'kafe',
    name: 'Kafe Dostoyevsky',
    sites: [
      { id: 'bar-cocktail', name: 'Bar / Cocktail Lounge', floor: '3F' },
      { id: 'mining-fireplace', name: 'Mining Room / Fireplace Hall', floor: '2F' },
      { id: 'reading-fireplace', name: 'Reading Room / Fireplace Hall', floor: '2F' },
      { id: 'service-cooking', name: 'Kitchen Service / Kitchen Cooking', floor: 'B' },
    ],
  },
  {
    id: 'kanal',
    name: 'Kanal',
    sites: [
      { id: 'server-radar', name: 'Server Room / Radar Room', floor: '2F' },
      { id: 'security-maps', name: 'Security Room / Maps Room', floor: '1F' },
      { id: 'coastguard-lounge', name: 'Coast Guard Meeting Room / Lounge', floor: '1F' },
      { id: 'kayaks-supply', name: 'Kayaks / Supply Room', floor: 'B1' },
    ],
  },
  {
    id: 'lair',
    name: 'Lair',
    sites: [
      { id: 'master-r6', name: 'Master Office / R6 Room', floor: '2F' },
      { id: 'bunks-briefing', name: 'Bunks / Briefing', floor: '1F' },
      { id: 'armory-weapons', name: 'Armory / Weapons Maintenance', floor: '1F' },
      { id: 'lab-support', name: 'Lab / Lab Support', floor: 'B1' },
    ],
  },
  {
    id: 'nighthaven-labs',
    name: 'Nighthaven Labs',
    sites: [
      { id: 'command-server', name: 'Command Centre / Server Room', floor: '2F' },
      { id: 'control-storage', name: 'Control Room / Storage', floor: '1F' },
      { id: 'kitchen-cafeteria', name: 'Kitchen / Cafeteria', floor: '1F' },
      { id: 'tank-assembly', name: 'Tank Hall / Assembly', floor: 'B' },
    ],
  },
  {
    id: 'oregon',
    name: 'Oregon',
    sites: [
      { id: 'kids-dorms', name: 'Kids Dorms / Dorms Main Hall', floor: '2F' },
      { id: 'kitchen-dining', name: 'Kitchen / Dining Hall', floor: '1F' },
      { id: 'meeting-kitchen', name: 'Meeting Hall / Kitchen', floor: '1F' },
      { id: 'laundry-supply', name: 'Laundry Room / Supply Room', floor: 'B' },
    ],
  },
  {
    id: 'outback',
    name: 'Outback',
    sites: [
      { id: 'laundry-games', name: 'Laundry Room / Games Room', floor: '2F' },
      { id: 'party-office', name: 'Party Room / Office', floor: '2F' },
      { id: 'nature-bushranger', name: 'Nature Room / Bushranger Room', floor: '1F' },
      { id: 'compressor-gear', name: 'Compressor Room / Gear Store', floor: '1F' },
    ],
  },
  {
    id: 'plane',
    name: 'Presidential Plane',
    sites: [
      { id: 'meeting-executive', name: 'Meeting Room / Executive Office', floor: '2F' },
      { id: 'bedroom-staff', name: 'Executive Bedroom / Staff Section', floor: '2F' },
      { id: 'cargo-luggage', name: 'Cargo Hold / Luggage Hold', floor: '1F' },
    ],
  },
  {
    id: 'skyscraper',
    name: 'Skyscraper',
    sites: [
      { id: 'karaoke-tea', name: 'Karaoke / Tea Room', floor: '2F' },
      { id: 'exhibition-office', name: 'Exhibition / Office', floor: '2F' },
      { id: 'bbq-kitchen', name: 'BBQ / Kitchen', floor: '1F' },
      { id: 'bathroom-bedroom', name: 'Bathroom / Bedroom', floor: '1F' },
    ],
  },
  {
    id: 'theme-park',
    name: 'Theme Park',
    sites: [
      { id: 'initiation-office', name: 'Initiation Room / Office', floor: '2F' },
      { id: 'bunk-daycare', name: 'Bunk / Day Care', floor: '2F' },
      { id: 'armory-throne', name: 'Armory / Throne Room', floor: '1F' },
      { id: 'lab-storage', name: 'Lab / Storage', floor: '1F' },
    ],
  },
  {
    id: 'villa',
    name: 'Villa',
    sites: [
      { id: 'aviator-games', name: 'Aviator Room / Games Room', floor: '2F' },
      { id: 'trophy-statuary', name: 'Trophy Room / Statuary Room', floor: '2F' },
      { id: 'living-library', name: 'Living Room / Library', floor: '1F' },
      { id: 'dining-kitchen', name: 'Dining Room / Kitchen', floor: '1F' },
    ],
  },
];

export function getMapById(mapId: string): MapData | undefined {
  return MAPS.find(m => m.id === mapId);
}

export function getSiteById(mapId: string, siteId: string): SiteData | undefined {
  const map = getMapById(mapId);
  return map?.sites.find(s => s.id === siteId);
}
