import React from 'react';
import { Button } from './ui/Button';
import { Plus } from 'lucide-react';

interface StatCounterProps {
  label: string;
  value: number;
  onIncrement: () => void;
  variant?: 'primary' | 'danger';
}

export function StatCounter({ label, value, onIncrement, variant = 'primary' }: StatCounterProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-white/50 text-xs font-bold uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-4 bg-white/5 p-2 rounded-lg border border-white/10">
        <span className="text-3xl font-black min-w-[3ch] text-center font-mono text-white">
          {value}
        </span>
        <Button 
          variant={variant} 
          size="sm" 
          onClick={onIncrement}
          icon={Plus}
          aria-label={`Add ${label}`}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
