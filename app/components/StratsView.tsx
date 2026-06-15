'use client';

import { useState } from 'react';
import { MAPS, MapData, SiteData } from '../data/maps';
import { STRATS, Strat, getStratsForMap, getStratsForSite } from '../data/strats';

type View = 'maps' | 'sites' | 'strats' | 'detail';

export function StratsView() {
  const [view, setView] = useState<View>('maps');
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [selectedSite, setSelectedSite] = useState<SiteData | null>(null);
  const [selectedStrat, setSelectedStrat] = useState<Strat | null>(null);

  const handleSelectMap = (map: MapData) => {
    setSelectedMap(map);
    setSelectedSite(null);
    setSelectedStrat(null);
    setView('sites');
  };

  const handleSelectSite = (site: SiteData) => {
    setSelectedSite(site);
    setSelectedStrat(null);
    setView('strats');
  };

  const handleSelectStrat = (strat: Strat) => {
    setSelectedStrat(strat);
    setView('detail');
  };

  const handleBack = () => {
    if (view === 'detail') { setView('strats'); setSelectedStrat(null); }
    else if (view === 'strats') { setView('sites'); setSelectedSite(null); }
    else if (view === 'sites') { setView('maps'); setSelectedMap(null); }
  };

  // Count strats per map for badge
  const stratCountByMap = MAPS.reduce((acc, m) => {
    acc[m.id] = getStratsForMap(m.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-auto-hide p-4">
      {view !== 'maps' && (
        <button
          onClick={handleBack}
          className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
      )}

      {/* Map selection */}
      {view === 'maps' && (
        <>
          <h2 className="text-lg font-black uppercase tracking-tight text-white mb-4">Strats – Select Map</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {MAPS.map((map) => (
              <button
                key={map.id}
                onClick={() => handleSelectMap(map)}
                className="text-left p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all flex items-center justify-between"
              >
                <span className="text-sm font-bold text-white">{map.name}</span>
                {stratCountByMap[map.id] > 0 && (
                  <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">
                    {stratCountByMap[map.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Site selection */}
      {view === 'sites' && selectedMap && (
        <>
          <h2 className="text-lg font-black uppercase tracking-tight text-white mb-1">{selectedMap.name}</h2>
          <p className="text-xs text-zinc-500 mb-4">Select a bomb site</p>
          <div className="grid gap-2">
            {selectedMap.sites.map((site) => {
              const count = getStratsForSite(selectedMap.id, site.id).length;
              return (
                <button
                  key={site.id}
                  onClick={() => handleSelectSite(site)}
                  className="text-left p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all flex items-center gap-3"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded shrink-0">
                    {site.floor}
                  </span>
                  <span className="text-sm font-semibold text-zinc-200 flex-1">{site.name}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                      {count} strat{count > 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Strat list for site */}
      {view === 'strats' && selectedMap && selectedSite && (
        <>
          <h2 className="text-lg font-black uppercase tracking-tight text-white mb-1">
            {selectedMap.name} – {selectedSite.name}
          </h2>
          <p className="text-xs text-zinc-500 mb-4">{selectedSite.floor}</p>
          {(() => {
            const strats = getStratsForSite(selectedMap.id, selectedSite.id);
            if (strats.length === 0) {
              return (
                <div className="text-center py-12">
                  <p className="text-zinc-500 text-sm">No strats yet for this site</p>
                  <p className="text-zinc-600 text-xs mt-1">Add strats in app/data/strats.ts</p>
                </div>
              );
            }
            return (
              <div className="grid gap-2">
                {strats.map((strat) => (
                  <button
                    key={strat.id}
                    onClick={() => handleSelectStrat(strat)}
                    className="text-left p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">{strat.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{strat.role}</span>
                      <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{strat.difficulty}</span>
                      {strat.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-500/80 px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {/* Strat detail */}
      {view === 'detail' && selectedStrat && (
        <StratDetail strat={selectedStrat} />
      )}
    </div>
  );
}

function StratDetail({ strat }: { strat: Strat }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black uppercase tracking-tight text-white">{strat.title}</h2>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{strat.role}</span>
          <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{strat.difficulty}</span>
          {strat.season && <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{strat.season}</span>}
          {strat.tags.map(tag => (
            <span key={tag} className="text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-500/80 px-1.5 py-0.5 rounded">{tag}</span>
          ))}
        </div>
        {strat.source && (
          <p className="text-xs text-zinc-500 mt-2 italic">{strat.source}</p>
        )}
      </div>

      {/* Win Condition */}
      <Section title="Win Condition">
        <p className="text-sm text-zinc-300">{strat.winCondition}</p>
      </Section>

      {/* Setup */}
      <Section title="Setup">
        <SubSection title="Reinforcements">
          <List items={strat.setup.reinforcements} />
        </SubSection>
        <SubSection title="Rotations">
          <List items={strat.setup.rotations} />
        </SubSection>
        <SubSection title="Utility Placement">
          {strat.setup.utility.map((u, i) => (
            <div key={i} className="flex gap-2 text-sm text-zinc-300 mb-1">
              <span className="text-yellow-500 font-bold shrink-0">{u.gadget}:</span>
              <span>{u.location}</span>
            </div>
          ))}
        </SubSection>
      </Section>

      {/* Roles */}
      <Section title="Roles">
        {strat.roles.map((r, i) => (
          <div key={i} className="mb-2 p-2 rounded bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white capitalize">{r.operator}</span>
              <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{r.role}</span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{r.description}</p>
          </div>
        ))}
      </Section>

      {/* Round Flow */}
      <Section title="Round Flow">
        <SubSection title="Prep Phase"><List items={strat.roundFlow.prepPhase} /></SubSection>
        <SubSection title="Early Round"><List items={strat.roundFlow.earlyRound} /></SubSection>
        <SubSection title="Mid Round"><List items={strat.roundFlow.midRound} /></SubSection>
        <SubSection title="Plant / Retake"><List items={strat.roundFlow.plantRetake} /></SubSection>
      </Section>

      {/* Counters */}
      <Section title="Counters">
        <List items={strat.counters} variant="danger" />
      </Section>

      {/* Adaptations */}
      <Section title="Adaptations">
        <List items={strat.adaptations} variant="info" />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-800 rounded-lg p-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-500/80 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{title}</h4>
      {children}
    </div>
  );
}

function List({ items, variant }: { items: string[]; variant?: 'danger' | 'info' }) {
  const bulletColor = variant === 'danger' ? 'text-red-400' : variant === 'info' ? 'text-blue-400' : 'text-zinc-500';
  return (
    <ul className="space-y-0.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-zinc-300">
          <span className={`${bulletColor} shrink-0`}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
