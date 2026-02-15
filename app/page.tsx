'use client';

import { useState, useEffect } from 'react';
import { Dices, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useAudioFeedback } from './hooks/useAudioFeedback';
import { usePersistedState } from './hooks/usePersistedState';
import { useSoundContext } from './context/SoundContext';
import { Button } from './components/ui/Button';
import { OperatorDisplay } from './components/OperatorDisplay';
import { StatCounter } from './components/StatCounter';
import { FinalScreen } from './components/FinalScreen';
import { HistoryList, HistoryItem } from './components/HistoryList';
import { DeploymentModal } from './components/DeploymentModal';
import { CreatorTools } from './components/CreatorTools';
import { getRandomOperator, generateLoadout } from './data/operators';
import { Operator, Loadout } from './data/types';
import { toPng } from 'html-to-image';

export default function Home() {
  const [kills, setKills] = usePersistedState('xawars_kills', 0);
  const [deaths, setDeaths] = usePersistedState('xawars_deaths', 0);
  const [currentOperator, setCurrentOperator] = usePersistedState<Operator | null>('xawars_currentOperator', null);
  const [currentLoadout, setCurrentLoadout] = usePersistedState<Loadout | null>('xawars_currentLoadout', null);
  const [history, setHistory] = usePersistedState<HistoryItem[]>('xawars_history', []);

  // Transient state for the deployment flow
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null);
  const [pendingLoadout, setPendingLoadout] = useState<Loadout | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStreamerMode, setIsStreamerMode] = useState(false);

  const [isRolling, setIsRolling] = useState(false);
  const [wallpaperError, setWallpaperError] = useState(false);

  const { playRoll, stopRoll, playReveal, playKill, playDeath, playGoal } = useAudioFeedback();
  const { isMuted, toggleMute } = useSoundContext();

  const isComplete = kills >= 100;

  // Reset wallpaper error when operator changes
  useEffect(() => {
    setWallpaperError(false);
  }, [currentOperator?.id]);

  const handleRoll = () => {
    setIsRolling(true);
    playRoll();
    // Simple timeout to simulate "rolling" feel
    setTimeout(() => {
      const op = getRandomOperator();
      const loadout = generateLoadout(op);

      // Set pending state instead of current
      setPendingOperator(op);
      setPendingLoadout(loadout);

      setIsRolling(false);
      stopRoll();

      // Open modal
      setIsModalOpen(true);

      // NOTE: We delay the reveal sound until acceptance or maybe play a "ready" sound here?
      // For now, let's keep silence or a "tick" sound, and play the BIG reveal on accept.
    }, 600);
  };

  const handleAccept = () => {
    if (!pendingOperator || !pendingLoadout) return;

    setCurrentOperator(pendingOperator);
    setCurrentLoadout(pendingLoadout);

    // Add to history
    const newHistoryItem: HistoryItem = {
      id: Date.now(),
      operator: pendingOperator,
      loadout: pendingLoadout
    };
    setHistory(prev => [newHistoryItem, ...prev].slice(0, 5));

    // Play reveal sound
    playReveal(pendingOperator.side === 'defender');

    // Close modal and clear pending
    setIsModalOpen(false);
    setPendingOperator(null);
    setPendingLoadout(null);
  };

  const handleReject = () => {
    setIsModalOpen(false);
    setPendingOperator(null);
    setPendingLoadout(null);
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

  const handleCopySummary = async () => {
    const summary = `Xawars RNG Run
Final Score: ${kills} Kills / ${deaths} Deaths
MVPs: ${history.slice(0, 3).map(h => h.operator.name).join(', ')}`;

    try {
      await navigator.clipboard.writeText(summary);
      alert("Summary copied to clipboard!");
    } catch (err) {
      console.error('Failed to copy summary: ', err);
    }
  };

  const handleDownloadThumbnail = async () => {
    const element = document.getElementById('operator-card-container');
    if (!element) return;

    try {
      const dataUrl = await toPng(element, { cacheBust: true });

      const link = document.createElement('a');
      link.download = `xawars-rng-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate thumbnail:', err);
    }
  };

  const wallpaperPath = currentOperator ? `/ops/${currentOperator.id}_wallpaper.jpg` : null;

  return (
    <main className={`min-h-screen text-zinc-100 p-4 font-sans selection:bg-yellow-500/30 relative overflow-hidden ${isStreamerMode ? 'bg-[#00b140]' : 'bg-black'}`}>

      {/* Creator Tools Overlay */}
      <CreatorTools
        onCopySummary={handleCopySummary}
        onToggleStreamerMode={() => setIsStreamerMode(!isStreamerMode)}
        isStreamerMode={isStreamerMode}
        onDownloadThumbnail={handleDownloadThumbnail}
      />

      {/* Global Wallpaper Layer - Hide in streamer mode */}
      {!isStreamerMode && (
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
      )}

      {/* Modal Overlay */}
      <DeploymentModal
        isOpen={isModalOpen}
        operator={pendingOperator}
        loadout={pendingLoadout}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* Final Screen Overlay */}
      {isComplete && (
        <FinalScreen
          kills={kills}
          deaths={deaths}
          onReset={handleFullReset}
        />
      )}

      {/* Grid layout container */}
      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] gap-6 max-w-[1400px] mx-auto pb-20">

        {/* Left Spacer - empty */}
        <div></div>

        {/* Center Column - Main Content */}
        <div className="w-[448px] flex flex-col gap-6">

          {/* Header / Stats */}
          <header className="flex items-center justify-between py-4 border-b border-white/10">
            <h1 className="text-xl font-black uppercase italic tracking-tighter text-yellow-500">
              Xawars <span className="text-white">RNG</span>
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleMute} icon={isMuted ? VolumeX : Volume2}>
                <span className="sr-only">Toggle Mute</span>
              </Button>
              {!isStreamerMode && (
                <Button variant="ghost" size="sm" onClick={handleReset} icon={RotateCcw}>
                  Reset Run
                </Button>
              )}
            </div>
          </header>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <StatCounter
              label="Kills"
              value={kills}
              onIncrement={() => {
                setKills(k => {
                  const newVal = k + 1;
                  if (newVal === 100) playGoal();
                  else playKill();
                  return newVal;
                });
              }}
            />
            <StatCounter
              label="Deaths"
              value={deaths}
              onIncrement={() => {
                setDeaths(d => d + 1);
                playDeath();
              }}
              variant="danger"
            />
          </div>

          {/* Operator Card area */}
          <div id="operator-card-container">
            <OperatorDisplay
              operator={currentOperator}
              loadout={currentLoadout}
              isRolling={isRolling}
            />
          </div>

          {/* Action Button */}
          <Button
            onClick={handleRoll}
            disabled={isRolling}
            size="lg"
            className={`w-full text-lg py-6 transition-all active:scale-95 ${isRolling ? 'animate-button-press' : ''}`}
            icon={Dices}
          >
            {currentOperator ? 'Reroll Operator' : 'Deploy Operator'}
          </Button>

          {/* Footer info - Hide in streamer mode */}
          {!isStreamerMode && (
            <div className="mt-8 text-center">
              <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Goal: 100 Kills</p>
              <div className="w-full bg-zinc-900 h-1.5 mt-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(kills, 100)}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Right Column - History - Hide in streamer mode */}
        {!isStreamerMode && (
          <div className="w-80 pt-[72px]">
            <HistoryList history={history} />
          </div>
        )}

      </div>
    </main>
  );
}