'use client';

import { useState, useEffect } from 'react';
import { Operator, Loadout, Platform } from '../data/types';
import { getRoleColor, Role } from '../data/roles';
import * as r6operators from 'r6operators';

interface OperatorDisplayProps {
  operator: Operator | null;
  loadout: Loadout | null;
  matchType?: string | null;
  platform?: Platform | null;
  isRolling?: boolean;
  hideBg?: boolean;
  hideLoadout?: boolean;
  targetKills?: number;
  operatorKills?: number;
  role?: string;
}

export function OperatorDisplay({ operator, loadout, matchType, platform, isRolling, hideBg, hideLoadout, targetKills, operatorKills = 0, role }: OperatorDisplayProps) {
  // Reset image error state when operator changes
  const [bgError, setBgError] = useState(false);

  useEffect(() => {
    setBgError(false);
  }, [operator?.id]);

  if (!operator || !loadout) {
    return (
      <div className="relative flex flex-col items-center justify-center p-8 border border-zinc-800 rounded-xl h-full min-h-[200px] overflow-hidden">
        {/* Subtle animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-800/50" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        {/* Subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-yellow-500/5 blur-3xl" />
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border border-zinc-700 bg-zinc-800/50 flex items-center justify-center">
            <span className="text-xl text-zinc-600">?</span>
          </div>
          <p className="font-mono uppercase tracking-[0.2em] text-[11px] text-zinc-500">Waiting for Intel...</p>
          <p className="text-[10px] text-zinc-600">Deploy an operator to begin</p>
        </div>
      </div>
    );
  }

  // Paths — guest operators use .png, standard ops use .jpg
  const imgExt = operator.id === 'snake' ? 'png' : 'jpg';
  const bgPath = `/ops/${operator.id}.${imgExt}`;
  
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
              className="w-full h-full object-cover object-top opacity-50 animate-ken-burns"
              onError={() => setBgError(true)}
            />
          ) : (
            // Fallback Gradient if image fails
            <div className={`w-full h-full ${operator.side === 'attacker' ? 'bg-gradient-to-br from-orange-900/40 to-black' : 'bg-gradient-to-br from-blue-900/40 to-black'}`} />
          )}
          {/* Overlay gradient — keeps top visible for face, darkens bottom for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-zinc-900/60 to-zinc-900/95" />
        </div>
      )}

      {/* Content Layer */}
      <div className="relative z-10">
        {/* Operator Header */}
        <div className="p-3 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter drop-shadow-md">
              {operator.name}
            </h2>
          </div>
          
          {/* Icon */}
          <div className="h-12 w-12 flex items-center justify-center">
            {iconSvg ? (
               <div 
                 className="w-full h-full flex items-center justify-center"
                 dangerouslySetInnerHTML={{ __html: iconSvg }}
               />
            ) : operator.id === 'snake' ? (
                <img src="/ops/snake_logo.png" alt={operator.name} className="w-full h-full object-contain drop-shadow-lg" />
            ) : (
                // Fallback Icon
                <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center font-bold text-xl text-white/50">
                    {operator.name[0]}
                </div>
            )}
          </div>
        </div>

        {/* Target Progress Bar */}
        {targetKills && targetKills > 0 && (
          <div className="px-3 pb-2">
            {operatorKills >= targetKills ? (
              /* Completed state */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-green-400">Target Complete</span>
                </div>
                <span className="text-[10px] font-bold text-green-400">{operatorKills} / {targetKills}</span>
              </div>
            ) : (
              /* In-progress state */
              <>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-green-400">Target Progress</span>
                  <span className="text-[10px] font-bold text-zinc-300">{operatorKills} / {targetKills}</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300 ease-out"
                    style={{ width: `${Math.min((operatorKills / targetKills) * 100, 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Loadout Grid */}
        {!hideLoadout && (
          <div className="p-3 grid gap-2">
            <LoadoutItem label="Primary" value={loadout.primary} />
            <LoadoutItem label="Secondary" value={loadout.secondary} />
            <LoadoutItem label="Gadget" value={loadout.gadget} />
          </div>
        )}
      </div>
    </div>
  );
}

function LoadoutItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col border-l-3 border-yellow-500/50 pl-3 bg-black/20 py-1 rounded-r-lg backdrop-blur-sm">
      <span className="text-yellow-500/80 text-[9px] font-bold uppercase tracking-widest">{label}</span>
      <span className="text-white text-base font-black tracking-tight drop-shadow-sm">{value}</span>
    </div>
  );
}
