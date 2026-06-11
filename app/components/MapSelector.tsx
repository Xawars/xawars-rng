'use client';

import { getActiveMaps } from '../lib/map-performance';
import { MAPS } from '../data/maps';

interface MapSelectorProps {
  selectedMapId: string | null;
  onMapChange: (mapId: string | null) => void;
  disabled?: boolean;
}

export function MapSelector({ selectedMapId, onMapChange, disabled }: MapSelectorProps) {
  const activeMaps = getActiveMaps(MAPS);

  if (activeMaps.length === 0) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onMapChange(value || null);
  };

  return (
    <select
      value={selectedMapId ?? ''}
      onChange={handleChange}
      disabled={disabled}
      aria-label="Map selector"
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white transition duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="">No map selected</option>
      {activeMaps.map((map) => (
        <option key={map.id} value={map.id}>
          {map.name}
        </option>
      ))}
    </select>
  );
}
