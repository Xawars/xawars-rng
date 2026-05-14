'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dices, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useAudioFeedback } from './hooks/useAudioFeedback';
import { usePersistedState } from './hooks/usePersistedState';
import { useSoundContext } from './context/SoundContext';
import { Button } from './components/ui/Button';
import { OperatorDisplay } from './components/OperatorDisplay';
import { StatCounter } from './components/StatCounter';

import { HistoryList, HistoryItem } from './components/HistoryList';
import { DeploymentModal } from './components/DeploymentModal';
import { CreatorTools } from './components/CreatorTools';
import { ThumbnailEditorModal } from './components/ThumbnailEditorModal';
import { AnimationExporterModal } from './components/AnimationExporterModal';
import { MatchTypeSelector } from './components/MatchTypeSelector';
import { PlatformSelector } from './components/PlatformSelector';
import { OptionsRow } from './components/OptionsRow';
import { OperatorCardModal } from './components/OperatorCardModal';
import { OperatorStatsModal } from './components/OperatorStatsModal';
import { MapAdvisor } from './components/MapAdvisor';
import { FloatingGeneratorButton } from './components/FloatingGeneratorButton';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ContentGeneratorModal } from './components/ContentGeneratorModal';
import { generateContentIdea, validateApiKey, classifyApiError, type ContentIdea } from './lib/ai-client';
import { DEFAULT_PROVIDER, type ProviderId } from './lib/ai-providers';
import { getRandomOperator, generateLoadout, getRandomMatchType, getRandomTargetKills, getRandomRole, getRandomPlatform } from './data/operators';
import { Operator, Loadout, MatchType, Platform, RankedStats, RankTier, RankDivision } from './data/types';
import { RankedDisplay, DEFAULT_RANKED_STATS, TIER_ORDER, DIVISION_RP_MAX, WIN_RP, LOSS_RP } from './components/RankedDisplay';

export default function Home() {
  const [kills, setKills] = usePersistedState('xawars_kills', 0);
  const [deaths, setDeaths] = usePersistedState('xawars_deaths', 0);
  const [currentOperator, setCurrentOperator] = usePersistedState<Operator | null>('xawars_currentOperator', null);
  const [currentLoadout, setCurrentLoadout] = usePersistedState<Loadout | null>('xawars_currentLoadout', null);
  const [currentMatchType, setCurrentMatchType] = usePersistedState<MatchType | null>('xawars_currentMatchType', null);
  const [currentPlatform, setCurrentPlatform] = usePersistedState<Platform | null>('xawars_currentPlatform', null);
  const [currentTargetKills, setCurrentTargetKills] = usePersistedState<number>('xawars_currentTargetKills', 0);
  const [operatorKills, setOperatorKills] = usePersistedState<Record<string, number>>('xawars_operatorKills', {});
  const [operatorDeaths, setOperatorDeaths] = usePersistedState<Record<string, number>>('xawars_operatorDeaths', {});
  const [currentRole, setCurrentRole] = usePersistedState<string>('xawars_currentRole', '');
  const [showRoles, setShowRoles] = usePersistedState<boolean>('xawars_showRoles', true);
  const [history, setHistory] = usePersistedState<HistoryItem[]>('xawars_history', []);
  const [rankedStats, setRankedStats] = usePersistedState<RankedStats>('xawars_ranked_stats', DEFAULT_RANKED_STATS);
  const [rankedPlatform, setRankedPlatform] = usePersistedState<'PC' | 'Console'>('xawars_ranked_platform', 'PC');

  // AI Content Generator - persisted state
  const [apiKey, setApiKey] = usePersistedState<string>('xawars_openai_api_key', '');
  const [activeProvider, setActiveProvider] = usePersistedState<ProviderId>('xawars_ai_provider', DEFAULT_PROVIDER);

  // AI Content Generator - transient state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<ContentIdea | null>(null);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Transient state for the deployment flow
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null);
  const [pendingLoadout, setPendingLoadout] = useState<Loadout | null>(null);
  const [pendingMatchType, setPendingMatchType] = useState<MatchType | null>(null);
  const [pendingPlatform, setPendingPlatform] = useState<Platform | null>(null);
  const [pendingTargetKills, setPendingTargetKills] = useState<number>(0);
  const [pendingRole, setPendingRole] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetComplete, setTargetComplete] = useState(false);
  const [isStreamerMode, setIsStreamerMode] = useState(false);
  const [isThumbnailEditorOpen, setIsThumbnailEditorOpen] = useState(false);
  const [isAnimationExporterOpen, setIsAnimationExporterOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'roulette' | 'map-advisor'>('roulette');

  const [isRolling, setIsRolling] = useState(false);
  const [wallpaperError, setWallpaperError] = useState(false);

  const { playRoll, stopRoll, playReveal } = useAudioFeedback();
  const { isMuted, toggleMute } = useSoundContext();

  // --- AI Content Generator Handlers ---

  const handleGenerate = useCallback(async (key?: string) => {
    const keyToUse = key || apiKey;
    setIsGenerating(true);
    setGeneratorError(null);

    try {
      const idea = await generateContentIdea({ provider: activeProvider, apiKey: keyToUse });
      setCurrentIdea(idea);
    } catch (err: unknown) {
      const classified = classifyApiError(activeProvider, err);
      setGeneratorError(classified.message);

      // Auth errors: clear key and open ApiKeyModal with error
      if (classified.type === 'auth') {
        setApiKey('');
        setIsGeneratorOpen(false);
        setApiKeyError(classified.message);
        setIsApiKeyModalOpen(true);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, activeProvider, setApiKey]);

  const handleGeneratorClick = useCallback(() => {
    const validation = validateApiKey(activeProvider, apiKey);
    if (!validation.valid) {
      setIsApiKeyModalOpen(true);
    } else {
      setIsGeneratorOpen(true);
    }
  }, [apiKey, activeProvider]);

  const handleApiKeySave = useCallback((key: string, provider: ProviderId) => {
    setApiKey(key);
    setActiveProvider(provider);
    setApiKeyError(null);
    setIsApiKeyModalOpen(false);
    setIsGeneratorOpen(true);
  }, [setApiKey, setActiveProvider]);

  const handleClearApiKey = useCallback(() => {
    setApiKey('');
    setIsGeneratorOpen(false);
    setIsApiKeyModalOpen(true);
  }, [setApiKey]);

  

  // Reset wallpaper error when operator changes
  useEffect(() => {
    setWallpaperError(false);
  }, [currentOperator?.id]);

  const handleRoll = () => {
    setIsRolling(true);
    playRoll();
    setTargetComplete(false);
    // Simple timeout to simulate "rolling" feel
    setTimeout(() => {
      const op = getRandomOperator();
      const loadout = generateLoadout(op);
      
      // Use selected match type or random
      const matchType = currentMatchType || getRandomMatchType();
      
      // Use selected platform or random (only if Ranked or no specific match type selected)
      let platform: Platform | null = null;
      if (currentPlatform) {
        platform = currentPlatform;
      } else if (matchType === 'Ranked') {
        platform = getRandomPlatform();
      }
      
      const targetKills = getRandomTargetKills();
      const role = showRoles ? getRandomRole(op) : '';

      // Set pending state instead of current
      setPendingOperator(op);
      setPendingLoadout(loadout);
      setPendingMatchType(matchType);
      setPendingPlatform(platform);
      setPendingTargetKills(targetKills);
      setPendingRole(role);

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
    if (pendingMatchType) setCurrentMatchType(pendingMatchType);
    if (pendingPlatform) setCurrentPlatform(pendingPlatform);
    setCurrentTargetKills(pendingTargetKills);
    if (pendingRole) setCurrentRole(pendingRole);

    // Ensure the operator has a kill/death counter entry (reset to 0 for fresh deployment)
    setOperatorKills(prev => ({
      ...prev,
      [pendingOperator.id]: 0
    }));
    setOperatorDeaths(prev => ({
      ...prev,
      [pendingOperator.id]: 0
    }));

    // Reset global kills/deaths to match the operator's counters
    setKills(0);
    setDeaths(0);

    // Add to history
    const newHistoryItem: HistoryItem = {
      id: Date.now(),
      operator: pendingOperator,
      loadout: pendingLoadout,
      matchType: pendingMatchType || undefined,
      platform: pendingMatchType === 'Ranked' ? pendingPlatform || undefined : undefined,
      targetKills: pendingTargetKills,
      role: pendingRole
    };
    setHistory(prev => [newHistoryItem, ...prev].slice(0, 5));

    // Play reveal sound
    playReveal();

    // Close modal and clear pending
    setIsModalOpen(false);
    setPendingOperator(null);
    setPendingLoadout(null);
    setPendingMatchType(null);
    setPendingTargetKills(0);
    setTargetComplete(false);
  };

  const handleReject = () => {
    setIsModalOpen(false);
    setPendingOperator(null);
    setPendingLoadout(null);
    setPendingMatchType(null);
    setPendingPlatform(null);
    setPendingTargetKills(0);
    setPendingRole('');
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the run?")) {
      setKills(0);
      setDeaths(0);
      setCurrentOperator(null);
      setCurrentLoadout(null);
      setCurrentMatchType(null);
      setCurrentPlatform(null);
      setCurrentTargetKills(0);
      setCurrentRole('');
      setOperatorKills({});
      setOperatorDeaths({});
      setHistory([]);
      setTargetComplete(false);
    }
  };

  const handleFullReset = () => {
    setKills(0);
    setDeaths(0);
    setCurrentOperator(null);
    setCurrentLoadout(null);
    setCurrentMatchType(null);
    setCurrentTargetKills(0);
    setCurrentRole('');
    setOperatorKills({});
    setOperatorDeaths({});
    setHistory([]);
    setTargetComplete(false);
  }

  // Shared progression helper used by win/loss and manual RP add
  const applyRPDelta = (platform: 'PC' | 'Console', delta: number) => {
    setRankedStats(prev => {
      const { tier, division, rp, peakTier, peakDivision } = prev[platform];

      let newRp       = Math.max(0, rp + delta);
      let newDivision: RankDivision = division;
      let newTier:     RankTier     = tier;
      let newPeakTier: RankTier     = peakTier;
      let newPeakDivision: RankDivision = peakDivision;

      if (newTier === 'Champion') {
        newRp = Math.min(newRp, DIVISION_RP_MAX);
      } else {
        // Handle multiple division jumps (e.g. manual +200 RP)
        while (newRp >= DIVISION_RP_MAX) {
          newRp -= DIVISION_RP_MAX;
          const nextDiv = (newDivision + 1) as RankDivision;
          if (nextDiv > 5) {
            newDivision = 1;
            const idx = TIER_ORDER.indexOf(newTier);
            if (idx < TIER_ORDER.length - 1) {
              newTier = TIER_ORDER[idx + 1];
            }
            if (newTier === 'Champion') {
              newRp = Math.min(newRp, DIVISION_RP_MAX);
              break;
            }
          } else {
            newDivision = nextDiv;
          }
        }
      }

      const isHigher =
        TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(newPeakTier) ||
        (newTier === newPeakTier && newDivision > newPeakDivision);
      if (isHigher) {
        newPeakTier     = newTier;
        newPeakDivision = newDivision;
      }

      return {
        ...prev,
        [platform]: { tier: newTier, division: newDivision, rp: newRp, peakTier: newPeakTier, peakDivision: newPeakDivision },
      };
    });
  };

  const handleRPRankChange = (result: 'win' | 'loss') => {
    applyRPDelta(rankedPlatform, result === 'win' ? WIN_RP : -LOSS_RP);
  };

  const handleRankedReset = () => {
    if (confirm('Reset ranked season for ' + rankedPlatform + '? Peak rank will be kept.')) {
      setRankedStats(prev => ({
        ...prev,
        [rankedPlatform]: {
          ...prev[rankedPlatform],
          tier: 'Copper',
          division: 1,
          rp: 0,
        },
      }));
    }
  };

  const handleSetRank = (platform: 'PC' | 'Console', tier: RankTier, division: RankDivision, rp: number) => {
    setRankedStats(prev => {
      const clamped = Math.max(0, Math.min(DIVISION_RP_MAX, rp));
      const { peakTier, peakDivision } = prev[platform];
      const isHigher =
        TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(peakTier) ||
        (tier === peakTier && division > peakDivision);
      return {
        ...prev,
        [platform]: {
          tier,
          division,
          rp: clamped,
          peakTier:     isHigher ? tier     : peakTier,
          peakDivision: isHigher ? division  : peakDivision,
        },
      };
    });
  };

  const handleAddRP = (platform: 'PC' | 'Console', delta: number) => {
    applyRPDelta(platform, delta);
  };

  const restoreFromHistory = (item: HistoryItem) => {
    const opId = item.operator.id;
    setCurrentOperator(item.operator);
    setCurrentLoadout(item.loadout);
    if (item.matchType) setCurrentMatchType(item.matchType as MatchType);
    if (item.platform) setCurrentPlatform(item.platform);
    setCurrentTargetKills(item.targetKills || 0);
    if (item.role) setCurrentRole(item.role);

    // Load per-operator kills and deaths
    setKills(operatorKills[opId] || 0);
    setDeaths(operatorDeaths[opId] || 0);

    setTargetComplete(false);
    setIsStatsModalOpen(false);
    playReveal();
  };

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

  const handleKillDecrement = () => {
    setKills(k => Math.max(0, k - 1));
    if (currentOperator) {
      setOperatorKills(prev => ({
        ...prev,
        [currentOperator.id]: Math.max(0, (prev[currentOperator.id] || 0) - 1)
      }));
    }
  };

  const handleDeathDecrement = () => {
    setDeaths(d => Math.max(0, d - 1));
    if (currentOperator) {
      setOperatorDeaths(prev => ({
        ...prev,
        [currentOperator.id]: Math.max(0, (prev[currentOperator.id] || 0) - 1)
      }));
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
        onOpenThumbnailEditor={() => setIsThumbnailEditorOpen(true)}
        onOpenAnimationExporter={() => setIsAnimationExporterOpen(true)}
      />

      <ThumbnailEditorModal
        isOpen={isThumbnailEditorOpen}
        onClose={() => setIsThumbnailEditorOpen(false)}
        defaultOperator={currentOperator}
        defaultLoadout={currentLoadout}
        defaultMatchType={currentMatchType}
        defaultKills={kills}
        defaultDeaths={deaths}
      />

      <AnimationExporterModal 
        isOpen={isAnimationExporterOpen}
        onClose={() => setIsAnimationExporterOpen(false)}
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
        matchType={pendingMatchType}
        platform={pendingMatchType === 'Ranked' ? pendingPlatform : undefined}
        targetKills={pendingTargetKills}
        role={showRoles ? pendingRole : undefined}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* AI Content Generator */}
      <FloatingGeneratorButton onClick={handleGeneratorClick} />
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => {
          setIsApiKeyModalOpen(false);
          setApiKeyError(null);
        }}
        onSave={handleApiKeySave}
        error={apiKeyError}
        initialProvider={activeProvider}
      />
      <ContentGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        idea={currentIdea}
        isGenerating={isGenerating}
        error={generatorError}
        onGenerate={() => handleGenerate()}
        onClearApiKey={handleClearApiKey}
        activeProvider={activeProvider}
        onChangeProvider={() => {
          setIsGeneratorOpen(false);
          setIsApiKeyModalOpen(true);
        }}
      />

      

      {/* Grid layout container */}
      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] gap-6 max-w-[1400px] mx-auto pb-20">

        {/* Left Column - Ranked Display */}
        <div className="pt-[72px] flex justify-end">
          {!isStreamerMode && (
            <RankedDisplay
              rankedStats={rankedStats}
              selectedPlatform={rankedPlatform}
              onWin={() => handleRPRankChange('win')}
              onLoss={() => handleRPRankChange('loss')}
              onPlatformChange={setRankedPlatform}
              onReset={handleRankedReset}
              onSetRank={handleSetRank}
              onAddRP={handleAddRP}
            />
          )}
        </div>

        {/* Center Column - Main Content */}
        <div className="w-[448px] flex flex-col gap-6">

          {/* Header / Stats */}
          <header className="flex items-center justify-between py-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-black uppercase italic tracking-tighter text-yellow-500">
                Xawars <span className="text-white">RNG</span>
              </h1>
              {/* View Mode Tabs */}
              <div className="flex bg-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('roulette')}
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                    viewMode === 'roulette'
                      ? 'bg-yellow-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Roulette
                </button>
                <button
                  onClick={() => setViewMode('map-advisor')}
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                    viewMode === 'map-advisor'
                      ? 'bg-yellow-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Map Advisor
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleMute} icon={isMuted ? VolumeX : Volume2}>
                <span className="sr-only">Toggle Mute</span>
              </Button>
              {!isStreamerMode && viewMode === 'roulette' && (
                <Button variant="ghost" size="sm" onClick={handleReset} icon={RotateCcw}>
                  Reset Run
                </Button>
              )}
            </div>
          </header>

          {viewMode === 'map-advisor' ? (
            <MapAdvisor />
          ) : (
            <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <StatCounter
              label="Kills"
              value={kills}
              onIncrement={() => {
                setKills(k => k + 1);

                // Track operator kills
                if (currentOperator) {
                  setOperatorKills(prev => {
                    const currentOpKills = prev[currentOperator.id] || 0;
                    const newOpKills = currentOpKills + 1;
                    // Check if target completed
                    if (newOpKills === currentTargetKills) {
                      setTargetComplete(true);
                    }
                    return {
                      ...prev,
                      [currentOperator.id]: newOpKills
                    };
                  });
                }
              }}
              onDecrement={handleKillDecrement}
            />
            <StatCounter
              label="Deaths"
              value={deaths}
              onIncrement={() => {
                setDeaths(d => d + 1);
                if (currentOperator) {
                  setOperatorDeaths(prev => ({
                    ...prev,
                    [currentOperator.id]: (prev[currentOperator.id] || 0) + 1
                  }));
                }
              }}
              onDecrement={handleDeathDecrement}
              variant="danger"
            />
          </div>

          {/* Match Type and Platform Selectors */}
          <div className="flex flex-col gap-4">
            <MatchTypeSelector
              currentType={currentMatchType}
              onSelect={(type) => setCurrentMatchType(type)}
              isRollingParent={isRolling}
            />
            <PlatformSelector
              currentPlatform={currentPlatform}
              onSelect={(platform) => setCurrentPlatform(platform)}
            />
          </div>

          {/* Options Row */}
          <OptionsRow
            showRoles={showRoles}
            onToggleRoles={(enabled) => setShowRoles(enabled)}
          />

          {/* Operator Card area */}
          <div id="operator-card-container">
            <OperatorDisplay
              operator={currentOperator}
              loadout={currentLoadout}
              matchType={currentMatchType}
              platform={currentMatchType === 'Ranked' ? currentPlatform : undefined}
              isRolling={isRolling}
              targetKills={currentTargetKills}
              operatorKills={currentOperator ? (operatorKills[currentOperator.id] || 0) : 0}
              role={showRoles ? currentRole : undefined}
            />
          </div>

          {/* Target Complete Banner */}
          {targetComplete && currentOperator && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-center animate-pulse">
              <p className="text-green-400 font-bold uppercase tracking-wider">
                Target Complete: {currentOperator.name} reached {currentTargetKills} kills!
              </p>
              <p className="text-zinc-400 text-sm mt-1">Reroll to continue or keep playing</p>
            </div>
          )}

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

          
            </>
          )}

        </div>

        {/* Right Column - History - Hide in streamer mode */}
        {!isStreamerMode && (
          <div className="w-80 pt-[72px]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatsModalOpen(true)}
              className="mb-4 w-full"
              icon={Dices}
            >
              Select from History
            </Button>
            <HistoryList history={history} onItemClick={setSelectedHistoryItem} />
          </div>
        )}

        {/* History Item Modal */}
        <OperatorCardModal
          item={selectedHistoryItem}
          operatorKills={operatorKills}
          operatorDeaths={operatorDeaths}
          onClose={() => setSelectedHistoryItem(null)}
        />

        {/* Operator Stats / Selection Modal */}
        {isStatsModalOpen && (
          <OperatorStatsModal
            history={history}
            operatorKills={operatorKills}
            operatorDeaths={operatorDeaths}
            onSelect={restoreFromHistory}
            onClose={() => setIsStatsModalOpen(false)}
          />
        )}

      </div>
    </main>
  );
}