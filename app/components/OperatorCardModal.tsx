'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from './ui/Button';
import { OperatorDisplay } from './OperatorDisplay';
import { HistoryItem } from './HistoryList';
import { MAPS } from '../data/maps';
import { toPng } from 'html-to-image';

interface OperatorCardModalProps {
  item: HistoryItem | null;
  operatorKills: Record<string, number>;
  operatorDeaths: Record<string, number>;
  onClose: () => void;
}

export function OperatorCardModal({ item, operatorKills, operatorDeaths, onClose }: OperatorCardModalProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const exportNode = document.getElementById('operator-card-export-content');
    if (!exportNode || !item) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(exportNode, {
        cacheBust: true,
        backgroundColor: '#09090b',
      });
      const link = document.createElement('a');
      link.download = `xawars-${item.operator.id}-card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const kills = operatorKills[item.deploymentId || item.operator.id] || 0;
  const deaths = operatorDeaths[item.deploymentId || item.operator.id] || 0;
  const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : null;
  const kdColor = kd !== null && kd >= 1 ? 'text-green-400' : 'text-red-400';
  const targetComplete = item.targetKills && item.targetKills > 0 && kills >= item.targetKills;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-wider">
              {item.operator.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              title="Export as image"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} icon={X}>
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        <div id="operator-card-export-content" className="flex flex-col min-h-0 overflow-y-auto">
          <div className="px-4 py-2 bg-zinc-800/50 flex items-center gap-2 text-xs border-b border-zinc-700/50">
            <span className={`font-bold uppercase ${item.operator.side === 'attacker' ? 'text-orange-500' : 'text-blue-500'}`}>
              {item.operator.side}
            </span>
            {item.matchType && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">{item.matchType}</span>
              </>
            )}
            {item.platform && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">{item.platform}</span>
              </>
            )}
            {item.role && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-yellow-500">{item.role}</span>
              </>
            )}
            <span className="text-zinc-600 ml-auto">·</span>
            <span className="text-green-400 font-bold">{kills} K</span>
            <span className="text-zinc-600">/</span>
            <span className="text-red-400 font-bold">{deaths} D</span>
            {kd !== null && (
              <>
                <span className="text-zinc-600">·</span>
                <span className={`font-black ${kdColor}`}>{kd.toFixed(2)} KD</span>
              </>
            )}
          </div>
          {targetComplete && (
            <div className="px-4 py-2 bg-green-900/30 border-b border-green-500/30 flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-green-400">
                Target Complete — {kills} / {item.targetKills} Kills
              </span>
            </div>
          )}
          <div className="p-6">
            <OperatorDisplay
              operator={item.operator}
              loadout={item.loadout}
              matchType={item.matchType}
              platform={item.platform}
              isRolling={false}
              targetKills={item.targetKills}
              operatorKills={kills}
              role={item.role}
            />
          </div>

          {/* ponytail: rounds grouped by match — legacy matches show per-round map inline */}
          {item.matches && item.matches.length > 0 && (
            <div className="px-4 pb-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Round Timeline</h4>
              <div className="flex flex-col gap-2">
                {item.matches.map((match) => {
                  const matchMapName = match.mapId ? (MAPS.find(m => m.id === match.mapId)?.name || match.mapId) : null;
                  return (
                    <div key={match.id} className="flex flex-col gap-1">
                      {matchMapName && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">{matchMapName}</span>
                      )}
                      {match.rounds.map((round, i) => {
                        // ponytail: legacy matches (mapId null) show per-round _legacyMapId inline
                        const legacyMapId = !match.mapId ? (round as any)._legacyMapId : null;
                        const roundMapName = legacyMapId ? (MAPS.find(m => m.id === legacyMapId)?.name || legacyMapId) : null;
                        const siteMapId = match.mapId || legacyMapId;
                        const site = round.siteId && siteMapId ? MAPS.find(m => m.id === siteMapId)?.sites.find(s => s.id === round.siteId)?.name : null;
                        const isWin = round.outcome === 'win';
                        return (
                          <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] border ${isWin ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <span className={`font-black text-[10px] w-4 ${isWin ? 'text-green-400' : 'text-red-400'}`}>{isWin ? 'W' : 'L'}</span>
                            <span className="text-zinc-300 font-medium truncate">{roundMapName ? `${roundMapName}` : ''}{site ? `${roundMapName ? ' · ' : ''}${site}` : ''}</span>
                            <span className="ml-auto text-zinc-400 font-mono text-[10px]">{round.kills}K / {round.deaths}D</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}