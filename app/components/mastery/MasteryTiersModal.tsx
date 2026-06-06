'use client';

import { useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { Button } from '../ui/Button';

interface MasteryTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tiers = [
  {
    name: 'Recruit',
    tag: 'RCT',
    color: 'text-zinc-300',
    dotColor: 'bg-zinc-400',
    borderColor: 'border-zinc-500',
    bgColor: 'bg-zinc-800/50',
    requirement: '1–2 deployments',
    description: 'You\'ve tried this operator. Keep deploying to rank up.',
  },
  {
    name: 'Operative',
    tag: 'OPR',
    color: 'text-amber-500',
    dotColor: 'bg-amber-600',
    borderColor: 'border-amber-700',
    bgColor: 'bg-amber-950/30',
    requirement: '3+ deployments',
    description: 'You\'re getting comfortable. Building experience and muscle memory.',
  },
  {
    name: 'Veteran',
    tag: 'VET',
    color: 'text-slate-200',
    dotColor: 'bg-slate-300',
    borderColor: 'border-slate-400',
    bgColor: 'bg-slate-900/30',
    requirement: '10+ deployments',
    description: 'A seasoned operator. You know the loadouts, the angles, the plays.',
  },
  {
    name: 'Elite',
    tag: 'ELT',
    color: 'text-yellow-500',
    dotColor: 'bg-yellow-500',
    borderColor: 'border-yellow-600',
    bgColor: 'bg-yellow-950/30',
    requirement: '25+ deployments with K/D ≥ 1.0',
    description: 'Peak mastery. You dominate with this operator consistently.',
  },
];

export function MasteryTiersModal({ isOpen, onClose }: MasteryTiersModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="shrink-0 p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wide">Mastery Tiers</h2>
              <p className="text-[11px] text-zinc-500">How operator progression works</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} icon={X}>
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Intro */}
        <div className="shrink-0 px-5 py-4 border-b border-white/5 bg-zinc-900/50">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Every operator starts as <span className="text-zinc-200 font-medium">Unplayed</span>. 
            As you deploy them and rack up kills, they progress through mastery tiers. 
            Higher tiers require both dedication and performance.
          </p>
        </div>

        {/* Tier List */}
        <div className="flex-1 overflow-y-auto scrollbar-auto-hide p-5 space-y-3">
          {tiers.map((tier) => (
            <div
              key={tier.tag}
              className={`flex items-start gap-3 p-3 rounded-lg border ${tier.borderColor}/30 ${tier.bgColor}`}
            >
              {/* Dot */}
              <div className={`w-4 h-4 rounded-full ${tier.dotColor} shrink-0 mt-0.5`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-black uppercase tracking-wide ${tier.color}`}>
                    {tier.name}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tier.borderColor}/50 ${tier.color}/70`}>
                    {tier.tag}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-medium mb-1">
                  {tier.requirement}
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {tier.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-white/5 bg-zinc-900/50">
          <p className="text-[10px] text-zinc-600 text-center">
            Tier progress is tracked per operator across all your deployments
          </p>
        </div>
      </div>
    </div>
  );
}
