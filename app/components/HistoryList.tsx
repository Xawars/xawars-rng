'use client';

import { Operator, Loadout } from '../data/types';

export interface HistoryItem {
  id: number;
  operator: Operator;
  loadout: Loadout;
}

import { OperatorIcon } from './OperatorIcon';

interface HistoryListProps {
  history: HistoryItem[];
}

export function HistoryList({ history }: HistoryListProps) {
  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-8">
      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Recent Deployments</h3>
      
      <div className="flex flex-col gap-2">
        {history.map((item) => (
          <div 
            key={item.id}
            className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg backdrop-blur-sm animate-in slide-in-from-left-4 fade-in duration-300"
          >
            {/* Mini Icon */}
            <div className={`h-10 w-10 flex-shrink-0 rounded-md flex items-center justify-center font-bold text-lg ${item.operator.side === 'attacker' ? 'bg-orange-900/20 text-orange-500' : 'bg-blue-900/20 text-blue-500'}`}>
              <OperatorIcon id={item.operator.id} className="w-full h-full drop-shadow-sm">
                 {item.operator.name[0]}
              </OperatorIcon>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
               <div className="flex items-center justify-between">
                 <h4 className="text-sm font-bold text-zinc-200 uppercase truncate">{item.operator.name}</h4>
                 <span className={`text-[10px] font-bold uppercase tracking-wider ${item.operator.side === 'attacker' ? 'text-orange-500/80' : 'text-blue-500/80'}`}>
                    {item.operator.side}
                 </span>
               </div>
               <p className="text-xs text-zinc-500 truncate">{item.loadout.primary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
