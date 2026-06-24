'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dices, Swords, ShieldHalf, ArrowLeft, Heart, Zap, Brain, RotateCcw, Crosshair, Trophy, Plus, Minus, Trash2, Check } from 'lucide-react';
import Link from 'next/link';
import { usePersistedState } from '../hooks/usePersistedState';
import type { RandomOperator } from './page';

type SideFilter = 'all' | 'ATTACKER' | 'DEFENDER';

export function RandomClient({ operators }: { operators: RandomOperator[] }) {
  const [side, setSide] = useState<SideFilter>('all');
  const [result, setResult] = useState<RandomOperator | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [history, setHistory] = useState<RandomOperator[]>([]);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cycleOp, setCycleOp] = useState<RandomOperator | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [objectives, setObjectives] = useState<{ kills: number; rounds: number } | null>(null);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [roundsWon, setRoundsWon] = useState(0);
  const [roundsLost, setRoundsLost] = useState(0);

  // Deployments — track all rolled operators with their objectives and progress
  type Deployment = {
    operator: RandomOperator;
    objectives: { kills: number; rounds: number };
    kills: number;
    deaths: number;
    roundsWon: number;
    roundsLost: number;
  };
  const [deployments, setDeployments] = usePersistedState<Deployment[]>('random-deployments', []);
  const [activeDeployIdx, setActiveDeployIdx] = usePersistedState<number | null>('random-active-deploy', null);

  // Per-operator session stats — keyed by operator id
  const [operatorStats, setOperatorStats] = usePersistedState<Record<string, { kills: number; deaths: number; roundsWon: number; roundsLost: number }>>('random-operator-stats', {});

  // Current operator's total stats (saved + current counters)
  const currentOpStats = result ? (operatorStats[result.id] ?? { kills: 0, deaths: 0, roundsWon: 0, roundsLost: 0 }) : null;
  const totalKills = (currentOpStats?.kills ?? 0) + kills;
  const totalDeaths = (currentOpStats?.deaths ?? 0) + deaths;
  const totalRoundsWon = (currentOpStats?.roundsWon ?? 0) + roundsWon;
  const totalRoundsLost = (currentOpStats?.roundsLost ?? 0) + roundsLost;

  const pool = side === 'all' ? operators : operators.filter(op => op.role === side);

  // Switch to a different deployment
  function switchDeployment(idx: number) {
    if (idx === activeDeployIdx || isRolling) return;
    // Save current counters to active deployment
    if (activeDeployIdx !== null) {
      setDeployments(prev => prev.map((d, i) => i === activeDeployIdx ? { ...d, kills, deaths, roundsWon, roundsLost } : d));
    }
    // Load the target deployment
    const deploy = deployments[idx];
    setResult(deploy.operator);
    setObjectives(deploy.objectives);
    setKills(deploy.kills);
    setDeaths(deploy.deaths);
    setRoundsWon(deploy.roundsWon);
    setRoundsLost(deploy.roundsLost);
    setActiveDeployIdx(idx);
    setRevealed(true);
  }

  function generateObjectives() {
    return {
      kills: Math.floor(Math.random() * 11) + 10,   // 10–20
      rounds: Math.floor(Math.random() * 11) + 5,   // 5–15
    };
  }

  // 3D tilt on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 12, y: y * -12 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const roll = useCallback(() => {
    if (isRolling || pool.length === 0) return;
    // Save current counters into the active deployment
    if (activeDeployIdx !== null) {
      setDeployments(prev => prev.map((d, i) => i === activeDeployIdx ? { ...d, kills, deaths, roundsWon, roundsLost } : d));
    }
    // Flush current counters into the current operator's stats
    if (result) {
      setOperatorStats(prev => {
        const existing = prev[result.id] ?? { kills: 0, deaths: 0, roundsWon: 0, roundsLost: 0 };
        return {
          ...prev,
          [result.id]: {
            kills: existing.kills + kills,
            deaths: existing.deaths + deaths,
            roundsWon: existing.roundsWon + roundsWon,
            roundsLost: existing.roundsLost + roundsLost,
          },
        };
      });
    }

    setIsRolling(true);
    setResult(null);
    setRevealed(false);
    setKills(0);
    setDeaths(0);
    setRoundsWon(0);
    setRoundsLost(0);

    const totalTicks = 10;
    const delays = [50, 50, 50, 50, 60, 70, 90, 120, 160, 220];
    let tick = 0;

    function cycle() {
      const rand = pool[Math.floor(Math.random() * pool.length)];
      setCycleOp(rand);
      tick++;

      if (tick >= totalTicks) {
        // ponytail: hold the final name for a beat before revealing — avoids jarring blank frame
        intervalRef.current = setTimeout(() => {
          setIsRolling(false);
          setCycleOp(null);
          setResult(rand);
          const newObjectives = generateObjectives();
          setObjectives(newObjectives);
          setHistory(prev => [rand, ...prev.slice(0, 9)]);
          // Add new deployment
          setDeployments(prev => {
            const newDeploy = { operator: rand, objectives: newObjectives, kills: 0, deaths: 0, roundsWon: 0, roundsLost: 0 };
            return [...prev, newDeploy];
          });
          setActiveDeployIdx(prev => prev === null ? 0 : (deployments.length));
          // Small delay so the DOM renders with scale-95/opacity-0 first, then animates in
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setRevealed(true));
          });
        }, 300);
        return;
      }

      intervalRef.current = setTimeout(cycle, delays[tick] ?? 100);
    }

    intervalRef.current = setTimeout(cycle, delays[0]);
  }, [isRolling, pool, kills, deaths, roundsWon, roundsLost, result, activeDeployIdx, deployments.length]);

  // Keyboard shortcut: Space to roll
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        roll();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [roll]);

  // Hydrate active deployment on mount
  useEffect(() => {
    if (activeDeployIdx !== null && deployments[activeDeployIdx] && !result) {
      const deploy = deployments[activeDeployIdx];
      setResult(deploy.operator);
      setObjectives(deploy.objectives);
      setKills(deploy.kills);
      setDeaths(deploy.deaths);
      setRoundsWon(deploy.roundsWon);
      setRoundsLost(deploy.roundsLost);
      setRevealed(true);
    }
  // ponytail: only run once after hydration, deps intentionally sparse
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeployIdx, deployments]);

  // #5: Sync counters to active deployment on every change (prevents data loss on tab close)
  useEffect(() => {
    if (activeDeployIdx !== null && !isRolling) {
      setDeployments(prev => prev.map((d, i) => i === activeDeployIdx ? { ...d, kills, deaths, roundsWon, roundsLost } : d));
    }
  // ponytail: only sync when counters change, not on deployment switch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kills, deaths, roundsWon, roundsLost]);

  // #1: Reset session
  function resetSession() {
    setDeployments([]);
    setActiveDeployIdx(null);
    setOperatorStats({});
    setResult(null);
    setObjectives(null);
    setKills(0);
    setDeaths(0);
    setRoundsWon(0);
    setRoundsLost(0);
    setHistory([]);
    setRevealed(false);
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, []);

  const isAttacker = (result ?? cycleOp)?.role === 'ATTACKER';

  // #4: Mobile panel toggle
  const [mobilePanel, setMobilePanel] = useState<'objectives' | 'stats'>('objectives');

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-800 bg-black/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Dices className="w-5 h-5 text-yellow-500" />
          <h1 className="text-lg font-black uppercase tracking-tight">Random Operator</h1>
          {deployments.length > 0 && (
            <button
              onClick={resetSession}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              aria-label="Reset session"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6 max-w-5xl mx-auto w-full">

        {/* Side filter */}
        <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-lg border border-zinc-700">
          <button
            onClick={() => setSide('all')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
              side === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSide('ATTACKER')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 transition-colors ${
              side === 'ATTACKER' ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Swords className="w-3.5 h-3.5" /> Attack
          </button>
          <button
            onClick={() => setSide('DEFENDER')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 transition-colors ${
              side === 'DEFENDER' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ShieldHalf className="w-3.5 h-3.5" /> Defense
          </button>
        </div>

        {/* Two-column: Objectives + Card */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 w-full justify-center">

          {/* #4: Mobile panel tabs — only visible on small screens */}
          <div className="flex lg:hidden gap-1 p-0.5 bg-zinc-900 rounded-lg border border-zinc-700 w-full max-w-sm">
            <button
              onClick={() => setMobilePanel('objectives')}
              className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${
                mobilePanel === 'objectives' ? 'bg-zinc-700 text-white' : 'text-zinc-500'
              }`}
            >
              Objectives
            </button>
            <button
              onClick={() => setMobilePanel('stats')}
              className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${
                mobilePanel === 'stats' ? 'bg-zinc-700 text-white' : 'text-zinc-500'
              }`}
            >
              Stats
            </button>
          </div>

          {/* Objectives panel — left side */}
          <div className={`w-full max-w-xs flex flex-col gap-3 ${mobilePanel !== 'objectives' ? 'hidden lg:flex' : ''}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Objectives</p>

            {/* Kills objective */}
            <div className={`relative rounded-xl border p-4 transition-all duration-500 ${
              objectives ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-zinc-800 bg-zinc-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  objectives ? 'bg-yellow-500/20' : 'bg-zinc-800'
                }`}>
                  <Crosshair className={`w-5 h-5 ${objectives ? 'text-yellow-400' : 'text-zinc-600'}`} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Kill Target</p>
                  {objectives ? (
                    <p className="text-2xl font-black text-yellow-400">{objectives.kills}<span className="text-sm text-zinc-400 ml-1">kills</span></p>
                  ) : (
                    <p className="text-sm text-zinc-600 font-mono">— —</p>
                  )}
                </div>
              </div>

              {/* Kill/Death counters */}
              {objectives && (
                <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-2">
                  <Counter label="Kills" value={kills} target={objectives.kills} color="text-yellow-400" onIncrement={() => setKills(k => k + 1)} onDecrement={() => setKills(k => Math.max(0, k - 1))} />
                  <Counter label="Deaths" value={deaths} color="text-red-400" onIncrement={() => setDeaths(d => d + 1)} onDecrement={() => setDeaths(d => Math.max(0, d - 1))} />
                </div>
              )}
            </div>

            {/* Rounds objective */}
            <div className={`relative rounded-xl border p-4 transition-all duration-500 ${
              objectives ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  objectives ? 'bg-emerald-500/20' : 'bg-zinc-800'
                }`}>
                  <Trophy className={`w-5 h-5 ${objectives ? 'text-emerald-400' : 'text-zinc-600'}`} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rounds Won</p>
                  {objectives ? (
                    <p className="text-2xl font-black text-emerald-400">{objectives.rounds}<span className="text-sm text-zinc-400 ml-1">rounds</span></p>
                  ) : (
                    <p className="text-sm text-zinc-600 font-mono">— —</p>
                  )}
                </div>
              </div>

              {/* Rounds Won/Lost counters */}
              {objectives && (
                <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-2">
                  <Counter label="Won" value={roundsWon} target={objectives.rounds} color="text-emerald-400" onIncrement={() => setRoundsWon(r => r + 1)} onDecrement={() => setRoundsWon(r => Math.max(0, r - 1))} />
                  <Counter label="Lost" value={roundsLost} color="text-red-400" onIncrement={() => setRoundsLost(r => r + 1)} onDecrement={() => setRoundsLost(r => Math.max(0, r - 1))} />
                </div>
              )}
            </div>

            {!objectives && (
              <p className="text-[10px] text-zinc-600 text-center">Roll to generate objectives</p>
            )}
          </div>

          {/* Card column */}
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">

        {/* Result card with glow */}
        <div
          className="relative w-full max-w-sm group/card"
          style={{ perspective: '800px' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          ref={cardRef}
        >
          {/* Role-colored glow behind card — follows tilt */}
          {!isRolling && result && (
            <div
              className={`absolute -inset-4 rounded-3xl blur-2xl transition-opacity duration-500 ${
                revealed ? 'opacity-100' : 'opacity-0'
              } ${isAttacker ? 'bg-orange-500/15' : 'bg-blue-500/15'}`}
              style={{ transform: `translate(${tilt.x * -0.5}px, ${tilt.y * 0.5}px)` }}
            />
          )}

          <div
            className={`relative aspect-3/4 rounded-2xl border overflow-hidden transition-[transform,border-color] duration-300 ease-out ${
              !isRolling && result
                ? `${revealed ? 'scale-100' : 'scale-[0.97]'} ${isAttacker ? 'border-orange-500/40' : 'border-blue-500/40'}`
                : isRolling
                  ? 'border-yellow-500/50 animate-pulse scale-100'
                  : 'border-zinc-800 scale-100'
            }`}
            style={{
              transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) ${!isRolling && result ? (revealed ? 'scale(1)' : 'scale(0.97)') : 'scale(1)'}`,
              transformStyle: 'preserve-3d',
              transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.4s ease-out, border-color 0.3s' : 'border-color 0.3s',
            }}
          >
            {/* Background — dark base */}
            <div className="absolute inset-0 bg-zinc-900" />
            {/* Dimmed background portrait (stays inside the card) */}
            {!isRolling && result?.portrait_url && (
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent z-[1]" />
            )}

            {/* Rolling state */}
            {isRolling && cycleOp && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                {/* Radial pulse rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`absolute w-32 h-32 rounded-full animate-ping opacity-10 ${
                    cycleOp.role === 'ATTACKER' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <div className={`absolute w-48 h-48 rounded-full animate-pulse opacity-5 ${
                    cycleOp.role === 'ATTACKER' ? 'bg-orange-400' : 'bg-blue-400'
                  }`} />
                </div>

                {/* Icon with role-colored glow */}
                <div className="relative">
                  <div className={`absolute -inset-3 rounded-full blur-xl animate-pulse ${
                    cycleOp.role === 'ATTACKER' ? 'bg-orange-500/30' : 'bg-blue-500/30'
                  }`} />
                  {cycleOp.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cycleOp.icon_url} alt="" className="relative w-20 h-20 object-contain animate-roll-name" />
                  ) : (
                    <div className={`relative w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-black ${
                      cycleOp.role === 'ATTACKER' ? 'text-orange-400' : 'text-blue-400'
                    }`}>
                      {cycleOp.codename[0]}
                    </div>
                  )}
                </div>

                {/* Name */}
                <p className="text-3xl font-black uppercase tracking-tight mt-4 animate-roll-name drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                  {cycleOp.codename}
                </p>
                <p className={`text-xs font-bold uppercase tracking-widest mt-1.5 ${
                  cycleOp.role === 'ATTACKER' ? 'text-orange-400' : 'text-blue-400'
                }`}>
                  {cycleOp.role}
                </p>

                {/* Scan lines */}
                <div className="absolute inset-x-0 h-px bg-linear-to-r from-transparent via-yellow-500/60 to-transparent animate-scan-line" />
                <div className="absolute inset-x-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent animate-scan-line" style={{ animationDelay: '300ms' }} />

                {/* Corner accents */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-yellow-500/40" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-yellow-500/40" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-yellow-500/40" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-yellow-500/40" />
              </div>
            )}

            {/* Final result */}
            {!isRolling && result && (
              <div className="absolute inset-0 z-10 flex flex-col justify-end p-6">
                <div className="flex items-center gap-3 mb-2">
                  {result.icon_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.icon_url} alt="" className="w-14 h-14 object-contain rounded-lg border border-zinc-700 bg-black/60 p-1" />
                  )}
                  <div>
                    <p className="text-3xl font-black uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {result.codename}
                    </p>
                    <p className="text-sm text-zinc-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {result.name} &middot; {result.country}
                    </p>
                  </div>
                </div>

                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                  isAttacker ? 'text-orange-400' : 'text-blue-400'
                }`}>
                  {result.role} &middot; {result.ability_name}
                </p>

                <div className="flex items-center gap-5">
                  <StatDots value={result.health} color="bg-red-400" icon={<Heart className="w-3.5 h-3.5 text-red-400" />} />
                  <StatDots value={result.speed} color="bg-yellow-400" icon={<Zap className="w-3.5 h-3.5 text-yellow-400" />} />
                  <StatDots value={result.difficulty} color="bg-purple-400" icon={<Brain className="w-3.5 h-3.5 text-purple-400" />} />
                </div>
              </div>
            )}

            {/* Empty state */}
            {!isRolling && !result && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                <Dices className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-mono uppercase tracking-wider">Press roll to deploy</p>
              </div>
            )}

            {/* Specular highlight — follows mouse for 3D sheen */}
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl z-20"
              style={{
                background: (tilt.x !== 0 || tilt.y !== 0)
                  ? `radial-gradient(circle at ${(tilt.x / 12 + 0.5) * 100}% ${(tilt.y / -12 + 0.5) * 100}%, rgba(255,255,255,0.04) 0%, transparent 40%)`
                  : 'none',
              }}
            />
          </div>

          {/* Pop-out portrait — shows upper body, fades at bottom, pops forward on hover */}
          {!isRolling && result?.portrait_url && (
            <div
              className="absolute inset-x-0 top-0 bottom-[25%] pointer-events-none"
              style={{
                transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
                transformStyle: 'preserve-3d',
                transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.4s ease-out' : 'none',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.portrait_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-top transition-[transform,opacity] duration-500 ease-out"
                style={{
                  opacity: 0,
                  transform: `translateZ(${(tilt.x !== 0 || tilt.y !== 0) ? '50px' : '0px'})`,
                  filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.9))',
                  maskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
                }}
                onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = '1'; }}
              />
            </div>
          )}
        </div>

        {/* Roll button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={roll}
            disabled={isRolling || pool.length === 0}
            className="flex items-center gap-2 px-8 py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase tracking-wider rounded-xl transition-colors active:scale-95"
          >
            {result ? <RotateCcw className="w-5 h-5" /> : <Dices className="w-5 h-5" />}
            {isRolling ? 'Rolling...' : result ? 'Reroll' : 'Roll'}
          </button>
          <kbd className="text-[10px] text-zinc-600 font-mono">Space to roll</kbd>
        </div>

        {/* Deployed operators selector */}
        {deployments.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Deployed</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {deployments.map((deploy, i) => {
                const isActive = i === activeDeployIdx;
                const isAtt = deploy.operator.role === 'ATTACKER';
                // #2: Check if both objectives are complete
                const killsDone = deploy.kills >= deploy.objectives.kills;
                const roundsDone = deploy.roundsWon >= deploy.objectives.rounds;
                const isComplete = killsDone && roundsDone;
                // #3: Count duplicates — show #N if operator appears more than once
                const sameOpBefore = deployments.slice(0, i).filter(d => d.operator.id === deploy.operator.id).length;
                const sameOpTotal = deployments.filter(d => d.operator.id === deploy.operator.id).length;
                const label = sameOpTotal > 1 ? `${deploy.operator.codename} #${sameOpBefore + 1}` : deploy.operator.codename;
                return (
                  <button
                    key={`${deploy.operator.id}-${i}`}
                    onClick={() => switchDeployment(i)}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all ${
                      isActive
                        ? isAtt
                          ? 'border-orange-500/60 bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/30'
                          : 'border-blue-500/60 bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30'
                        : isAtt
                          ? 'border-orange-500/20 bg-orange-500/5 text-orange-300/60 hover:text-orange-300 hover:bg-orange-500/10'
                          : 'border-blue-500/20 bg-blue-500/5 text-blue-300/60 hover:text-blue-300 hover:bg-blue-500/10'
                    }`}
                  >
                    {isComplete && <Check className="w-3 h-3 text-emerald-400" />}
                    {!isComplete && deploy.operator.icon_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={deploy.operator.icon_url} alt="" className="w-4 h-4 object-contain" />
                    )}
                    <span className="font-bold uppercase">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

          </div>
          {/* Stats panel — right side */}
          <div className={`w-full max-w-xs flex flex-col gap-3 ${mobilePanel !== 'stats' ? 'hidden lg:flex' : ''}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {result ? `${result.codename} Stats` : 'Operator Stats'}
            </p>

            {/* K/D Ratio */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">K/D Ratio</p>
              {(() => {
                const kd = totalKills === 0 && totalDeaths === 0 ? null : totalKills / Math.max(totalDeaths, 1);
                return (
                  <>
                    <p className={`text-3xl font-black tabular-nums ${
                      kd === null ? 'text-zinc-600' : kd >= 1 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {kd === null ? '—' : kd.toFixed(2)}
                    </p>
                    <div className="flex gap-3 mt-2 text-[10px] text-zinc-500">
                      <span><span className="text-yellow-400 font-bold">{totalKills}</span> kills</span>
                      <span><span className="text-red-400 font-bold">{totalDeaths}</span> deaths</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Kill progress — current objective only */}
            {objectives && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Kill Progress</p>
                  <p className={`text-xs font-bold ${kills >= objectives.kills ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {kills >= objectives.kills ? '✓ Complete' : `${Math.min(Math.round((kills / objectives.kills) * 100), 100)}%`}
                  </p>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${kills >= objectives.kills ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min((kills / objectives.kills) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Rounds W/L */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Rounds</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400 tabular-nums">{totalRoundsWon}</span>
                <span className="text-zinc-600 text-sm">W</span>
                <span className="text-zinc-700 text-lg">/</span>
                <span className="text-2xl font-black text-red-400 tabular-nums">{totalRoundsLost}</span>
                <span className="text-zinc-600 text-sm">L</span>
              </div>
              {(totalRoundsWon > 0 || totalRoundsLost > 0) && (
                <div className="mt-2 h-2 rounded-full bg-zinc-800 overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(totalRoundsWon / (totalRoundsWon + totalRoundsLost)) * 100}%` }} />
                  <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(totalRoundsLost / (totalRoundsWon + totalRoundsLost)) * 100}%` }} />
                </div>
              )}
            </div>

            {/* Rounds progress — current objective only */}
            {objectives && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rounds Progress</p>
                  <p className={`text-xs font-bold ${roundsWon >= objectives.rounds ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {roundsWon >= objectives.rounds ? '✓ Complete' : `${Math.min(Math.round((roundsWon / objectives.rounds) * 100), 100)}%`}
                  </p>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${roundsWon >= objectives.rounds ? 'bg-emerald-500' : 'bg-emerald-500/70'}`}
                    style={{ width: `${Math.min((roundsWon / objectives.rounds) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatDots({ value, color, icon, max = 3 }: { value: number; color: string; icon: React.ReactNode; max?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < value ? color : 'bg-zinc-700'}`} />
        ))}
      </div>
    </div>
  );
}

function Counter({ label, value, target, color, onIncrement, onDecrement }: {
  label: string;
  value: number;
  target?: number;
  color: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const hit = target !== undefined && value >= target;
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onDecrement}
          className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-90"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className={`text-lg font-black tabular-nums min-w-[2ch] text-center ${hit ? 'text-emerald-400' : color}`}>
          {value}
        </span>
        <button
          onClick={onIncrement}
          className="w-6 h-6 rounded-md bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-90"
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      {target !== undefined && (
        <p className={`text-[9px] font-mono ${hit ? 'text-emerald-400' : 'text-zinc-600'}`}>
          {value}/{target}
        </p>
      )}
    </div>
  );
}
