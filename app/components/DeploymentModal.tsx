import { useRef, useEffect } from 'react';
import { Check, X, Swords, ShieldHalf } from 'lucide-react';
import { Button } from './ui/Button';
import { OperatorDisplay } from './OperatorDisplay';
import { Operator, Loadout, Platform } from '../data/types';

interface DeploymentModalProps {
    isOpen: boolean;
    operator: Operator | null;
    loadout: Loadout | null;
    matchType?: string | null;
    platform?: Platform | null;
    targetKills?: number;
    role?: string;
    onAccept: () => void;
    onReject: () => void;
}

export function DeploymentModal({ isOpen, operator, loadout, matchType, platform, targetKills, role, onAccept, onReject }: DeploymentModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onReject();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onReject]);

    if (!isOpen || !operator) return null;

    const isAttacker = operator.side === 'attacker';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="relative bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300 slide-in-from-bottom-4"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-wider">
                        Confirm Deployment
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onReject} icon={X}>
                        <span className="sr-only">Close</span>
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col items-center">
                    {/* Info badges */}
                    <div className="flex flex-wrap gap-2 mb-4 justify-center">
                        {/* Side */}
                        <Badge
                            color={isAttacker ? 'orange' : 'blue'}
                            icon={isAttacker ? <Swords className="w-3 h-3" /> : <ShieldHalf className="w-3 h-3" />}
                            label={isAttacker ? 'Attacker' : 'Defender'}
                        />
                        {/* Match Type */}
                        {matchType && (
                            <Badge color="yellow" label={matchType} />
                        )}
                        {/* Platform */}
                        {platform && (
                            <Badge color="purple" label={platform} />
                        )}
                        {/* Target Kills */}
                        {targetKills && targetKills > 0 && (
                            <Badge color="green" label={`Target: ${targetKills} Kills`} />
                        )}
                        {/* Role */}
                        {role && (
                            <Badge color="cyan" label={role} />
                        )}
                    </div>

                    {/* Operator card */}
                    <div className="w-full mb-4">
                        <OperatorDisplay
                            operator={operator}
                            loadout={loadout}
                            isRolling={false}
                            targetKills={targetKills}
                            operatorKills={0}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 w-full">
                        <Button
                            onClick={onReject}
                            variant="outline"
                            className="flex-1"
                            icon={X}
                        >
                            Reject
                        </Button>
                        <Button
                            onClick={onAccept}
                            variant="primary"
                            className="flex-1"
                            icon={Check}
                        >
                            Deploy Operator
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const BADGE_COLORS = {
    orange: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
    blue: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
    yellow: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400',
    purple: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
    green: 'bg-green-500/15 border-green-500/40 text-green-400',
    cyan: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400',
} as const;

function Badge({ color, label, icon }: { color: keyof typeof BADGE_COLORS; label: string; icon?: React.ReactNode }) {
    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${BADGE_COLORS[color]}`}>
            {icon}
            {label}
        </div>
    );
}
