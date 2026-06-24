'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Swords, ShieldHalf, ArrowLeft, Heart, Zap, Brain, X } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import Link from 'next/link';
import type { OperatorGridItem } from './page';

// ponytail: shimmer wrapper — shows animate-shimmer bg until image fires onLoad
function ShimmerImg({ className, wrapClassName, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { wrapClassName?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden ${wrapClassName ?? ''}`}>
      {!loaded && <div className="absolute inset-0 bg-zinc-800 animate-shimmer rounded-[inherit]" />}
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img
        {...props}
        className={`${className ?? ''} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// ponytail: per-operator portrait position tweaks when default object-top doesn't frame well
// keyed by codename (uppercase)
const portraitOverrides: Record<string, React.CSSProperties> = {
  BLACKBEARD: { objectPosition: 'center 35%' },
};

// ponytail: operators that skip the fade-in opacity on hover
const noHoverOpacity = new Set(['BLACKBEARD']);

interface OperatorDetail extends OperatorGridItem {
  release_season: string;
  release_year: number;
  ability_description: string;
  strengths: string[];
  weaknesses: string[];
}

type SortKey = 'name' | 'health' | 'speed' | 'difficulty';

function StatDots({ value, max = 3, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i < value ? color : 'bg-zinc-700'}`}
        />
      ))}
    </div>
  );
}

function OperatorDetailModal({ operatorId, codename, onClose }: { operatorId: string; codename: string; onClose: () => void }) {
  const [op, setOp] = useState<OperatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ponytail: lazy-fetch full row only when modal opens
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data, error: err } = await supabase
          .from('operators')
          .select('*')
          .eq('id', operatorId)
          .single();
        if (err) throw err;
        if (!cancelled) setOp(data as OperatorDetail);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [operatorId]);

  const isAttacker = op?.role === 'ATTACKER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl flex items-center justify-center">
        <div className="relative w-full max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden sm:mr-32 lg:mr-40">
          {/* Header */}
          <div className={`shrink-0 p-5 border-b border-zinc-800 ${isAttacker ? 'bg-orange-500/5' : 'bg-blue-500/5'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-black shrink-0 ${
                  isAttacker ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {codename[0]}
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">{codename}</h2>
                  {loading && <p className="text-sm text-zinc-500">Loading...</p>}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">{error}</div>
            )}

            {op && (
              <>
                {/* Operator info below header once loaded */}
                <div className="flex items-center gap-3 -mt-2">
                  {op.icon_url && (
                    <img src={op.icon_url} alt="" className="w-12 h-12 rounded-lg object-contain border border-zinc-700 bg-black/40 p-1" />
                  )}
                  <div>
                    <p className="text-sm text-zinc-400">{op.name} &middot; {op.country}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={isAttacker ? 'attack' : 'defense'} size="sm">{op.role}</Badge>
                      <span className="text-[10px] text-zinc-500 uppercase">{op.organization}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-black/40 rounded-lg p-3 border border-zinc-800">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Heart className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Health</span>
                    </div>
                    <StatDots value={op.health} color="bg-red-400" />
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-zinc-800">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Speed</span>
                    </div>
                    <StatDots value={op.speed} color="bg-yellow-400" />
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-zinc-800">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Difficulty</span>
                    </div>
                    <StatDots value={op.difficulty} color="bg-purple-400" />
                  </div>
                </div>

                {/* Ability */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Ability</h3>
                  <Card variant="elevated" padding="sm">
                    <p className="text-sm font-semibold text-yellow-400 mb-1">{op.ability_name}</p>
                    <p className="text-sm text-zinc-300 leading-relaxed">{op.ability_description}</p>
                  </Card>
                </div>

                {/* Playstyles */}
                {op.playstyles.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Playstyles</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {op.playstyles.map(p => (
                        <Badge key={p} variant="default" size="sm">{p.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-green-400 mb-2">Strengths</h3>
                    <div className="space-y-1">
                      {op.strengths.map(s => (
                        <div key={s} className="text-xs text-zinc-300 bg-green-500/5 border border-green-500/10 rounded px-2 py-1">
                          {s.replace(/_/g, ' ')}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">Weaknesses</h3>
                    <div className="space-y-1">
                      {op.weaknesses.map(w => (
                        <div key={w} className="text-xs text-zinc-300 bg-red-500/5 border border-red-500/10 rounded px-2 py-1">
                          {w.replace(/_/g, ' ')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider pt-2 border-t border-zinc-800">
                  Released {op.release_season} ({op.release_year})
                </div>
              </>
            )}
          </div>
        </div>

        {/* Portrait */}
        {op?.portrait_url && (
          <div className="hidden sm:block absolute -right-4 lg:-right-8 bottom-0 top-0 w-72 lg:w-80 pointer-events-none" style={{ perspective: '1200px' }}>
            <img
              src={op.portrait_url}
              alt={op.name}
              className="absolute bottom-0 right-0 h-[110%] w-auto max-w-none object-contain object-bottom"
              style={{
                transform: 'translateZ(80px) translateX(20px)',
                transformStyle: 'preserve-3d',
                filter: 'drop-shadow(-20px 10px 40px rgba(0,0,0,0.8)) drop-shadow(0 0 60px rgba(0,0,0,0.5))',
              }}
            />
            <div className={`absolute -bottom-2 right-8 w-48 h-6 rounded-full blur-2xl ${
              isAttacker ? 'bg-orange-500/20' : 'bg-blue-500/20'
            }`} />
          </div>
        )}
      </div>
    </div>
  );
}

export function OperatorsClient({ operators }: { operators: OperatorGridItem[] }) {
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState<'ATTACKER' | 'DEFENDER' | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [selectedOp, setSelectedOp] = useState<{ id: string; codename: string } | null>(null);

  const filtered = useMemo(() => {
    let list = operators;

    if (sideFilter) {
      list = list.filter(op => op.role === sideFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(op =>
        op.name.toLowerCase().includes(q) ||
        op.codename.toLowerCase().includes(q) ||
        op.country.toLowerCase().includes(q) ||
        op.ability_name.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b[sortBy] as number) - (a[sortBy] as number);
    });

    return list;
  }, [operators, sideFilter, search, sortBy]);

  const attackerCount = operators.filter(op => op.role === 'ATTACKER').length;
  const defenderCount = operators.filter(op => op.role === 'DEFENDER').length;

  return (
    <div className="min-h-dvh bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-black uppercase tracking-tight">Operators</h1>
          <span className="text-xs text-zinc-500 ml-auto">{operators.length} total</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search name, country, ability..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20"
            />
          </div>

          <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-lg border border-zinc-700 shrink-0">
            <button
              onClick={() => setSideFilter(null)}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                !sideFilter ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSideFilter('ATTACKER')}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1 transition-all ${
                sideFilter === 'ATTACKER'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              <Swords className="w-3 h-3" /> ATK ({attackerCount})
            </button>
            <button
              onClick={() => setSideFilter('DEFENDER')}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1 transition-all ${
                sideFilter === 'DEFENDER'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              <ShieldHalf className="w-3 h-3" /> DEF ({defenderCount})
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs text-zinc-300 font-bold uppercase tracking-wider focus:outline-none focus:border-yellow-500/50 shrink-0"
            aria-label="Sort operators by"
          >
            <option value="name">Name</option>
            <option value="health">Health</option>
            <option value="speed">Speed</option>
            <option value="difficulty">Difficulty</option>
          </select>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Search className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm">No operators found</p>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((op) => {
              const isAttacker = op.role === 'ATTACKER';
              return (
                <button
                  key={op.codename}
                  onClick={() => setSelectedOp({ id: op.id, codename: op.codename })}
                  className={`group relative text-left rounded-xl border bg-zinc-900 will-change-transform transition-[transform,border-color] duration-200 hover:z-20 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-yellow-500/50 ${
                    isAttacker
                      ? 'border-orange-500/20 hover:border-orange-500/50'
                      : 'border-blue-500/20 hover:border-blue-500/50'
                  }`}
                >
                  {/* Top-edge role highlight */}
                  <div className={`absolute top-0 left-3 right-3 h-px rounded-full ${
                    isAttacker ? 'bg-orange-500/40' : 'bg-blue-500/40'
                  }`} />

                  <div className="flex">
                    <div className="relative z-10 flex-1 p-4 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        {op.icon_url ? (
                          <ShimmerImg
                            src={op.icon_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            width={40}
                            height={40}
                            wrapClassName="w-10 h-10 rounded-lg shrink-0"
                            className="w-10 h-10 rounded-lg object-contain border border-zinc-700 bg-black/40 p-0.5"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                            isAttacker ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {op.name[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase tracking-tight text-white truncate group-hover:text-yellow-400 transition-colors duration-150">
                            {op.codename}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">{op.country} &middot; {op.organization}</p>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-400 mb-3 line-clamp-1">{op.ability_name}</p>

                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-red-400" />
                          <StatDots value={op.health} color="bg-red-400" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-yellow-400" />
                          <StatDots value={op.speed} color="bg-yellow-400" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Brain className="w-3 h-3 text-purple-400" />
                          <StatDots value={op.difficulty} color="bg-purple-400" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-0.5">
                        {op.playstyles.slice(0, 3).map(p => (
                          <span key={p} className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isAttacker
                              ? 'bg-orange-500/10 text-orange-400/80 border border-orange-500/20'
                              : 'bg-blue-500/10 text-blue-400/80 border border-blue-500/20'
                          }`}>
                            {p.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Portrait */}
                  {/* ponytail: native <img> with lazy+async — avoids Next.js image proxy timeout on wiki CDN */}
                  {op.portrait_url ? (
                    <div
                      className="absolute top-0 bottom-0 right-0 w-36 pointer-events-none transition-opacity duration-200 opacity-40 group-hover:opacity-90"
                      style={noHoverOpacity.has(op.codename) ? undefined : {
                        maskImage: 'linear-gradient(to right, transparent 15%, black 55%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 15%, black 55%)',
                      }}
                    >
                      <ShimmerImg
                        src={op.portrait_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        wrapClassName="absolute inset-0"
                        className={`absolute inset-0 w-full h-full object-cover ${portraitOverrides[op.codename] ? '' : 'object-top'}`}
                        style={portraitOverrides[op.codename]}
                      />
                    </div>
                  ) : (
                    <div className={`absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center rounded-r-xl ${
                      isAttacker ? 'bg-orange-500/5' : 'bg-blue-500/5'
                    }`}>
                      <span className={`text-3xl font-black ${
                        isAttacker ? 'text-orange-500/20' : 'text-blue-500/20'
                      }`}>{op.name[0]}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {selectedOp && (
        <OperatorDetailModal
          operatorId={selectedOp.id}
          codename={selectedOp.codename}
          onClose={() => setSelectedOp(null)}
        />
      )}
    </div>
  );
}
