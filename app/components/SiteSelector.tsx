'use client';

import { MapPin } from 'lucide-react';
import { MAPS } from '../data/maps';

interface SiteSelectorProps {
  mapId: string;
  currentSiteId: string | null;
  onSelect: (siteId: string | null) => void;
}

/**
 * ponytail: minimal site picker — only rendered when a map is selected.
 * Shows bomb sites as pill buttons. No abstraction needed beyond this.
 */
export function SiteSelector({ mapId, currentSiteId, onSelect }: SiteSelectorProps) {
  const map = MAPS.find(m => m.id === mapId);
  if (!map || map.sites.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
      <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 shrink-0 w-8">Site</span>
      <div className="flex gap-1 flex-1 flex-wrap p-0.5 bg-black/40 rounded-md border border-white/5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`py-1 px-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
            currentSiteId === null
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          Any
        </button>
        {map.sites.map(site => (
          <button
            key={site.id}
            type="button"
            onClick={() => onSelect(site.id)}
            className={`py-1 px-2 text-[10px] font-bold rounded transition-all ${
              currentSiteId === site.id
                ? 'bg-purple-500/20 text-purple-400 shadow-sm border border-purple-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
            }`}
            title={`${site.name} (${site.floor})`}
          >
            {site.name}
          </button>
        ))}
      </div>
    </div>
  );
}
