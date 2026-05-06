'use client';

import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { OperatorDisplay } from './OperatorDisplay';
import { HistoryItem } from './HistoryList';

interface OperatorCardModalProps {
  item: HistoryItem | null;
  onClose: () => void;
}

export function OperatorCardModal({ item, onClose }: OperatorCardModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="relative bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-wider">
            {item.operator.name}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} icon={X}>
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="p-6">
          <OperatorDisplay
            operator={item.operator}
            loadout={item.loadout}
            matchType={item.matchType}
            isRolling={false}
            targetKills={item.targetKills}
            operatorKills={0}
            role={item.role}
          />
        </div>
      </div>
    </div>
  );
}