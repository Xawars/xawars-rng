'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
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
  deploymentId?: string;
}

type DeploymentStatus = 'completed' | 'in-progress' | 'pending';

interface HistoryListProps {
  history: HistoryItem[];
  operatorKills?: Record<string, number>;
  currentOperatorId?: string | null;
  onItemClick?: (item: HistoryItem) => void;
  onDeleteItem?: (item: HistoryItem) => void;
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

export function HistoryList({ history, operatorKills = {}, currentOperatorId = null, onItemClick, onDeleteItem }: HistoryListProps) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Recent Deployments</h3>

      <div className="flex flex-col gap-1.5">
        {history.map((item) => {
          const status = getStatus(item, operatorKills, currentOperatorId);
          const cfg = STATUS_CONFIG[status];
          const isConfirming = confirmingId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => !isConfirming && onItemClick?.(item)}
              className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-lg backdrop-blur-sm cursor-pointer hover:border-yellow-500/50 hover:bg-zinc-800/80 transition-colors group"
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

              {/* Side indicator + Delete */}
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${item.operator.side === 'attacker' ? 'text-orange-500/60' : 'text-blue-500/60'}`}>
                  {item.operator.side === 'attacker' ? 'ATK' : 'DEF'}
                </span>

                {onDeleteItem && (
                  isConfirming ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item);
                        setConfirmingId(null);
                      }}
                      className="p-1 rounded text-red-400 bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 transition-colors"
                      aria-label={`Confirm delete ${item.operator.name}`}
                      title="Click to confirm"
                    >
                      <Trash2 size={12} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingId(item.id);
                      }}
                      className="p-1 rounded text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      aria-label={`Delete ${item.operator.name} deployment`}
                      title="Delete deployment"
                    >
                      <Trash2 size={12} />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
