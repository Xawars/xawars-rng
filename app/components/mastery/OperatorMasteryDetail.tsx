'use client';

import React from 'react';
import { useMastery } from '@/app/context/MasteryContext';
import { operators } from '@/app/data/operators';
import { pointsToNextTier, TIER_THRESHOLDS } from '@/app/lib/mastery/tier-thresholds';
import { Card, Badge, Button, ProgressBar, EmptyState } from '@/app/components/ui';
import type { Challenge, MasteryTier } from '@/app/types/mastery';

// --- Tier styling ---

const TIER_COLORS: Record<MasteryTier, string> = {
  Bronze: 'text-amber-600',
  Silver: 'text-zinc-300',
  Gold: 'text-yellow-400',
  Platinum: 'text-cyan-300',
  Diamond: 'text-purple-300',
};

const TIER_BADGE_VARIANTS: Record<MasteryTier, 'default' | 'attack' | 'defense' | 'success' | 'error' | 'warning'> = {
  Bronze: 'warning',
  Silver: 'default',
  Gold: 'warning',
  Platinum: 'default',
  Diamond: 'success',
};

const TIER_ICONS: Record<MasteryTier, string> = {
  Bronze: '🥉',
  Silver: '🥈',
  Gold: '🥇',
  Platinum: '💎',
  Diamond: '👑',
};

// --- Helper: format objective for display ---

function formatObjective(objective: Challenge['objective']): string {
  switch (objective) {
    case 'complete_deployments':
      return 'Complete Deployments';
    case 'win_rounds':
      return 'Win Rounds';
    case 'survive_rounds':
      return 'Survive Rounds';
    case 'get_kills':
      return 'Get Kills';
    default:
      return objective;
  }
}

// --- Props ---

interface OperatorMasteryDetailProps {
  operatorId: string;
}

// --- Component ---

export function OperatorMasteryDetail({ operatorId }: OperatorMasteryDetailProps) {
  const {
    operatorMastery,
    availableOperatorMissions,
    activateOperatorMission,
    activeOperatorMissions,
    masteryBadges,
  } = useMastery();

  // Resolve operator name from catalog
  const operator = operators.find((op) => op.id === operatorId);
  const operatorName = operator?.name ?? operatorId;

  // Get mastery state for this operator
  const mastery = operatorMastery[operatorId];
  const currentTier: MasteryTier = mastery?.currentTier ?? 'Bronze';
  const currentPoints = mastery?.masteryPoints ?? 0;
  const pointsNeeded = pointsToNextTier(currentPoints);

  // Compute progress percentage within current tier
  const currentThreshold = TIER_THRESHOLDS.find((t) => t.tier === currentTier);
  const tierFloor = currentThreshold?.floor ?? 0;
  const tierCeiling = currentThreshold?.ceiling ?? Infinity;
  const tierRange = tierCeiling === Infinity ? 1 : tierCeiling - tierFloor;
  const progressInTier = tierCeiling === Infinity ? 100 : ((currentPoints - tierFloor) / tierRange) * 100;

  // Get available missions for this operator (up to 3)
  const available = availableOperatorMissions(operatorId);

  // Get active missions for this operator
  const activeMissionsForOperator = activeOperatorMissions.filter(
    (m) => m.operatorPool.length === 1 && m.operatorPool[0] === operatorId
  );

  // Get badges for this operator
  const operatorBadges = masteryBadges.filter((b) => b.operatorId === operatorId);

  // Handle mission activation
  const [activatingId, setActivatingId] = React.useState<string | null>(null);
  const [activationError, setActivationError] = React.useState<string | null>(null);

  async function handleActivateMission(challengeId: string) {
    setActivatingId(challengeId);
    setActivationError(null);

    const result = await activateOperatorMission(challengeId);

    if (!result.activated) {
      if (result.reason === 'mission_limit_reached') {
        setActivationError('Maximum of 3 active missions reached. Complete or discard a mission first.');
      } else if (result.reason === 'already_active') {
        setActivationError('This mission is already active.');
      }
    }

    setActivatingId(null);
  }

  return (
    <section aria-label={`${operatorName} mastery details`} className="space-y-6">
      {/* Header: Operator name + Tier badge */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-white">{operatorName}</h2>
        <Badge variant={TIER_BADGE_VARIANTS[currentTier]}>
          <span aria-hidden="true" className="mr-1">{TIER_ICONS[currentTier]}</span>
          {currentTier}
        </Badge>
      </div>

      {/* Mastery Points + Tier Progress */}
      <Card variant="default" padding="md">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400 uppercase tracking-wider">Mastery Points</span>
            <span className={`text-lg font-bold ${TIER_COLORS[currentTier]}`}>
              {currentPoints}
            </span>
          </div>

          {/* Tier progress bar */}
          <div className="space-y-1">
            <ProgressBar
              value={progressInTier}
              color={currentTier === 'Diamond' ? 'green' : 'yellow'}
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{currentTier}</span>
              {pointsNeeded > 0 ? (
                <span>{pointsNeeded} pts to next tier</span>
              ) : (
                <span>Max tier reached</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Active Missions for this operator */}
      {activeMissionsForOperator.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
            Active Missions
          </h3>
          <ul className="space-y-2" aria-label={`Active missions for ${operatorName}`}>
            {activeMissionsForOperator.map((mission) => (
              <li key={mission.id}>
                <Card variant="elevated" padding="sm">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">
                        {formatObjective(mission.objective)}
                      </p>
                      {mission.restriction && (
                        <p className="text-xs text-zinc-500">
                          Restriction: {mission.restriction.value}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-400">
                        {mission.progress}/{mission.targetCount}
                      </p>
                      <ProgressBar
                        value={(mission.progress / mission.targetCount) * 100}
                        color="green"
                        className="w-20 mt-1"
                      />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Available Missions (up to 3) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
          Available Missions
        </h3>

        {activationError && (
          <p className="text-xs text-red-400" role="alert">
            {activationError}
          </p>
        )}

        {available.length > 0 ? (
          <ul className="space-y-2" aria-label={`Available missions for ${operatorName}`}>
            {available.map((mission) => (
              <li key={mission.id}>
                <Card variant="default" padding="sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {formatObjective(mission.objective)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>Target: {mission.targetCount}</span>
                        <span>•</span>
                        <span>+{mission.xpReward} XP</span>
                        <span>•</span>
                        <span>+{mission.masteryPointReward} MP</span>
                      </div>
                      {mission.restriction && (
                        <p className="text-xs text-zinc-500">
                          Restriction: {mission.restriction.value}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivateMission(mission.id)}
                      loading={activatingId === mission.id}
                      disabled={activatingId !== null}
                      aria-label={`Activate mission: ${formatObjective(mission.objective)}`}
                    >
                      Activate
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            message="No missions available"
            minHeight="80px"
          />
        )}
      </div>

      {/* Unlocked Badges for this operator */}
      {operatorBadges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
            Unlocked Badges
          </h3>
          <ul className="flex flex-wrap gap-2" aria-label={`Mastery badges for ${operatorName}`}>
            {operatorBadges.map((badge) => (
              <li key={badge.id}>
                <Badge variant={TIER_BADGE_VARIANTS[badge.tier]}>
                  <span aria-hidden="true" className="mr-1">{TIER_ICONS[badge.tier]}</span>
                  {badge.tier}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
