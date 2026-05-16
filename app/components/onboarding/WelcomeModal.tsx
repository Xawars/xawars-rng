'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dices, BarChart3, Map, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOnboardingContext } from './OnboardingProvider';
import { useAuth } from '../../context/AuthContext';

interface WelcomeModalProps {
  onDeploy?: () => void;
}

const PANELS = [
  { id: 'identity' },
  { id: 'features' },
  { id: 'action' },
] as const;

/**
 * 3-panel welcome carousel shown on first visit only.
 * Keyboard navigable (arrows, Escape, Tab).
 */
export function WelcomeModal({ onDeploy }: WelcomeModalProps) {
  const { isOnboardingComplete, hasEntryPlayed, completeOnboarding } = useOnboardingContext();
  const { user, isGuest } = useAuth();
  const [currentPanel, setCurrentPanel] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const displayName = user?.displayName || (isGuest ? 'Agent' : 'Agent');

  // Show modal after entry animation completes and only if onboarding not done
  useEffect(() => {
    if (!isOnboardingComplete && hasEntryPlayed) {
      // Small delay so the UI has time to render behind
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isOnboardingComplete, hasEntryPlayed]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    completeOnboarding();
  }, [completeOnboarding]);

  const handleDeploy = useCallback(() => {
    handleClose();
    onDeploy?.();
  }, [handleClose, onDeploy]);

  const handleNext = useCallback(() => {
    if (currentPanel < PANELS.length - 1) {
      setCurrentPanel(p => p + 1);
    }
  }, [currentPanel]);

  const handlePrev = useCallback(() => {
    if (currentPanel > 0) {
      setCurrentPanel(p => p - 1);
    }
  }, [currentPanel]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleClose, handleNext, handlePrev]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-70 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to XAWARS"
        className="fixed z-80 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden"
      >
        {/* Skip button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 text-zinc-500 hover:text-white transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Panel content */}
        <div className="p-8 pt-10 min-h-[320px] flex flex-col items-center justify-center text-center">
          {currentPanel === 0 && (
            <PanelIdentity displayName={displayName} />
          )}
          {currentPanel === 1 && (
            <PanelFeatures />
          )}
          {currentPanel === 2 && (
            <PanelAction onDeploy={handleDeploy} />
          )}
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between px-8 pb-6">
          {/* Prev button */}
          <button
            onClick={handlePrev}
            disabled={currentPanel === 0}
            className="text-zinc-500 hover:text-white disabled:opacity-0 disabled:pointer-events-none transition-all p-1 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label="Previous panel"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="flex gap-2" role="tablist" aria-label="Onboarding panels">
            {PANELS.map((panel, i) => (
              <button
                key={panel.id}
                onClick={() => setCurrentPanel(i)}
                role="tab"
                aria-selected={i === currentPanel}
                aria-label={`Panel ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                  i === currentPanel
                    ? 'bg-yellow-500 w-6'
                    : 'bg-zinc-600 hover:bg-zinc-500'
                }`}
              />
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={currentPanel === PANELS.length - 1 ? handleDeploy : handleNext}
            className="text-zinc-500 hover:text-white transition-all p-1 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label={currentPanel === PANELS.length - 1 ? 'Deploy' : 'Next panel'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}

function PanelIdentity({ displayName }: { displayName: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
        <span className="text-2xl font-black text-yellow-500">
          {displayName[0]?.toUpperCase() || 'A'}
        </span>
      </div>
      <h2 className="text-2xl font-black text-white uppercase tracking-tight">
        Welcome, <span className="text-yellow-500">{displayName}</span>
      </h2>
      <p className="text-sm text-zinc-400 max-w-[280px]">
        Your R6 Siege operator roulette and tactical command center
      </p>
    </div>
  );
}

function PanelFeatures() {
  const features = [
    { icon: Dices, label: 'Roll random operators with loadouts' },
    { icon: BarChart3, label: 'Track your kills, deaths, and streaks' },
    { icon: Map, label: 'Get map-specific operator advice' },
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-lg font-bold text-white uppercase tracking-wider">
        What You Can Do
      </h2>
      <div className="flex flex-col gap-4 w-full">
        {features.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-sm text-zinc-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelAction({ onDeploy }: { onDeploy: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center animate-pulse">
        <Dices className="w-10 h-10 text-yellow-500" />
      </div>
      <h2 className="text-lg font-bold text-white uppercase tracking-wider">
        Ready for Deployment?
      </h2>
      <p className="text-sm text-zinc-400">
        Roll your first operator and start your mission
      </p>
      <button
        onClick={onDeploy}
        className="mt-2 px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold uppercase tracking-wider rounded-lg transition-all active:translate-y-0.5 shadow-lg shadow-yellow-500/20 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
      >
        Deploy Now
      </button>
    </div>
  );
}
