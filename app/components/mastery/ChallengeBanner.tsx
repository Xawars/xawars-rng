'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Clock, Target } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { useMastery } from '../../context/MasteryContext';
import type { Challenge, ChallengeSlot } from '../../types/mastery';

// --- Props ---

export interface ChallengeBannerProps {
  /** Which challenge slot to display */
  slot: ChallengeSlot;
  /** Optional additional className */
  className?: string;
}

// --- Helpers ---

const SLOT_LABELS: Record<ChallengeSlot, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  mission: 'Mission',
};

const SLOT_BADGE_VARIANT: Record<ChallengeSlot, 'attack' | 'defense' | 'warning'> = {
  daily: 'attack',
  weekly: 'defense',
  mission: 'warning',
};

const OBJECTIVE_LABELS: Record<string, string> = {
  complete_deployments: 'Complete Deployments',
  win_rounds: 'Win Rounds',
  survive_rounds: 'Survive Rounds',
  get_kills: 'Get Kills',
};

/**
 * Format a restriction for display.
 */
function formatRestriction(restriction: Challenge['restriction']): string | null {
  if (!restriction) return null;
  switch (restriction.kind) {
    case 'gadget_only':
      return `Gadget: ${restriction.value}`;
    case 'playstyle':
      return `Playstyle: ${restriction.value}`;
    case 'loadout_limit':
      return `Loadout: ${restriction.value}`;
    default:
      return null;
  }
}

/**
 * Compute time remaining until a challenge expires.
 * Returns a human-readable string like "2h 15m" or "3d 5h".
 */
function computeTimeRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;

  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  const diffMs = expires - now;

  if (diffMs <= 0) return 'Expired';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Build a short objective description for the banner.
 */
function buildObjectiveDescription(challenge: Challenge): string {
  const objectiveLabel = OBJECTIVE_LABELS[challenge.objective] ?? challenge.objective;
  const rolePrefix = challenge.role ? `[${challenge.role}] ` : '';
  return `${rolePrefix}${objectiveLabel}`;
}

// --- Component ---

/**
 * ChallengeBanner displays an active challenge in a compact, expandable banner format.
 *
 * Collapsed state: slot badge, objective description, progress bar, time remaining.
 * Expanded state: adds restriction, operator pool, and full progress details.
 *
 * Requirements: 2.1, 2.2, 2.5 (Active Challenge Display on the Roll Surface)
 */
export function ChallengeBanner({ slot, className = '' }: ChallengeBannerProps) {
  const { dailyChallenge, weeklyChallenge, activeOperatorMissions } = useMastery();
  const [isExpanded, setIsExpanded] = useState(false);

  // Resolve the challenge for this slot
  const challenge: Challenge | null = useMemo(() => {
    switch (slot) {
      case 'daily':
        return dailyChallenge;
      case 'weekly':
        return weeklyChallenge;
      case 'mission':
        return activeOperatorMissions[0] ?? null;
      default:
        return null;
    }
  }, [slot, dailyChallenge, weeklyChallenge, activeOperatorMissions]);

  // Don't render if no challenge is active for this slot
  if (!challenge) return null;

  const progressPercent =
    challenge.targetCount > 0
      ? Math.round((challenge.progress / challenge.targetCount) * 100)
      : 0;

  const timeRemaining = computeTimeRemaining(challenge.expiresAt);
  const objectiveDescription = buildObjectiveDescription(challenge);
  const restrictionText = formatRestriction(challenge.restriction);
  const badgeVariant = SLOT_BADGE_VARIANT[slot];
  const slotLabel = SLOT_LABELS[slot];

  const progressColor =
    progressPercent >= 100 ? 'green' : progressPercent >= 50 ? 'yellow' : 'green';

  const bannerId = `challenge-banner-${slot}`;
  const detailsId = `challenge-details-${slot}`;

  return (
    <Card
      variant="elevated"
      padding="sm"
      className={`transition-all duration-200 ${className}`}
    >
      {/* Collapsed banner — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 focus:ring-offset-zinc-800 rounded-lg p-1 -m-1"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        aria-label={`${slotLabel} challenge: ${objectiveDescription}. Progress ${challenge.progress} of ${challenge.targetCount}. ${isExpanded ? 'Collapse' : 'Expand'} for details.`}
        id={bannerId}
      >
        {/* Slot badge */}
        <Badge variant={badgeVariant} size="sm">
          {slotLabel}
        </Badge>

        {/* Objective description */}
        <span className="flex-1 text-sm text-zinc-200 truncate">
          {objectiveDescription}
        </span>

        {/* Progress indicator (compact) */}
        <span className="text-xs text-zinc-400 whitespace-nowrap" aria-hidden="true">
          {challenge.progress}/{challenge.targetCount}
        </span>

        {/* Time remaining */}
        {timeRemaining && (
          <span className="flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>{timeRemaining}</span>
          </span>
        )}

        {/* Expand/collapse chevron */}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" aria-hidden="true" />
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div
          id={detailsId}
          role="region"
          aria-labelledby={bannerId}
          className="mt-3 pt-3 border-t border-zinc-700 space-y-3"
        >
          {/* Full progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" aria-hidden="true" />
                Progress
              </span>
              <span>
                {challenge.progress} / {challenge.targetCount}
              </span>
            </div>
            <ProgressBar
              value={progressPercent}
              color={progressColor}
              className="h-2"
            />
          </div>

          {/* Role */}
          {challenge.role && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Role:</span>
              <span className="text-zinc-300">{challenge.role}</span>
            </div>
          )}

          {/* Restriction */}
          {restrictionText && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Restriction:</span>
              <span className="text-zinc-300">{restrictionText}</span>
            </div>
          )}

          {/* Operator scope */}
          {challenge.operatorScope !== 'any' && challenge.operatorPool.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Operators:</span>
              <span className="text-zinc-300">
                {challenge.operatorPool.join(', ')}
              </span>
            </div>
          )}

          {/* XP reward */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">Reward:</span>
            <span className="text-yellow-400 font-medium">
              {challenge.xpReward} XP
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-green-400 font-medium">
              {challenge.masteryPointReward} MP
            </span>
          </div>

          {/* Time remaining (expanded view) */}
          {timeRemaining && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Time left:</span>
              <span className="text-zinc-300">{timeRemaining}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
