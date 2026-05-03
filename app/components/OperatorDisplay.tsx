'use client';

import { useState, useEffect } from 'react';
import { Operator, Loadout } from '../data/types';
import * as r6operators from 'r6operators';

interface OperatorDisplayProps {
  operator: Operator | null;
  loadout: Loadout | null;
  matchType?: string | null;
  isRolling?: boolean;
  hideBg?: boolean;
  hideLoadout?: boolean;
}

export function OperatorDisplay({ operator, loadout, matchType, isRolling, hideBg, hideLoadout }: OperatorDisplayProps) {
  // Reset image error state when operator changes
  const [bgError, setBgError] = useState(false);

  useEffect(() => {
    setBgError(false);
  }, [operator?.id]);

  if (!operator || !loadout) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-xl min-h-[300px] text-zinc-500">
        <p className="font-mono uppercase tracking-widest text-sm">Waiting for Intel...</p>
      </div>
    );
  }

  // Paths
  const bgPath = `/ops/${operator.id}.jpg`;
  
  // Get icon from r6operators library
  const opIconData = (r6operators as any)[operator.id];
  const iconSvg = opIconData?.toSVG({
    class: "w-full h-full drop-shadow-lg",
    width: "100%",
    height: "100%"
  });

  return (
    <div className={`relative flex flex-col w-full border rounded-xl overflow-hidden shadow-2xl transition-opacity duration-300 ${hideBg ? 'border-zinc-800/50 bg-black/40 backdrop-blur-sm' : 'bg-zinc-900 border-zinc-800'} ${isRolling ? 'opacity-50 blur-sm' : 'opacity-100'}`}>
      
      {/* Background Image Layer */}
      {!hideBg && (
        <div className="absolute inset-0 z-0">
          {!bgError ? (
            <img 
              src={bgPath} 
              alt="" 
              className="w-full h-full object-cover object-top opacity-40 animate-ken-burns"
              onError={() => setBgError(true)}
            />
          ) : (
            // Fallback Gradient if image fails
            <div className={`w-full h-full ${operator.side === 'attacker' ? 'bg-gradient-to-br from-orange-900/40 to-black' : 'bg-gradient-to-br from-blue-900/40 to-black'}`} />
          )}
          {/* Overlay gradient to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/80 to-zinc-900" />
        </div>
      )}

      {/* Content Layer */}
      <div className="relative z-10">
        {/* Operator Header */}
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-widest block ${operator.side === 'attacker' ? 'text-orange-500' : 'text-blue-500'}`}>
                {operator.side}
              </span>
              {matchType && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/50">
                  {matchType}
                </span>
              )}
            </div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-md">
              {operator.name}
            </h2>
          </div>
          
          {/* Icon */}
          <div className="h-16 w-16 flex items-center justify-center">
            {iconSvg ? (
               <div 
                 className="w-full h-full flex items-center justify-center"
                 dangerouslySetInnerHTML={{ __html: iconSvg }}
               />
            ) : (
                // Fallback Icon
                <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center font-bold text-xl text-white/50">
                    {operator.name[0]}
                </div>
            )}
          </div>
        </div>

        {/* Loadout Grid */}
        {!hideLoadout && (
          <div className="p-6 grid gap-6">
            <LoadoutItem label="Primary Weapon" value={loadout.primary} />
            <LoadoutItem label="Secondary Weapon" value={loadout.secondary} />
            <LoadoutItem label="Gadget" value={loadout.gadget} />
          </div>
        )}
      </div>
    </div>
  );
}

function LoadoutItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col border-l-4 border-yellow-500/50 pl-4 bg-black/20 py-2 rounded-r-lg backdrop-blur-sm">
      <span className="text-yellow-500/80 text-[10px] font-bold uppercase tracking-widest mb-0.5">{label}</span>
      <span className="text-white text-xl font-black tracking-tight drop-shadow-sm">{value}</span>
    </div>
  );
}
