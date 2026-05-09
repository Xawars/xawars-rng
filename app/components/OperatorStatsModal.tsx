'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { X, ArrowUpDown, Clock, TrendingUp, Sword, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Button } from './ui/Button';
import { OperatorIcon } from './OperatorIcon';
import { HistoryItem } from './HistoryList';
import { useOperatorStats, sortStats, SortMode, OperatorStats } from '../hooks/useOperatorStats';

interface OperatorStatsModalProps {
  history: HistoryItem[];
  operatorKills: Record<string, number>;
  operatorDeaths: Record<string, number>;
  onSelect: (item: HistoryItem) => void;
  onClose: () => void;
}

function KDBadge({ kd }: { kd: number | null }) {
  if (kd === null) return <span className="text-zinc-500">—</span>;
  const color = kd >= 1 ? 'text-green-400' : 'text-red-400';
  return <span className={`font-black text-lg ${color}`}>{kd.toFixed(2)}</span>;
}

function ObjectiveBar({ kills, target, progress }: { kills: number; target: number; progress: number }) {
  return (
    <div className="mt-1.5">
      <div className="flex justify-between mb-0.5">
        <span className="text-[9px] text-zinc-400 font-medium">OBJECTIVE</span>
        <span className="text-[9px] text-zinc-500 font-bold">{kills} / {target}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-green-500 transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

function OperatorRow({
  stat,
  history,
  onSelect,
  operatorKills,
  operatorDeaths,
}: {
  stat: OperatorStats;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  operatorKills: Record<string, number>;
  operatorDeaths: Record<string, number>;
}) {
  const lastItem = useMemo(
    () => history.find(h => h.operator.id === stat.id && h.id === stat.lastUsed),
    [history, stat.id, stat.lastUsed]
  );

  const kills = operatorKills[stat.id] || 0;
  const deaths = operatorDeaths[stat.id] || 0;

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const node = document.getElementById(`export-card-${stat.id}`);
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { cacheBust: true, backgroundColor: '#09090b' });
      const link = document.createElement('a');
      link.download = `xawars-${stat.id}-stats.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <div
      onClick={() => lastItem && onSelect(lastItem)}
      className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 p-3 rounded-lg hover:border-yellow-500/50 hover:bg-zinc-800 cursor-pointer transition-all duration-150 group"
    >
      <div className={`h-10 w-10 flex-shrink-0 rounded-md flex items-center justify-center ${stat.side === 'attacker' ? 'bg-orange-900/30 text-orange-400' : 'bg-blue-900/30 text-blue-400'}`}>
        <OperatorIcon id={stat.id} className="w-full h-full drop-shadow-sm">
          {stat.name[0]}
        </OperatorIcon>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-zinc-200 uppercase tracking-wide">{stat.name}</span>
          <div className="flex items-center gap-2">
            <KDBadge kd={stat.kd} />
            <button
              onClick={handleExport}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-yellow-500 transition-colors"
              title="Export card"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${stat.side === 'attacker' ? 'text-orange-500/70' : 'text-blue-500/70'}`}>
            {stat.side}
          </span>
          <span className="text-[9px] text-zinc-500">·</span>
          <span className="text-[9px] text-zinc-500">{stat.deployments} deploy{stat.deployments !== 1 ? 's' : ''}</span>
          <span className="text-[9px] text-zinc-500">·</span>
          <span className="text-[9px] text-green-500 font-medium">{stat.totalKills} K</span>
        </div>
        {stat.objectiveTarget > 0 && (
          <ObjectiveBar
            kills={stat.objectiveKills}
            target={stat.objectiveTarget}
            progress={stat.objectiveProgress}
          />
        )}
      </div>
    </div>
  );
}

function ExportableCard({
  stat,
  kills,
  deaths,
  lastItem,
}: {
  stat: OperatorStats;
  kills: number;
  deaths: number;
  lastItem: HistoryItem | undefined;
}) {
  if (!lastItem) return null;
  
  return (
    <div
      id={`export-card-${stat.id}`}
      className="absolute top-0 left-0 w-[400px] p-4 bg-zinc-950 border-2 border-zinc-800 rounded-xl -z-50 opacity-0 pointer-events-none"
    >
      <div className="flex items-start gap-4">
        <div className={`h-20 w-20 flex-shrink-0 rounded-lg flex items-center justify-center ${stat.side === 'attacker' ? 'bg-orange-900/40 text-orange-400' : 'bg-blue-900/40 text-blue-400'}`}>
          <OperatorIcon id={stat.id} className="w-full h-full drop-shadow-lg">
            {stat.name[0]}
          </OperatorIcon>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xl font-black text-white uppercase tracking-wide">{stat.name}</span>
            <KDBadge kd={stat.kd} />
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${stat.side === 'attacker' ? 'text-orange-500' : 'text-blue-500'}`}>
              {stat.side}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-xs text-zinc-500 font-medium">{stat.deployments} deploy{stat.deployments !== 1 ? 's' : ''}</span>
            {lastItem.matchType && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-400">{lastItem.matchType}</span>
              </>
            )}
            {lastItem.platform && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-400">{lastItem.platform}</span>
              </>
            )}
          </div>
          
          {lastItem.role && (
            <div className="text-xs text-yellow-500 font-medium mb-2 uppercase tracking-wide">
              {lastItem.role}
            </div>
          )}
          
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-400 font-bold">{kills} K</span>
            <span className="text-zinc-600">/</span>
            <span className="text-red-400 font-bold">{deaths} D</span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-1">Objective</div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-zinc-300 font-medium">{stat.objectiveKills} / {stat.objectiveTarget}</span>
          <span className="text-zinc-500 font-bold">{Math.round(stat.objectiveProgress)}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-green-500"
            style={{ width: `${Math.min(stat.objectiveProgress, 100)}%` }}
          />
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-1">Loadout</div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 uppercase w-16">Primary</span>
            <span className="text-xs text-zinc-300">{lastItem.loadout.primary}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 uppercase w-16">Secondary</span>
            <span className="text-xs text-zinc-300">{lastItem.loadout.secondary}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 uppercase w-16">Gadget</span>
            <span className="text-xs text-zinc-300">{lastItem.loadout.gadget}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
        active
          ? 'bg-yellow-500 text-black'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

export function OperatorStatsModal({
  history,
  operatorKills,
  operatorDeaths,
  onSelect,
  onClose,
}: OperatorStatsModalProps) {
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const stats = useOperatorStats(history, operatorKills, operatorDeaths);
  const sorted = useMemo(() => sortStats(stats, sortMode), [stats, sortMode]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="relative bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-yellow-500 uppercase tracking-wider">Select Operator</h2>
            <span className="text-xs text-zinc-500 font-medium">{history.length} deployments</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} icon={X}>
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="px-4 py-2 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <SortButton active={sortMode === 'recent'} onClick={() => setSortMode('recent')}>
              <Clock className="w-3 h-3" /> Recent
            </SortButton>
            <SortButton active={sortMode === 'kd'} onClick={() => setSortMode('kd')}>
              <TrendingUp className="w-3 h-3" /> K/D
            </SortButton>
            <SortButton active={sortMode === 'kills'} onClick={() => setSortMode('kills')}>
              <Sword className="w-3 h-3" /> Kills
            </SortButton>
            <SortButton active={sortMode === 'alpha'} onClick={() => setSortMode('alpha')}>
              <ArrowUpDown className="w-3 h-3" /> A-Z
            </SortButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-sm">No deployments yet.</p>
              <p className="text-xs mt-1">Roll an operator to get started!</p>
            </div>
          ) : (
            sorted.map(stat => (
              <OperatorRow
                key={stat.id}
                stat={stat}
                history={history}
                onSelect={onSelect}
                operatorKills={operatorKills}
                operatorDeaths={operatorDeaths}
              />
            ))
          )}
        </div>

        {/* Hidden export cards - rendered off-screen for image capture */}
        <div className="absolute -left-[9999px] top-0 w-[400px] space-y-4">
          {sorted.map(stat => {
            const lastItem = history.find(h => h.operator.id === stat.id && h.id === stat.lastUsed);
            const kills = operatorKills[stat.id] || 0;
            const deaths = operatorDeaths[stat.id] || 0;
            return (
              <ExportableCard
                key={stat.id}
                stat={stat}
                kills={kills}
                deaths={deaths}
                lastItem={lastItem}
              />
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-white/5 text-center flex-shrink-0">
          <p className="text-[10px] text-zinc-600">Click an operator to restore their deployment</p>
        </div>
      </div>
    </div>
  );
}