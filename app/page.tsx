'use client';

import { useState, useEffect } from 'react';
import { Dices, RotateCcw } from 'lucide-react';
import { Button } from './components/ui/Button';
import { OperatorDisplay } from './components/OperatorDisplay';
import { StatCounter } from './components/StatCounter';
import { FinalScreen } from './components/FinalScreen';
import { HistoryList, HistoryItem } from './components/HistoryList';
import { getRandomOperator, generateLoadout } from './data/operators';
import { Operator, Loadout } from './data/types';

export default function Home() {
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [currentLoadout, setCurrentLoadout] = useState<Loadout | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [wallpaperError, setWallpaperError] = useState(false);

  const isComplete = kills >= 100;

  // Reset wallpaper error when operator changes
  useEffect(() => {
    setWallpaperError(false);
  }, [currentOperator?.id]);

  const handleRoll = () => {
    setIsRolling(true);
    // Simple timeout to simulate "rolling" feel
    setTimeout(() => {
      const op = getRandomOperator();
      const loadout = generateLoadout(op);
      
      setCurrentOperator(op);
      setCurrentLoadout(loadout);

      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        operator: op,
        loadout: loadout
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 5));
      
      setIsRolling(false);
    }, 400);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the run?")) {
      setKills(0);
      setDeaths(0);
      setCurrentOperator(null);
      setCurrentLoadout(null);
      setHistory([]);
    }
  };

  const handleFullReset = () => {
    setKills(0);
    setDeaths(0);
    setCurrentOperator(null);
    setCurrentLoadout(null);
    setHistory([]);
  }

  const wallpaperPath = currentOperator ? `/ops/${currentOperator.id}_wallpaper.jpg` : null;

  return (
    <main className="min-h-screen bg-black text-zinc-100 p-4 font-sans selection:bg-yellow-500/30 relative overflow-hidden">
      
      {/* Global Wallpaper Layer */}
      <div className="fixed inset-0 z-0">
        {currentOperator && wallpaperPath && !wallpaperError ? (
          <img 
            key={currentOperator.id} 
            src={wallpaperPath} 
            alt="Global Wallpaper"
            className="w-full h-full object-cover opacity-20 blur-sm scale-110 animate-ken-burns"
            onError={() => setWallpaperError(true)}
          />
        ) : (
          // Fallback Gradient
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black" />
        )}
      </div>

      {/* Final Screen Overlay */}
      {isComplete && (
        <FinalScreen 
          kills={kills} 
          deaths={deaths} 
          onReset={handleFullReset} 
        />
      )}

      <div className="relative z-10 max-w-md mx-auto flex flex-col gap-6 pb-20">
        
        {/* Header / Stats */}
        <header className="flex items-center justify-between py-4 border-b border-white/10">
          <h1 className="text-xl font-black uppercase italic tracking-tighter text-yellow-500">
            Xawars <span className="text-white">RNG</span>
          </h1>
          <Button variant="ghost" size="sm" onClick={handleReset} icon={RotateCcw}>
            Reset Run
          </Button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <StatCounter 
            label="Kills" 
            value={kills} 
            onIncrement={() => setKills(k => k + 1)} 
          />
          <StatCounter 
            label="Deaths" 
            value={deaths} 
            onIncrement={() => setDeaths(d => d + 1)} 
            variant="danger"
          />
        </div>

        {/* Operator Card area */}
        <OperatorDisplay 
          operator={currentOperator} 
          loadout={currentLoadout}
          isRolling={isRolling}
        />

        {/* Action Button */}
        <Button 
          onClick={handleRoll} 
          disabled={isRolling} 
          size="lg" 
          className="w-full text-lg py-6"
          icon={Dices}
        >
          {currentOperator ? 'Reroll Operator' : 'Deploy Operator'}
        </Button>

        {/* History List */}
        <HistoryList history={history} />

        {/* Footer info */}
        <div className="mt-8 text-center">
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Goal: 100 Kills</p>
            <div className="w-full bg-zinc-900 h-1.5 mt-2 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-yellow-500 transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(kills, 100)}%` }}
                />
            </div>
        </div>

      </div>
    </main>
  );
}
