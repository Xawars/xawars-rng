'use client';

import { useState, useEffect, useRef } from 'react';
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

/** Per-operator background image position overrides */
const OPERATOR_BG_POSITION: Record<string, string> = {
  buck: 'center 20%',
};

/** Map role names to CSS color values for border tinting */
const ROLE_BORDER_COLORS: Record<string, string> = {
  'Hard Breacher': 'rgba(249,115,22,0.6)',
  'Soft Breacher': 'rgba(251,146,60,0.5)',
  'Entry Fragger': 'rgba(239,68,68,0.6)',
  'Support': 'rgba(59,130,246,0.5)',
  'Intel / Recon': 'rgba(168,85,247,0.5)',
  'Flank Watch': 'rgba(6,182,212,0.5)',
  'Shield': 'rgba(113,113,122,0.5)',
  'Flex': 'rgba(255,255,255,0.3)',
  'Anchor': 'rgba(34,197,94,0.5)',
  'Roamer': 'rgba(239,68,68,0.5)',
  'Lurker': 'rgba(234,179,8,0.5)',
  'Intel Denier': 'rgba(96,165,250,0.5)',
  'Anti-Breach': 'rgba(217,119,6,0.5)',
  'Trap Operator': 'rgba(168,85,247,0.5)',
  'Area Denial': 'rgba(202,138,4,0.5)',
  'Intel / Camera': 'rgba(192,132,252,0.5)',
};

/** Get contextual background tint based on match type */
function getMatchTypeTint(matchType?: string | null): string {
  switch (matchType) {
    case 'Ranked': return 'from-amber-900/10 via-transparent to-transparent';
    case 'Unranked': return 'from-zinc-700/10 via-transparent to-transparent';
    case 'Quick Match': return 'from-sky-900/10 via-transparent to-transparent';
    case 'Deathmatch': return 'from-red-900/10 via-transparent to-transparent';
    default: return '';
  }
}

export function OperatorDisplay({ operator, loadout, matchType, platform, isRolling, hideBg, hideLoadout, targetKills, operatorKills = 0, role }: OperatorDisplayProps) {
  const [bgError, setBgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setBgError(false);
    setImgLoaded(false);
  }, [operator?.id]);

  // Parallax tilt on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 8, y: y * -8 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  if (!operator || !loadout) {
    return (
      <div className="relative flex flex-col items-center justify-center p-8 border border-zinc-800 rounded-xl h-full min-h-[200px] overflow-hidden">
        {/* Subtle animated background */}
        <div className="absolute inset-0 bg-linear-to-br from-zinc-900 via-zinc-900/90 to-zinc-800/50" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        {/* Radar pulse glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-yellow-500/5 blur-3xl animate-radar-pulse" />
        {/* Silhouette outline */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04]">
          <svg viewBox="0 0 100 160" className="w-24 h-36" fill="currentColor">
            <ellipse cx="50" cy="30" rx="18" ry="22" />
            <path d="M25 55 Q50 45 75 55 L80 130 Q50 140 20 130 Z" />
          </svg>
        </div>
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border border-zinc-700 bg-zinc-800/50 flex items-center justify-center animate-radar-pulse">
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

  // Side-based accent colors
  const isAttacker = operator.side === 'attacker';
  const sideGlowColor = isAttacker ? 'rgba(249,115,22,0.15)' : 'rgba(59,130,246,0.15)';
  const sideBorderColor = isAttacker ? 'border-orange-500/30' : 'border-blue-500/30';

  // Role-based border color
  const roleBorderColor = role ? ROLE_BORDER_COLORS[role] : undefined;

  // Match type contextual tint
  const matchTint = getMatchTypeTint(matchType);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`operator-card relative flex flex-col w-full rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${hideBg ? 'border border-zinc-800/50 bg-black/40 backdrop-blur-sm' : `bg-zinc-900 border-2 ${roleBorderColor ? '' : sideBorderColor}`} ${isRolling ? 'opacity-50 blur-sm' : 'opacity-100'} ${isHovered ? 'shadow-[0_0_30px_-5px_var(--card-glow)]' : ''}`}
      style={{
        transform: isHovered ? `perspective(800px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)` : 'perspective(800px) rotateY(0deg) rotateX(0deg)',
        transition: isHovered ? 'transform 0.1s ease-out, box-shadow 0.3s ease' : 'transform 0.4s ease-out, box-shadow 0.3s ease',
        '--card-glow': sideGlowColor,
        ...(roleBorderColor ? { borderColor: roleBorderColor } : {}),
      } as React.CSSProperties}
    >
      
      {/* Background Image Layer */}
      {!hideBg && (
        <div className="absolute inset-0 z-0">
          {/* Shimmer skeleton while loading */}
          {!imgLoaded && !bgError && (
            <div className="absolute inset-0 bg-zinc-800 overflow-hidden">
              <div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-zinc-700/30 to-transparent" />
            </div>
          )}
          {!bgError ? (
            <img 
              src={bgPath} 
              alt="" 
              className={`w-full h-full object-cover transition-all duration-700 ${imgLoaded ? 'opacity-50' : 'opacity-0'} ${isHovered ? 'scale-110' : 'scale-100'}`}
              style={{
                objectPosition: OPERATOR_BG_POSITION[operator.id] || 'top',
                transform: isHovered 
                  ? `scale(1.1) translate(${tilt.x * -2}px, ${tilt.y * 2}px)` 
                  : 'scale(1)',
                transition: 'transform 0.3s ease-out, opacity 0.5s ease',
              }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setBgError(true)}
            />
          ) : (
            // Fallback Gradient if image fails
            <div className={`w-full h-full ${isAttacker ? 'bg-linear-to-br from-orange-900/40 to-black' : 'bg-linear-to-br from-blue-900/40 to-black'}`} />
          )}
          {/* Radial vignette — cinematic focus on center */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 50% 30%, transparent 20%, rgba(9,9,11,0.4) 60%, rgba(9,9,11,0.95) 100%)',
          }} />
          {/* Side-colored accent glow at top corner */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-60" style={{
            background: sideGlowColor,
          }} />
          {/* Match type contextual tint */}
          {matchTint && (
            <div className={`absolute inset-0 bg-linear-to-br ${matchTint}`} />
          )}
          {/* Particle/smoke layer */}
          <div className="absolute inset-0 operator-particles pointer-events-none" />
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
            {/* Role badge */}
            {role && (
              <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                {role}
              </span>
            )}
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
    <div className="flex flex-col border-l-3 border-yellow-500/50 pl-3 bg-black/40 py-1.5 rounded-r-lg backdrop-blur-md">
      <span className="text-yellow-500/80 text-[9px] font-bold uppercase tracking-widest">{label}</span>
      <span className="text-white text-base font-black tracking-tight drop-shadow-sm">{value}</span>
    </div>
  );
}
