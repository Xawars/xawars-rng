'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Dices, RotateCcw, UserRoundSearch, Flag, Swords } from 'lucide-react';
import { usePersistedState } from './hooks/usePersistedState';
import { useAuth } from './context/AuthContext';
import { Button } from './components/ui/Button';
import { OperatorDisplay } from './components/OperatorDisplay';
import { RollAnimation } from './components/RollAnimation';
import { StatCounter } from './components/StatCounter';

import { HistoryList, HistoryItem } from './components/HistoryList';
import { DeploymentModal } from './components/DeploymentModal';
import { MatchTypeSelector } from './components/MatchTypeSelector';
import { PlatformSelector } from './components/PlatformSelector';
import { OptionsRow } from './components/OptionsRow';
import { KillTargetSelector } from './components/KillTargetSelector';
import { MapDeploySelector } from './components/MapDeploySelector';
import { SiteSelector } from './components/SiteSelector';
import { SideSelector } from './components/SideSelector';
import { OperatorCardModal } from './components/OperatorCardModal';
import { OperatorStatsModal } from './components/OperatorStatsModal';
import { OperatorPickerModal } from './components/OperatorPickerModal';
import { MapAdvisorView } from './components/MapAdvisorView';
import { StratsView } from './components/StratsView';
import { MAPS } from './data/maps';
import { STRATS } from './data/strats';
import { ProtectedRoute, isGuestMode, clearGuestMode } from './components/auth/ProtectedRoute';
import { TacticalEntry, WelcomeModal, FirstActionTooltip } from './components/onboarding';
import { useOnboardingContext } from './components/onboarding/OnboardingProvider';
import { AccountIndicator, SetCallsignModal, shouldPromptCallsign } from './components/account';
import { useData } from './context/DataContext';
import { getRandomOperator, generateLoadout, getRandomMatchType, getRandomTargetKills, getRandomRole, getRandomPlatform } from './data/operators';
import { Operator, Loadout, MatchType, Platform, Side } from './data/types';
import { MasteryHeader } from './components/mastery';
import { RivalryView } from './components/rivalry/RivalryView';
import { initialStreakState, applyStreakAction, captureSnapshot, computeSessionDeltas } from './lib/session-logic';
import { HotStreakIndicator } from './components/HotStreakIndicator';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { operators } from './data/operators';
import type { SessionSnapshot, SessionDeltaData } from './types/database';

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}

function HomeContent() {
  const router = useRouter();
  const { user, session, isGuest } = useAuth();
  const { markFirstRoll } = useOnboardingContext();
  const { addDeployment, deleteDeployment, clearDeployments, updateMapPerformance, updateMapWinLoss, updateSitePerformance } = useData();
  const [showCallsignPrompt, setShowCallsignPrompt] = useState(() => false);
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
  const [userTargetKills, setUserTargetKills] = usePersistedState<number | null>('xawars_userTargetKills', null);
  const [currentSide, setCurrentSide] = usePersistedState<Side | null>('xawars_currentSide', null);
  const [currentMapId, setCurrentMapId] = usePersistedState<string | null>('xawars_currentMapId', null);
  const [currentSiteId, setCurrentSiteId] = usePersistedState<string | null>('xawars_currentSiteId', null);
  const [currentDeploymentId, setCurrentDeploymentId] = usePersistedState<string | null>('xawars_currentDeploymentId', null);
  const [history, setHistory] = usePersistedState<HistoryItem[]>('xawars_history', []);

  // Hot streak state — in-memory only, resets on page load (no persistence)
  const [killStreak, setKillStreak] = useState(initialStreakState());

  // Session snapshot — captures state at session start for delta computation
  const sessionSnapshotRef = useRef<SessionSnapshot | null>(null);
  const snapshotCapturedRef = useRef(false);

  // Session summary modal state
  const [sessionSummaryOpen, setSessionSummaryOpen] = useState(false);
  const [sessionDeltaData, setSessionDeltaData] = useState<SessionDeltaData | null>(null);

  // Build operator name lookup from full operators list
  const operatorNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const op of operators) {
      map[op.id] = op.name;
    }
    return map;
  }, []);

  // ponytail: aggregate deployment-keyed kills/deaths back to per-operator for stats views
  const operatorKillsAggregate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of history) {
      const key = item.deploymentId || item.operator.id;
      const kills = operatorKills[key] || 0;
      map[item.operator.id] = (map[item.operator.id] || 0) + kills;
    }
    return map;
  }, [history, operatorKills]);

  const operatorDeathsAggregate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of history) {
      const key = item.deploymentId || item.operator.id;
      const deaths = operatorDeaths[key] || 0;
      map[item.operator.id] = (map[item.operator.id] || 0) + deaths;
    }
    return map;
  }, [history, operatorDeaths]);

  // Transient state for the deployment flow
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null);
  const [pendingLoadout, setPendingLoadout] = useState<Loadout | null>(null);
  const [pendingMatchType, setPendingMatchType] = useState<MatchType | null>(null);
  const [pendingPlatform, setPendingPlatform] = useState<Platform | null>(null);
  const [pendingTargetKills, setPendingTargetKills] = useState<number>(0);
  const [pendingRole, setPendingRole] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetComplete, setTargetComplete] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'mastery' | 'map-advisor' | 'strats'>('mastery');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isRivalryOpen, setIsRivalryOpen] = useState(false);

  const [isRolling, setIsRolling] = useState(false);
  const [wallpaperError, setWallpaperError] = useState(false);
  const [matchEndOpen, setMatchEndOpen] = useState(false);

  // Check if existing user needs a callsign prompt
  useEffect(() => {
    if (shouldPromptCallsign(user, isGuest)) {
      setShowCallsignPrompt(true);
    }
  }, [user, isGuest]);

  // Capture session snapshot after hydration completes (persisted state is loaded)
  // Uses a ref flag to prevent double-capture on visibility changes or HMR
  useEffect(() => {
    if (snapshotCapturedRef.current) return;
    // After the first render cycle, persisted state is hydrated from localStorage.
    // Capture snapshot with current values (kills, deaths, operatorKills, operatorDeaths).
    sessionSnapshotRef.current = captureSnapshot(
      kills,
      deaths,
      operatorKillsAggregate,
      operatorDeathsAggregate,
      {}
    );
    snapshotCapturedRef.current = true;
  }, [kills, deaths, operatorKillsAggregate, operatorDeathsAggregate]);

  // Re-capture snapshot for new session (called after session end + modal close)
  const recaptureSessionSnapshot = useCallback(() => {
    snapshotCapturedRef.current = false;
    sessionSnapshotRef.current = captureSnapshot(
      kills,
      deaths,
      operatorKillsAggregate,
      operatorDeathsAggregate,
      {}
    );
    snapshotCapturedRef.current = true;
  }, [kills, deaths, operatorKillsAggregate, operatorDeathsAggregate]);

  // End Session handler — compute deltas and show session summary modal
  const handleEndSession = useCallback(() => {
    if (!sessionSnapshotRef.current) return;
    const deltas = computeSessionDeltas(
      sessionSnapshotRef.current,
      kills,
      deaths,
      operatorKillsAggregate,
      operatorDeathsAggregate,
      {},
      operatorNamesMap
    );
    setSessionDeltaData(deltas);
    setSessionSummaryOpen(true);
  }, [kills, deaths, operatorKillsAggregate, operatorDeathsAggregate, operatorNamesMap]);

  // Session modal close handler — reset snapshot to start new session
  const handleSessionModalClose = useCallback(() => {
    setSessionSummaryOpen(false);
    setSessionDeltaData(null);
    recaptureSessionSnapshot();
  }, [recaptureSessionSnapshot]);

  

  // Reset wallpaper error when operator changes
  useEffect(() => {
    setWallpaperError(false);
  }, [currentOperator?.id]);

  const handleRoll = () => {
    setIsRolling(true);
    setTargetComplete(false);
    markFirstRoll();
    // Simple timeout to simulate "rolling" feel
    setTimeout(() => {
      const op = getRandomOperator(currentSide || undefined);
      const loadout = generateLoadout(op);
      
      // Use selected match type or random
      const matchType = currentMatchType || getRandomMatchType();
      
      // Use selected platform or random
      const platform: Platform = currentPlatform || getRandomPlatform();
      
      const targetKills = userTargetKills ?? getRandomTargetKills();
      const role = showRoles ? getRandomRole(op) : '';

      // Set pending state instead of current
      setPendingOperator(op);
      setPendingLoadout(loadout);
      setPendingMatchType(matchType);
      setPendingPlatform(platform);
      setPendingTargetKills(targetKills);
      setPendingRole(role);

      setIsRolling(false);

      // Open modal
      setIsModalOpen(true);

      // NOTE: We delay the reveal sound until acceptance or maybe play a "ready" sound here?
      // For now, let's keep silence or a "tick" sound, and play the BIG reveal on accept.
    }, 1200);
  };

  const handleManualPick = (op: Operator) => {
    setIsPickerOpen(false);
    const loadout = generateLoadout(op);
    const matchType = currentMatchType || getRandomMatchType();
    const platform: Platform = currentPlatform || getRandomPlatform();
    const targetKills = userTargetKills ?? getRandomTargetKills();
    const role = showRoles ? getRandomRole(op) : '';

    setPendingOperator(op);
    setPendingLoadout(loadout);
    setPendingMatchType(matchType);
    setPendingPlatform(platform);
    setPendingTargetKills(targetKills);
    setPendingRole(role);

    setIsModalOpen(true);
    markFirstRoll();
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
    const deploymentId = crypto.randomUUID();
    setCurrentDeploymentId(deploymentId);
    setOperatorKills(prev => ({
      ...prev,
      [deploymentId]: 0
    }));
    setOperatorDeaths(prev => ({
      ...prev,
      [deploymentId]: 0
    }));

    // Reset global kills/deaths to match the operator's counters
    setKills(0);
    setDeaths(0);

    // Reset kill streak for fresh deployment
    setKillStreak(initialStreakState());

    // Fresh deployment starts with no map/site — user picks per deployment
    setCurrentMapId(null);
    setCurrentSiteId(null);

    // Add to history
    const newHistoryItem: HistoryItem = {
      id: Date.now(),
      operator: pendingOperator,
      loadout: pendingLoadout,
      matchType: pendingMatchType || undefined,
      platform: pendingPlatform || undefined,
      targetKills: pendingTargetKills,
      role: pendingRole,
      deploymentId,
      mapId: null,
      siteId: null,
    };
    setHistory(prev => [newHistoryItem, ...prev].slice(0, 15));

    // Persist deployment to cloud
    const deploymentRecord = {
      id: deploymentId,
      operatorId: pendingOperator.id,
      operatorName: pendingOperator.name,
      operatorSide: pendingOperator.side,
      loadout: pendingLoadout,
      matchType: pendingMatchType || undefined,
      platform: pendingPlatform || undefined,
      targetKills: pendingTargetKills,
      role: pendingRole || undefined,
      deployedAt: new Date().toISOString(),
    };
    addDeployment(deploymentRecord);

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

  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  const handleSurrender = () => {
    if (!currentOperator) return;

    // Mark the current deployment as surrendered in history
    setHistory(prev => prev.map(item => 
      item.deploymentId === currentDeploymentId && !item.surrendered
        ? { ...item, surrendered: true }
        : item
    ));

    // Clear the active deployment without removing history
    setCurrentOperator(null);
    setCurrentLoadout(null);
    setCurrentMatchType(null);
    setCurrentPlatform(null);
    setCurrentTargetKills(0);
    setCurrentRole('');
    setCurrentDeploymentId(null);
    setKills(0);
    setDeaths(0);
    setTargetComplete(false);
    setShowSurrenderConfirm(false);
    setKillStreak(initialStreakState());
  };

  const [resetModalOpen, setResetModalOpen] = useState(false);

  const handleReset = () => {
    setResetModalOpen(true);
  };

  const confirmReset = () => {
    setKills(0);
    setDeaths(0);
    setCurrentOperator(null);
    setCurrentLoadout(null);
    setCurrentMatchType(null);
    setCurrentPlatform(null);
    setCurrentTargetKills(0);
    setCurrentRole('');
    setCurrentMapId(null);
    setCurrentSiteId(null);
    setCurrentDeploymentId(null);
    setOperatorKills({});
    setOperatorDeaths({});
    setHistory([]);
    setTargetComplete(false);
    setKillStreak(initialStreakState());
    clearDeployments();
    setResetModalOpen(false);
  };

  const handleFullReset = () => {
    setKills(0);
    setDeaths(0);
    setCurrentOperator(null);
    setCurrentLoadout(null);
    setCurrentMatchType(null);
    setCurrentTargetKills(0);
    setCurrentRole('');
    setCurrentDeploymentId(null);
    setOperatorKills({});
    setOperatorDeaths({});
    setHistory([]);
    setTargetComplete(false);
    setKillStreak(initialStreakState());
  }

  const restoreFromHistory = (item: HistoryItem) => {
    const deployId = item.deploymentId || item.operator.id;
    setCurrentOperator(item.operator);
    setCurrentLoadout(item.loadout);
    setCurrentDeploymentId(deployId);
    if (item.matchType) setCurrentMatchType(item.matchType as MatchType);
    if (item.platform) setCurrentPlatform(item.platform);
    setCurrentTargetKills(item.targetKills || 0);
    if (item.role) setCurrentRole(item.role);

    // Restore map/site context from the deployment (each deployment owns its own)
    setCurrentMapId(item.mapId ?? null);
    setCurrentSiteId(item.siteId ?? null);

    // Load per-deployment kills and deaths
    setKills(operatorKills[deployId] || 0);
    setDeaths(operatorDeaths[deployId] || 0);

    setTargetComplete(false);
    setIsStatsModalOpen(false);
    setKillStreak(initialStreakState());
  };

  const performKillIncrement = useCallback((amount: number) => {
    setKills(k => k + amount);

    if (currentOperator && currentDeploymentId) {
      setOperatorKills(prev => {
        const currentOpKills = prev[currentDeploymentId] || 0;
        const newOpKills = currentOpKills + amount;
        if (currentTargetKills > 0 && newOpKills >= currentTargetKills) {
          setTargetComplete(true);
        }
        return { ...prev, [currentDeploymentId]: newOpKills };
      });

      // ponytail: attribute kills to selected map if one is active
      if (currentMapId) {
        updateMapPerformance(currentOperator.id, currentMapId, { kills: amount });
        if (currentSiteId) {
          updateSitePerformance(currentOperator.id, currentMapId, currentSiteId, { kills: amount });
        }
      }
    }

    // Update hot streak — apply 'kill' action for each kill in amount
    setKillStreak(prev => {
      let state = prev;
      for (let i = 0; i < amount; i++) {
        state = applyStreakAction(state, 'kill');
      }
      return state;
    });
  }, [currentOperator, currentDeploymentId, currentTargetKills, currentMapId, currentSiteId, setKills, setOperatorKills, setTargetComplete, updateMapPerformance, updateSitePerformance]);

  const performDeathIncrement = useCallback((amount: number) => {
    setDeaths(d => d + amount);
    if (currentOperator && currentDeploymentId) {
      setOperatorDeaths(prev => ({
        ...prev,
        [currentDeploymentId]: (prev[currentDeploymentId] || 0) + amount
      }));

      // ponytail: attribute deaths to selected map if one is active
      if (currentMapId) {
        updateMapPerformance(currentOperator.id, currentMapId, { deaths: amount });
        if (currentSiteId) {
          updateSitePerformance(currentOperator.id, currentMapId, currentSiteId, { deaths: amount });
        }
      }
    }

    // Update hot streak — death resets streak
    setKillStreak(prev => applyStreakAction(prev, 'death'));
  }, [currentOperator, currentDeploymentId, currentMapId, currentSiteId, setDeaths, setOperatorDeaths, updateMapPerformance, updateSitePerformance]);

  const handleKillDecrement = () => {
    setKills(k => Math.max(0, k - 1));
    if (currentOperator && currentDeploymentId) {
      setOperatorKills(prev => ({
        ...prev,
        [currentDeploymentId]: Math.max(0, (prev[currentDeploymentId] || 0) - 1)
      }));

      // Notify mastery system of kill revert
    }

    // Update hot streak — decrement streak count
    setKillStreak(prev => applyStreakAction(prev, 'decrement'));
  };

  const handleDeathDecrement = () => {
    setDeaths(d => Math.max(0, d - 1));
    if (currentOperator && currentDeploymentId) {
      setOperatorDeaths(prev => ({
        ...prev,
        [currentDeploymentId]: Math.max(0, (prev[currentDeploymentId] || 0) - 1)
      }));
    }
  };

  // ponytail: record win/loss for the active map, bump match count, then clear map for next round
  const handleMatchEnd = (outcome: 'win' | 'loss') => {
    if (!currentMapId) return;
    updateMapWinLoss(currentMapId, outcome);
    if (currentOperator) {
      updateMapPerformance(currentOperator.id, currentMapId, { matches: 1 });
      if (currentSiteId) {
        updateSitePerformance(currentOperator.id, currentMapId, currentSiteId, { matches: 1 });
      }
    }
    setMatchEndOpen(false);
    // Clear map + site so user picks the next one — operator stays deployed
    setCurrentMapId(null);
    setCurrentSiteId(null);
    // ponytail: persist cleared map/site to the deployment's history entry so restoring doesn't resurrect stale state
    if (currentDeploymentId) {
      setHistory(prev => prev.map(h => h.deploymentId === currentDeploymentId ? { ...h, mapId: null, siteId: null } : h));
    }
  };

  const wallpaperExt = currentOperator?.id === 'snake' ? 'png' : 'jpg';
  const wallpaperPath = currentOperator ? `/ops/${currentOperator.id}_wallpaper.${wallpaperExt}` : null;

  return (
    <TacticalEntry>
    <main className={`h-dvh text-zinc-100 font-sans selection:bg-yellow-500/30 relative overflow-hidden bg-black`}>

      {/* Onboarding Welcome Modal */}
      <WelcomeModal onDeploy={handleRoll} />

      {/* Callsign prompt for existing users without a display name */}
      {showCallsignPrompt && (
        <SetCallsignModal onComplete={() => setShowCallsignPrompt(false)} />
      )}

      {/* Guest Mode Banner */}
      {isGuestMode() && !session && (
        <GuestModeBanner />
      )}

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
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-zinc-900 via-black to-black" />
        )}
      </div>

      {/* Modal Overlay */}
      <DeploymentModal
        isOpen={isModalOpen}
        operator={pendingOperator}
        loadout={pendingLoadout}
        matchType={pendingMatchType}
        platform={pendingPlatform}
        targetKills={pendingTargetKills}
        role={pendingRole || undefined}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* Manual Operator Picker */}
      <OperatorPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleManualPick}
        currentSide={currentSide}
      />

      

      {/* Grid layout container */}
      <div className={`relative z-10 flex flex-col h-full max-w-[1400px] mx-auto px-4 ${isGuestMode() && !session ? 'pt-10' : ''}`}>

        {/* Sticky Header */}
        <header className="shrink-0 flex items-center justify-between py-3 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black uppercase italic tracking-tighter text-yellow-500">
              Xawars <span className="text-white">RNG</span>
            </h1>
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              {(['mastery', 'map-advisor', 'strats'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setViewMode(tab)}
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                    viewMode === tab
                      ? 'bg-yellow-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab === 'mastery' ? 'Operator Mastery' : tab === 'map-advisor' ? 'Map Advisor' : 'Strats'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset} icon={RotateCcw}>
              Reset Run
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsRivalryOpen(true)} icon={Swords}>
              <span className="sr-only">Rivalry</span>
            </Button>
            <AccountIndicator onOpenStats={() => setIsStatsModalOpen(true)} />
          </div>
        </header>

        {/* Content area — fills remaining height */}
        {viewMode === 'mastery' ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,560px)_1fr] gap-4 lg:gap-6 pt-4">

          {/* Left Column - Mastery Header */}
            <div className="hidden lg:flex flex-col overflow-y-auto scrollbar-auto-hide pr-2 pt-1">
              <MasteryHeader
                history={history}
                operatorKills={operatorKillsAggregate}
                operatorDeaths={operatorDeathsAggregate}
              />
            </div>

        {/* Center Column - Main Content */}
        <div className="max-w-[560px] w-full mx-auto lg:mx-0 flex flex-col h-full overflow-y-auto overflow-x-hidden scrollbar-auto-hide">

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <StatCounter
              label="Kills"
              value={kills}
              onIncrement={() => performKillIncrement(1)}
              onDecrement={handleKillDecrement}
            />
            <StatCounter
              label="Deaths"
              value={deaths}
              onIncrement={() => performDeathIncrement(1)}
              onDecrement={handleDeathDecrement}
              variant="danger"
            />
          </div>

          {/* Hot Streak Banner — appears below stats when on a streak */}
          <div className="shrink-0 mt-1">
            <HotStreakIndicator streakCount={killStreak.count} isActive={killStreak.isHotStreak} />
          </div>

          {/* Selectors — compact stacked */}
          <div className="flex flex-col gap-2 shrink-0 mt-3">
            <MatchTypeSelector
              currentType={currentMatchType}
              onSelect={(type) => setCurrentMatchType(type)}
              isRollingParent={isRolling}
            />
            <div className="grid grid-cols-2 gap-2">
              <PlatformSelector
                currentPlatform={currentPlatform}
                onSelect={(platform) => setCurrentPlatform(platform)}
              />
              <SideSelector
                currentSide={currentSide}
                onSelect={(side) => setCurrentSide(side)}
              />
            </div>
          </div>

          {/* Options Row */}
          <div className="shrink-0 mt-2">
            <KillTargetSelector
              value={userTargetKills}
              onSelect={(v) => setUserTargetKills(v)}
            />
          </div>
          <div className="shrink-0 mt-2">
            <OptionsRow
              showRoles={showRoles}
              onToggleRoles={(enabled) => setShowRoles(enabled)}
            />
          </div>

          {/* Map Selector — for strat linking */}
          <div className="shrink-0 mt-2">
            <MapDeploySelector currentMapId={currentMapId} onSelect={(id) => { setCurrentMapId(id); setCurrentSiteId(null); if (currentDeploymentId) { setHistory(prev => prev.map(h => h.deploymentId === currentDeploymentId ? { ...h, mapId: id, siteId: null } : h)); } }} />
          </div>

          {/* Site Selector — shows bomb sites when a map is selected */}
          {currentMapId && (
            <div className="shrink-0 mt-2">
              <SiteSelector mapId={currentMapId} currentSiteId={currentSiteId} onSelect={(siteId) => { setCurrentSiteId(siteId); if (currentDeploymentId) { setHistory(prev => prev.map(h => h.deploymentId === currentDeploymentId ? { ...h, siteId } : h)); } }} />
            </div>
          )}

          {/* Match End — record win/loss when map is active and operator deployed */}
          {currentOperator && currentMapId && (
            <div className="shrink-0 mt-2">
              {matchEndOpen ? (
                <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 shrink-0">Result?</span>
                  <button
                    type="button"
                    onClick={() => handleMatchEnd('win')}
                    className="flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition-colors"
                  >
                    Win
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMatchEnd('loss')}
                    className="flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors"
                  >
                    Loss
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchEndOpen(false)}
                    className="px-2 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMatchEndOpen(true)}
                  className="w-full py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                >
                  End Match
                </button>
              )}
            </div>
          )}



          {/* Operator Card area */}
          <div id="operator-card-container" className="shrink-0 mt-3 relative px-2">
            <RollAnimation isRolling={isRolling} side={currentSide} />
            <OperatorDisplay
              operator={currentOperator}
              loadout={currentLoadout}
              matchType={currentMatchType}
              platform={currentMatchType === 'Ranked' ? currentPlatform : undefined}
              isRolling={isRolling}
              targetKills={currentTargetKills}
              operatorKills={currentDeploymentId ? (operatorKills[currentDeploymentId] || 0) : 0}
              role={showRoles ? currentRole : undefined}
              onLoadoutChange={(newLoadout) => setCurrentLoadout(newLoadout)}
            />
          </div>

          {/* Linked Strats — shows matching strats for current operator + map */}
          {currentOperator && currentMapId && (() => {
            const linked = STRATS.filter(s => s.operator === currentOperator.id && s.mapId === currentMapId);
            if (linked.length === 0) return null;
            return (
              <div className="shrink-0 mt-2">
                {linked.map(strat => (
                  <div key={strat.id} className="border border-yellow-500/20 rounded-lg bg-yellow-500/5 p-3 mb-2 last:mb-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500">Strat Available</span>
                      <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{strat.role}</span>
                      <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{strat.difficulty}</span>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">{strat.title}</p>
                    <p className="text-xs text-zinc-400 mb-2">{strat.winCondition}</p>
                    <details className="group">
                      <summary className="text-[10px] font-bold uppercase tracking-wider text-yellow-500/70 cursor-pointer hover:text-yellow-500 transition-colors">
                        Show setup & details
                      </summary>
                      <div className="mt-2 space-y-2 text-xs text-zinc-400">
                        {strat.setup.utility.length > 0 && (
                          <div>
                            <span className="font-bold text-zinc-300 block mb-0.5">Utility:</span>
                            {strat.setup.utility.map((u, i) => (
                              <p key={i}><span className="text-yellow-500">{u.gadget}:</span> {u.location}</p>
                            ))}
                          </div>
                        )}
                        {strat.setup.reinforcements.length > 0 && (
                          <div>
                            <span className="font-bold text-zinc-300 block mb-0.5">Reinforcements:</span>
                            {strat.setup.reinforcements.map((r, i) => <p key={i}>• {r}</p>)}
                          </div>
                        )}
                        {strat.roles.length > 0 && (
                          <div>
                            <span className="font-bold text-zinc-300 block mb-0.5">Team roles:</span>
                            {strat.roles.map((r, i) => (
                              <p key={i}><span className="text-white capitalize">{r.operator}</span> ({r.role}): {r.description}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Target Complete Overlay — shows on top of operator card */}
          {targetComplete && currentOperator && (
            <div className="shrink-0 mt-2 relative overflow-hidden rounded-xl border border-green-500/30 bg-linear-to-b from-green-900/30 via-zinc-900/90 to-zinc-900 p-4">
              {/* Background glow */}
              <div className="absolute inset-0 bg-linear-to-t from-transparent to-green-500/5 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-green-500/10 blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center gap-2">
                {/* Success icon */}
                <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>

                {/* Title */}
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-400/80">Mission Complete</p>
                
                {/* Operator + kills */}
                <p className="text-lg font-black uppercase tracking-tight text-white">
                  {currentOperator.name} <span className="text-green-400">× {currentTargetKills}</span>
                </p>

                {/* Subtitle */}
                <p className="text-[10px] text-zinc-400">Target eliminated — deploy again or keep playing</p>

                {/* Quick action */}
                <button
                  onClick={handleRoll}
                  className="mt-1 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-green-500/15 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/25 transition-colors"
                >
                  Next Deployment →
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons — always at bottom */}
          <div className="shrink-0 mt-3 pb-4 flex flex-col gap-2">
            {/* Primary actions row */}
            <div className="flex gap-2">
              <FirstActionTooltip>
              <Button
                onClick={handleRoll}
                disabled={isRolling}
                size="md"
                className={`flex-1 transition-all active:scale-95 ${isRolling ? 'animate-button-press' : ''}`}
                icon={Dices}
              >
                {currentOperator ? 'Reroll Operator' : 'Deploy Operator'}
              </Button>
              </FirstActionTooltip>
              <Button
                onClick={() => setIsPickerOpen(true)}
                disabled={isRolling}
                variant="outline"
                size="md"
                className="transition-all active:scale-95"
                icon={UserRoundSearch}
              >
                Pick
              </Button>
            </div>

            {/* Surrender row — only when deployed and target not complete */}
            {currentOperator && !targetComplete && (
              showSurrenderConfirm ? (
                <div className="flex gap-2 items-center justify-center p-2 rounded-lg border border-red-500/20 bg-red-500/5">
                  <span className="text-xs text-red-400 font-medium">Abandon this deployment?</span>
                  <Button
                    onClick={handleSurrender}
                    variant="outline"
                    size="sm"
                    className="transition-all active:scale-95 border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    Confirm
                  </Button>
                  <Button
                    onClick={() => setShowSurrenderConfirm(false)}
                    variant="ghost"
                    size="sm"
                    className="transition-all active:scale-95 text-zinc-400"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowSurrenderConfirm(true)}
                  disabled={isRolling}
                  variant="ghost"
                  size="sm"
                  className="w-full transition-all active:scale-95 text-red-400/60 hover:text-red-400 hover:bg-red-500/5"
                  icon={Flag}
                  title="Surrender current deployment"
                >
                  Surrender Deployment
                </Button>
              )
            )}
          </div>

          </div>

        {/* Right Column - History */}
          <div className="hidden lg:block overflow-y-auto scrollbar-auto-hide pb-6 pl-4 border-gradient-fade">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatsModalOpen(true)}
              className="mb-4 w-full"
              icon={Dices}
            >
              Select from History
            </Button>
            <HistoryList
              history={history}
              operatorKills={operatorKills}
              currentOperatorId={currentOperator?.id || null}
              onItemClick={setSelectedHistoryItem}
              onSelectItem={restoreFromHistory}
              onDeleteItem={(item) => {
                setHistory(prev => prev.filter(h => h.id !== item.id));
                if (item.deploymentId) {
                  deleteDeployment(item.deploymentId);
                }
                // If the deleted item is the currently displayed operator, clear the center display
                if (currentOperator?.id === item.operator.id) {
                  setCurrentOperator(null);
                  setCurrentLoadout(null);
                  setCurrentMatchType(null);
                  setCurrentPlatform(null);
                  setCurrentTargetKills(0);
                  setCurrentRole('');
                  setKills(0);
                  setDeaths(0);
                  setTargetComplete(false);
                }
              }}
            />
          </div>

        </div>
        ) : viewMode === 'map-advisor' ? (
          <div className="flex-1 min-h-0 flex pt-4">
            <MapAdvisorView />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex pt-4">
            <StratsView />
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
            operatorKills={operatorKillsAggregate}
            operatorDeaths={operatorDeathsAggregate}
            onSelect={restoreFromHistory}
            onClose={() => setIsStatsModalOpen(false)}
          />
        )}

        {/* Rivalry Comparison Modal */}
        <RivalryView
          isOpen={isRivalryOpen}
          onClose={() => setIsRivalryOpen(false)}
        />

        {/* Session Summary Modal — shown when user ends session */}
        {sessionDeltaData && (
          <SessionSummaryModal
            isOpen={sessionSummaryOpen}
            onClose={handleSessionModalClose}
            sessionData={sessionDeltaData}
          />
        )}

        {/* Reset Run Confirmation Modal */}
        {resetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setResetModalOpen(false)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Reset Run</h3>
              </div>
              <div className="space-y-2 mb-5">
                <p className="text-sm text-zinc-300">This will permanently delete:</p>
                <ul className="text-sm text-zinc-400 space-y-1 pl-4">
                  <li className="flex gap-2"><span className="text-red-400">•</span>All deployment history</li>
                  <li className="flex gap-2"><span className="text-red-400">•</span>All kill & death stats</li>
                  <li className="flex gap-2"><span className="text-red-400">•</span>Operator mastery progress</li>
                  <li className="flex gap-2"><span className="text-red-400">•</span>Cloud data (if signed in)</li>
                </ul>
                <p className="text-xs text-red-400/80 font-medium mt-2">This action cannot be undone.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setResetModalOpen(false)}
                  className="flex-1 py-2 px-3 text-sm font-bold rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 py-2 px-3 text-sm font-bold rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Reset Everything
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
    </TacticalEntry>
  );
}

function GuestModeBanner() {
  const router = useRouter();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-zinc-900/95 border-b border-zinc-800 px-4 py-2 backdrop-blur-sm">
      <span className="text-xs text-zinc-400">
        Guest mode — your data is saved locally only
      </span>
      <button
        type="button"
        onClick={() => {
          clearGuestMode();
          router.push('/login');
        }}
        className="rounded bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 text-xs font-medium text-yellow-500 transition-colors hover:bg-yellow-500/20 hover:border-yellow-500/50"
      >
        Sign in
      </button>
    </div>
  );
}
