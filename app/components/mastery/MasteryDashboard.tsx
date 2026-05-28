'use client';

import React from 'react';
import { useMastery } from '../../context/MasteryContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { pointsToNextTier } from '../../lib/mastery/tier-thresholds';
import type { Challenge, MasteryBadge, MasteryTier, OperatorMastery } from '../../types/mastery';

// --- Tier Color Mapping ---

const TIER_COLORS: Record<MasteryTier, string> = {
  Bronze: 'text-amber-600',
  Silver: 'text-zinc-300',
  Gold: 'text-yellow-400',
  Platinum: 'text-cyan-300',
  Diamond: 'text-purple-300',
};

const TIER_BADGE_VARIANT: Record<MasteryTier, 'default' | 'attack' | 'defense' | 'success' | 'error' | 'warning'> = {
  Bronze: 'warning',
  Silver: 'default',
  Gold: 'attack',
  Platinum: 'defense',
  Diamond: 'success',
};

// --- Streak Milestones ---

const STREAK_MILESTONES = [3, 7, 30] as const;

// --- Helper Functions ---

function formatObjective(objective: string): string {
  switch (objective) {
    case 'complete_deployments': return 'Complete Deployments';
    case 'win_rounds': return 'Win Rounds';
    case 'survive_rounds': return 'Survive Rounds';
    case 'get_kills': return 'Get Kills';
    default: return objective;
  }
}

function formatTimeRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  const diff = expires - now;
  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
}

function getNextStreakMilestone(currentStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak < milestone) return milestone;
  }
  return null;
}

// --- Sub-Components ---

/** Renders a single challenge card within the Active Challenges section. */
function ChallengeCard({ challenge, label }: { challenge: Challenge; label: string }) {
  const progressPercent = challenge.targetCount > 0
    ? Math.round((challenge.progress / challenge.targetCount) * 100)
    : 0;
  const timeRemaining = formatTimeRemaining(challenge.expiresAt);
  const isComplete = challenge.progress >= challenge.targetCount;

  return (
    <Card variant="elevated" padding="sm" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Badge
          variant={label === 'Daily' ? 'attack' : label === 'Weekly' ? 'defense' : 'success'}
          size="sm"
        >
          {label}
        </Badge>
        {timeRemaining && (
          <span className="text-[10px] font-mono text-zinc-400">{timeRemaining}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-white">
          {formatObjective(challenge.objective)}
        </p>
        <div className="flex flex-wrap gap-1.5 text-[10px] text-zinc-400">
          {challenge.role && (
            <span className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">
              {challenge.role}
            </span>
          )}
          {challenge.restriction && (
            <span className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">
              {challenge.restriction.kind === 'gadget_only' ? '🎯 ' : ''}
              {challenge.restriction.value}
            </span>
          )}
          {challenge.operatorScope === 'random_pool' && challenge.operatorPool.length > 0 && (
            <span className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">
              {challenge.operatorPool.length} ops
            </span>
          )}
          {challenge.operatorScope === 'specific_operator' && challenge.operatorPool.length === 1 && (
            <span className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">
              {challenge.operatorPool[0]}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ProgressBar
          value={progressPercent}
          color={isComplete ? 'green' : 'yellow'}
          className="flex-1"
        />
        <span className="text-xs font-mono text-zinc-300 whitespace-nowrap">
          {challenge.progress}/{challenge.targetCount}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500">
        <span>{challenge.xpReward} XP</span>
        <span>{challenge.masteryPointReward} MP</span>
      </div>
    </Card>
  );
}

/** Renders the streak display with current streak and next milestone. */
function StreakDisplay({ currentStreak, longestStreak }: { currentStreak: number; longestStreak: number }) {
  const nextMilestone = getNextStreakMilestone(currentStreak);

  return (
    <Card variant="default" padding="sm" className="flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30">
        <span className="text-lg" role="img" aria-label="fire">🔥</span>
      </div>
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{currentStreak} day streak</span>
          {longestStreak > 0 && (
            <span className="text-[10px] text-zinc-500">Best: {longestStreak}</span>
          )}
        </div>
        {nextMilestone && (
          <span className="text-[10px] text-zinc-400">
            {nextMilestone - currentStreak} more day{nextMilestone - currentStreak !== 1 ? 's' : ''} to {nextMilestone}-day bonus
          </span>
        )}
        {!nextMilestone && currentStreak >= 30 && (
          <span className="text-[10px] text-green-400">All milestones reached!</span>
        )}
      </div>
    </Card>
  );
}

// --- Main Component ---

/**
 * MasteryDashboard — the top-level UI surface for the Operator Mastery system.
 *
 * Three sections:
 * 1. Active Challenges — daily, weekly, and active operator missions with progress
 * 2. Operator Mastery Grid — all operators with their current tier and points
 * 3. Badge Collection — unlocked badges organized by operator
 *
 * Also includes a streak display showing current streak and next milestone.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
export function MasteryDashboard() {
  const {
    dailyChallenge,
    weeklyChallenge,
    activeOperatorMissions,
    operatorMastery,
    masteryBadges,
    masteryStreak,
    isLoading,
  } = useMastery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Loading mastery dashboard">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4" role="main" aria-label="Mastery Dashboard">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Mastery</h1>
      </header>

      {/* Streak Display */}
      <StreakDisplay
        currentStreak={masteryStreak.currentStreak}
        longestStreak={masteryStreak.longestStreak}
      />

      {/* Section 1: Active Challenges */}
      <ActiveChallengesSection
        dailyChallenge={dailyChallenge}
        weeklyChallenge={weeklyChallenge}
        activeOperatorMissions={activeOperatorMissions}
      />

      {/* Section 2: Operator Mastery Grid */}
      <OperatorMasterySection operatorMastery={operatorMastery} />

      {/* Section 3: Badge Collection */}
      <BadgeCollectionSection masteryBadges={masteryBadges} />
    </div>
  );
}

// --- Section Components ---

function ActiveChallengesSection({
  dailyChallenge,
  weeklyChallenge,
  activeOperatorMissions,
}: {
  dailyChallenge: Challenge | null;
  weeklyChallenge: Challenge | null;
  activeOperatorMissions: Challenge[];
}) {
  const hasAnyChallenges = dailyChallenge || weeklyChallenge || activeOperatorMissions.length > 0;

  return (
    <section aria-labelledby="active-challenges-heading">
      <h2 id="active-challenges-heading" className="text-lg font-bold text-white mb-3 uppercase tracking-wide">
        Active Challenges
      </h2>

      {!hasAnyChallenges ? (
        <EmptyState message="No active challenges" minHeight="120px" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dailyChallenge && (
            <ChallengeCard challenge={dailyChallenge} label="Daily" />
          )}
          {weeklyChallenge && (
            <ChallengeCard challenge={weeklyChallenge} label="Weekly" />
          )}
          {activeOperatorMissions.map((mission) => (
            <ChallengeCard key={mission.id} challenge={mission} label="Mission" />
          ))}
        </div>
      )}
    </section>
  );
}

function OperatorMasterySection({
  operatorMastery,
}: {
  operatorMastery: Record<string, OperatorMastery>;
}) {
  // Sort operators by mastery points descending (Requirement 10.3)
  const sortedOperators = Object.values(operatorMastery).sort(
    (a, b) => b.masteryPoints - a.masteryPoints
  );

  return (
    <section aria-labelledby="operator-mastery-heading">
      <h2 id="operator-mastery-heading" className="text-lg font-bold text-white mb-3 uppercase tracking-wide">
        Operator Mastery
      </h2>

      {sortedOperators.length === 0 ? (
        <EmptyState message="Deploy operators to start earning mastery" minHeight="120px" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedOperators.map((op) => (
            <OperatorMasteryCard key={op.operatorId} mastery={op} />
          ))}
        </div>
      )}
    </section>
  );
}

function OperatorMasteryCard({ mastery }: { mastery: OperatorMastery }) {
  const toNext = pointsToNextTier(mastery.masteryPoints);
  const tierColor = TIER_COLORS[mastery.currentTier];
  const isDiamond = mastery.currentTier === 'Diamond';

  // Calculate progress within current tier for the progress bar
  const tierFloors: Record<MasteryTier, number> = {
    Bronze: 0,
    Silver: 100,
    Gold: 300,
    Platinum: 600,
    Diamond: 1000,
  };
  const tierCeilings: Record<MasteryTier, number> = {
    Bronze: 100,
    Silver: 300,
    Gold: 600,
    Platinum: 1000,
    Diamond: 1000, // No ceiling for Diamond
  };

  const floor = tierFloors[mastery.currentTier];
  const ceiling = tierCeilings[mastery.currentTier];
  const tierRange = ceiling - floor;
  const progressInTier = mastery.masteryPoints - floor;
  const progressPercent = isDiamond ? 100 : Math.round((progressInTier / tierRange) * 100);

  return (
    <Card variant="interactive" padding="sm" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white capitalize">
          {mastery.operatorId}
        </span>
        <Badge variant={TIER_BADGE_VARIANT[mastery.currentTier]} size="sm">
          {mastery.currentTier}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <ProgressBar
          value={progressPercent}
          color={isDiamond ? 'green' : 'yellow'}
          className="flex-1"
        />
        <span className="text-xs font-mono text-zinc-300 whitespace-nowrap">
          {mastery.masteryPoints} pts
        </span>
      </div>

      {!isDiamond && (
        <span className="text-[10px] text-zinc-500">
          {toNext} pts to next tier
        </span>
      )}
      {isDiamond && (
        <span className={`text-[10px] ${tierColor}`}>
          Max tier reached
        </span>
      )}
    </Card>
  );
}

function BadgeCollectionSection({ masteryBadges }: { masteryBadges: MasteryBadge[] }) {
  // Group badges by operator (Requirement 10.4)
  const badgesByOperator: Record<string, MasteryBadge[]> = {};
  for (const badge of masteryBadges) {
    if (!badgesByOperator[badge.operatorId]) {
      badgesByOperator[badge.operatorId] = [];
    }
    badgesByOperator[badge.operatorId].push(badge);
  }

  // Sort operators alphabetically
  const operatorIds = Object.keys(badgesByOperator).sort();

  // Sort badges within each operator by tier order
  const tierOrder: MasteryTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  for (const opId of operatorIds) {
    badgesByOperator[opId].sort(
      (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
    );
  }

  return (
    <section aria-labelledby="badge-collection-heading">
      <h2 id="badge-collection-heading" className="text-lg font-bold text-white mb-3 uppercase tracking-wide">
        Badge Collection
      </h2>

      {operatorIds.length === 0 ? (
        <EmptyState message="No badges unlocked yet" minHeight="120px" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {operatorIds.map((operatorId) => (
            <Card key={operatorId} variant="default" padding="sm" className="flex flex-col gap-2">
              <span className="text-sm font-bold text-white capitalize">{operatorId}</span>
              <div className="flex flex-wrap gap-1.5">
                {badgesByOperator[operatorId].map((badge) => (
                  <BadgeItem key={badge.id} badge={badge} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function BadgeItem({ badge }: { badge: MasteryBadge }) {
  const unlockDate = new Date(badge.unlockedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 rounded border border-zinc-700"
      title={`Unlocked ${unlockDate}`}
    >
      <Badge variant={TIER_BADGE_VARIANT[badge.tier]} size="sm">
        {badge.tier}
      </Badge>
      <span className="text-[10px] text-zinc-500">{unlockDate}</span>
    </div>
  );
}

export default MasteryDashboard;
