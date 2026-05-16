'use client';

import { Operator, Loadout, Platform } from '../data/types';
import { OperatorIcon } from './OperatorIcon';

export interface HistoryItem {
  id: number;
  operator: Operator;
  loadout: Loadout;
  matchType?: string;
  platform?: Platform;
  targetKills?: number;
  role?: string;
}

type DeploymentStatus = 'completed' | 'in-progress' | 'pending';

interface HistoryListProps {
  history: HistoryItem[];
  operatorKills?: Record<string, number>;
  currentOperatorId?: string | null;
  onItemClick?: (item: HistoryItem) => void;
}

function getStatus(
  item: HistoryItem,
  operatorKills: Record<string, number>,
  currentOperatorId: string | null
): DeploymentStatus {
  const kills = operatorKills[item.operator.id] || 0;
  const target = item.targetKills || 0;

  // If target is met, it's completed
  if (target > 0 && kills >= target) return 'completed';

  // If this is the currently active operator, it's in progress
  if (currentOperatorId === item.operator.id) return 'in-progress';

  // Otherwise it's a past deployment (pending = was never completed)
  return 'pending';
}

const STATUS_CONFIG = {
  'completed': {
    label: 'Done',
    bg: 'bg-green-500/15',
    border: 'border-green-500/40',
    text: 'text-green-400',
  },
  'in-progress': {
    label: 'Active',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/40',
    text: 'text-yellow-400',
  },
  'pending': {
    label: 'Past',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-600/40',
    text: 'text-zinc-500',
  },
} as const;

export function HistoryList({ history, operatorKills = {}, currentOperatorId = null, onItemClick }: HistoryListProps) {
  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Recent Deployments</h3>

      <div className="flex flex-col gap-1.5">
        {history.map((item) => {
          const status = getStatus(item, operatorKills, currentOperatorId);
          const cfg = STATUS_CONFIG[status];

          return (
            <div
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-lg backdrop-blur-sm cursor-pointer hover:border-yellow-500/50 hover:bg-zinc-800/80 transition-colors"
            >
              {/* Mini Icon */}
              <div className={`h-9 w-9 shrink-0 rounded-md flex items-center justify-center font-bold text-lg ${item.operator.side === 'attacker' ? 'bg-orange-900/20 text-orange-500' : 'bg-blue-900/20 text-blue-500'}`}>
                <OperatorIcon id={item.operator.id} className="w-full h-full drop-shadow-sm">
                  {item.operator.name[0]}
                </OperatorIcon>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-200 uppercase truncate">
                    {item.operator.name}
                  </h4>
                  {/* Status badge */}
                  <span className={`shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-zinc-500 truncate">{item.loadout.primary}</span>
                  {item.matchType && (
                    <span className="text-[9px] text-zinc-600">• {item.matchType}</span>
                  )}
                </div>
              </div>

              {/* Side indicator */}
              <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${item.operator.side === 'attacker' ? 'text-orange-500/60' : 'text-blue-500/60'}`}>
                {item.operator.side === 'attacker' ? 'ATK' : 'DEF'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
