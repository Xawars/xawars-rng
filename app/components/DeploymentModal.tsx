import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { Button } from './ui/Button';
import { OperatorDisplay } from './OperatorDisplay';
import { Operator, Loadout } from '../data/types';

import { getRoleColor } from '../data/roles';

interface DeploymentModalProps {
    isOpen: boolean;
    operator: Operator | null;
    loadout: Loadout | null;
    matchType?: string | null;
    targetKills?: number;
    role?: string;
    onAccept: () => void;
    onReject: () => void;
}

export function DeploymentModal({ isOpen, operator, loadout, matchType, targetKills, role, onAccept, onReject }: DeploymentModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
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

    // Use portal to render at the root level, avoiding z-index issues
    // Assuming there is a <div id="modal-root"></div> or we just append to body if we don't use portal strictly needed
    // helpful for overlays. For simplicity in this project structure, we can just render it if we place it high up,
    // but let's just use fixed positioning.

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
                <div className="p-6 flex flex-col items-center">
                    <div className="flex gap-2 mb-4">
                        {targetKills && (
                            <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-full">
                                <span className="text-yellow-400 font-bold uppercase tracking-wider text-sm">
                                    Target: {targetKills} Kills
                                </span>
                            </div>
                        )}
                        {role && (
                            <div className={`px-4 py-2 ${getRoleColor(role as any)}/20 border ${getRoleColor(role as any)}/50 rounded-full`}>
                                <span className={`${getRoleColor(role as any).replace('bg-', 'text-')} font-bold uppercase tracking-wider text-sm`}>
                                    {role}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="w-full mb-8">
                        <OperatorDisplay operator={operator} loadout={loadout} matchType={matchType} isRolling={false} targetKills={targetKills} operatorKills={0} role={role} />
                    </div>

                    <div className="flex gap-4 w-full">
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
                            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
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
