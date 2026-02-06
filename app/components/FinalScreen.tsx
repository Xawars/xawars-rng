import React from 'react';
import { Button } from './ui/Button';
import { RotateCcw } from 'lucide-react';

interface FinalScreenProps {
  kills: number;
  deaths: number;
  onReset: () => void;
}

export function FinalScreen({ kills, deaths, onReset }: FinalScreenProps) {
  // Calculate potential KD or other stats (minimal for MVP)
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-zinc-900 border border-yellow-500/20 p-8 rounded-2xl shadow-2xl text-center space-y-8 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div>
          <h2 className="text-yellow-500 text-sm font-bold uppercase tracking-widest mb-2">Mission Complete</h2>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Challenge Result</h1>
        </div>

        <div className="flex items-center justify-center gap-4 text-6xl font-black tracking-tighter text-white">
          <div className="flex flex-col items-center">
            <span className="text-yellow-400">{kills}</span>
            <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase mt-2">Kills</span>
          </div>
          <span className="text-zinc-700">/</span>
          <div className="flex flex-col items-center">
            <span className="text-white">{deaths}</span>
            <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase mt-2">Deaths</span>
          </div>
        </div>

        <Button 
          variant="primary" 
          size="lg" 
          onClick={onReset}
          icon={RotateCcw}
          className="w-full"
        >
          Start New Run
        </Button>
      </div>
    </div>
  );
}
