'use client';

import { useState } from 'react';
import { MapPin, Target, Shield, Crosshair } from 'lucide-react';
import { MAPS, getMapData, OperatorRecommendation } from '../data/maps';
import { operators } from '../data/operators';
import { getRoleColor, Role } from '../data/roles';
import * as r6operators from 'r6operators';

export function MapAdvisor() {
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedSide, setSelectedSide] = useState<'attack' | 'defense'>('defense');

  const currentMap = MAPS.find(m => m.id === selectedMap);
  const mapData = selectedMap && selectedSite ? getMapData(selectedMap, selectedSite) : null;

  const recommendations = mapData?.[selectedSide] || [];

  const getOperatorName = (id: string) => {
    const op = operators.find(o => o.id === id);
    return op?.name || id;
  };

  const getOperator = (id: string) => {
    return operators.find(o => o.id === id);
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-2xl font-black text-yellow-500 uppercase tracking-tighter mb-6 flex items-center gap-2">
        <MapPin className="w-6 h-6" />
        Map Advisor
      </h2>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Map Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Select Map
          </label>
          <select
            value={selectedMap}
            onChange={(e) => {
              setSelectedMap(e.target.value);
              setSelectedSite('');
            }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-yellow-500"
          >
            <option value="">Choose a map...</option>
            {MAPS.map(map => (
              <option key={map.id} value={map.id}>{map.name}</option>
            ))}
          </select>
        </div>

        {/* Site Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Select Site
          </label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            disabled={!selectedMap}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Choose a site...</option>
            {currentMap?.sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>

        {/* Side Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Side
          </label>
          <div className="flex bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setSelectedSide('defense')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md font-bold text-sm transition-colors ${
                selectedSide === 'defense'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              Defense
            </button>
            <button
              onClick={() => setSelectedSide('attack')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md font-bold text-sm transition-colors ${
                selectedSide === 'attack'
                  ? 'bg-orange-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Crosshair className="w-4 h-4" />
              Attack
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Recommended Operators - {selectedSide === 'defense' ? 'Defense' : 'Attack'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, index) => {
              const op = getOperator(rec.operatorId);
              const opIconData = (r6operators as any)[rec.operatorId];
              const iconSvg = opIconData?.toSVG({
                class: "w-full h-full drop-shadow-lg",
                width: "100%",
                height: "100%"
              });

              return (
                <div
                  key={rec.operatorId}
                  className={`relative bg-zinc-800/80 border rounded-lg p-4 ${
                    rec.importance === 'primary'
                      ? 'border-yellow-500/50'
                      : rec.importance === 'secondary'
                      ? 'border-zinc-600'
                      : 'border-zinc-700'
                  }`}
                >
                  {/* Importance Badge */}
                  {rec.importance === 'primary' && (
                    <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded">
                      PRIMARY
                    </span>
                  )}
                  {rec.importance === 'secondary' && (
                    <span className="absolute -top-2 -right-2 bg-zinc-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      SECONDARY
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`h-12 w-12 flex-shrink-0 rounded-md flex items-center justify-center ${
                      op?.side === 'attacker' ? 'bg-orange-900/30' : 'bg-blue-900/30'
                    }`}>
                      {iconSvg ? (
                        <div className="w-full h-full flex items-center justify-center p-1">
                          <div dangerouslySetInnerHTML={{ __html: iconSvg }} />
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-zinc-400">{getOperatorName(rec.operatorId)[0]}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-black text-white uppercase truncate">
                          {getOperatorName(rec.operatorId)}
                        </h4>
                        {op?.roles?.[0] && (
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${getRoleColor(op.roles[0] as Role)}/20 ${getRoleColor(op.roles[0] as Role).replace('bg-', 'text-')}`}>
                            {op.roles[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 leading-tight">
                        {rec.reason}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : selectedMap && selectedSite ? (
        <div className="text-center py-8 text-zinc-500">
          <p>No recommendations available for this site yet.</p>
        </div>
      ) : (
        <div className="text-center py-8 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-lg">
          <p className="font-mono uppercase tracking-widest text-sm">Select a map and site to see recommendations</p>
        </div>
      )}
    </div>
  );
}