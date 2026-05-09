'use client';

import { useRef, useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from './ui/Button';
import { OperatorDisplay } from './OperatorDisplay';
import { HistoryItem } from './HistoryList';
import { toPng } from 'html-to-image';

interface OperatorCardModalProps {
  item: HistoryItem | null;
  operatorKills: Record<string, number>;
  operatorDeaths: Record<string, number>;
  onClose: () => void;
}

export function OperatorCardModal({ item, operatorKills, operatorDeaths, onClose }: OperatorCardModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!modalRef.current || !item) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(modalRef.current, {
        cacheBust: true,
        backgroundColor: '#09090b',
      });
      const link = document.createElement('a');
      link.download = `xawars-${item.operator.id}-card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

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

  const kills = operatorKills[item.operator.id] || 0;
  const deaths = operatorDeaths[item.operator.id] || 0;
  const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : null;
  const kdColor = kd !== null && kd >= 1 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        id="operator-card-export"
        className="relative bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-wider">
              {item.operator.name}
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-400 font-bold">{kills} K</span>
              <span className="text-zinc-500">/</span>
              <span className="text-red-400 font-bold">{deaths} D</span>
              {kd !== null && (
                <>
                  <span className="text-zinc-500">·</span>
                  <span className={`font-black ${kdColor}`}>{kd.toFixed(2)} KD</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              title="Export as image"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} icon={X}>
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        <div className="p-6">
          <OperatorDisplay
            operator={item.operator}
            loadout={item.loadout}
            matchType={item.matchType}
            platform={item.platform}
            isRolling={false}
            targetKills={item.targetKills}
            operatorKills={kills}
            role={item.role}
          />
        </div>
      </div>
    </div>
  );
}