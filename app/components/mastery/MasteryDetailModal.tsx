'use client';

import { useEffect } from 'react';
import { X, Crosshair, Skull, Target, Clock, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { OperatorIcon } from '../OperatorIcon';
import type { Operator } from '../../data/types';
import type { MasteryTier } from './MasteryRow';

export interface MasteryOperatorData {
  operator: Operator;
  tier: MasteryTier;
  kills: number;
  deaths: number;
  kd: number | null;
  deployments: number;
  objectivesCompleted: number;
  lastPlayed: string | null;
  xp: number;
  xpToNextTier: number;
}

interface MasteryDetailModalProps {
  data: MasteryOperatorData | null;
  onClose: () => void;
}

const tierLabels: Record<MasteryTier, string> = {
  unplayed: 'Unplayed',
  recruit: 'Recruit',
  operative: 'Operative',
  veteran: 'Veteran',
  elite: 'Elite',
};

const tierColors: Record<MasteryTier, string> = {
  unplayed: 'text-zinc-500',
  recruit: 'text-zinc-300',
  operative: 'text-amber-500',
  veteran: 'text-slate-200',
  elite: 'text-yellow-500',
};

const tierBorderColors: Record<MasteryTier, string> = {
  unplayed: 'border-zinc-700',
  recruit: 'border-zinc-500',
  operative: 'border-amber-700',
  veteran: 'border-slate-300',
  elite: 'border-yellow-500',
};

const tierProgressColors: Record<MasteryTier, string> = {
  unplayed: 'from-zinc-600 to-zinc-500',
  recruit: 'from-zinc-500 to-zinc-300',
  operative: 'from-amber-700 to-amber-500',
  veteran: 'from-slate-400 to-slate-200',
  elite: 'from-yellow-600 to-yellow-400',
};

export function MasteryDetailModal({ data, onClose }: MasteryDetailModalProps) {
  useEffect(() => {
    if (!data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, onClose]);

  if (!data) return null;

  const { operator, tier, kills, deaths, kd, deployments, objectivesCompleted, lastPlayed, xp, xpToNextTier } = data;
  const progressPercent = xpToNextTier > 0 ? Math.min((xp / xpToNextTier) * 100, 100) : tier === 'elite' ? 100 : 0;
  const kdColor = kd !== null && kd >= 1 ? 'text-green-400' : 'text-red-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="relative p-5 border-b border-white/5 overflow-hidden">
          <div className={`absolute inset-0 opacity-10 ${
            operator.side === 'attacker'
              ? 'bg-linear-to-br from-orange-500 to-transparent'
              : 'bg-linear-to-br from-blue-500 to-transparent'
          }`} />

          <div className="relative flex items-center gap-4">
            <div className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center ${tierBorderColors[tier]} ${
              operator.side === 'attacker' ? 'bg-orange-900/20' : 'bg-blue-900/20'
            }`}>
              <OperatorIcon id={operator.id} className="w-10 h-10">
                <span className="text-xl font-black text-zinc-500">{operator.name[0]}</span>
              </OperatorIcon>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white uppercase tracking-wide truncate">
                {operator.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  operator.side === 'attacker' ? 'text-orange-500' : 'text-blue-500'
                }`}>
                  {operator.side}
                </span>
                <span className="text-zinc-600">&middot;</span>
                <span className={`text-xs font-bold uppercase tracking-wider ${tierColors[tier]}`}>
                  {tierLabels[tier]}
                </span>
              </div>
              {operator.roles.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {operator.roles.map(role => (
                    <span key={role} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={onClose} icon={X}>
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-5 py-3 border-b border-white/5 bg-zinc-900/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Mastery Progress
            </span>
            <span className="text-[10px] font-bold text-zinc-500">
              {tier === 'elite' ? 'MAX' : `${xp} / ${xpToNextTier} XP`}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-linear-to-r ${tierProgressColors[tier]} transition-all duration-500`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {tier !== 'elite' && tier !== 'unplayed' && (
            <p className="text-[9px] text-zinc-600 mt-1">
              Next: <span className={tierColors[tier === 'recruit' ? 'operative' : tier === 'operative' ? 'veteran' : 'elite']}>
                {tier === 'recruit' ? 'Operative' : tier === 'operative' ? 'Veteran' : 'Elite'}
              </span>
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="p-5 grid grid-cols-2 gap-3">
          <StatCard icon={Crosshair} label="Kills" value={kills.toString()} color="text-green-400" />
          <StatCard icon={Skull} label="Deaths" value={deaths.toString()} color="text-red-400" />
          <StatCard icon={TrendingUp} label="K/D Ratio" value={kd !== null ? kd.toFixed(2) : '\u2014'} color={kd !== null ? kdColor : 'text-zinc-500'} />
          <StatCard icon={Target} label="Objectives" value={objectivesCompleted.toString()} color="text-yellow-400" />
          <StatCard icon={Clock} label="Deployments" value={deployments.toString()} color="text-purple-400" />
          <StatCard
            icon={Clock}
            label="Last Played"
            value={lastPlayed ? formatDate(lastPlayed) : 'Never'}
            color="text-zinc-300"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/5 bg-zinc-900/50">
          <p className="text-[9px] text-zinc-600 text-center">
            Deploy this operator more to increase mastery
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
      <Icon className={`w-4 h-4 ${color} shrink-0`} />
      <div className="min-w-0">
        <p className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-black ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
