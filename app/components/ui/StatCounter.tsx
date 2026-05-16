import React from 'react';
import { DeltaIndicator } from './DeltaIndicator';

interface StatCounterProps {
  value: string | number;
  label: string;
  delta?: number;
  className?: string;
}

export function StatCounter({
  value,
  label,
  delta,
  className = '',
}: StatCounterProps) {
  return (
    <div className={`bg-zinc-800/60 rounded-lg border border-zinc-700/50 p-3 text-center ${className}`}>
      <div className="font-black text-white text-xl font-mono">
        {value}
      </div>
      {delta !== undefined && (
        <DeltaIndicator value={delta} className="mt-0.5" />
      )}
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
        {label}
      </div>
    </div>
  );
}
