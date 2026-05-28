'use client';

import React, { useState, useCallback } from 'react';
import { Trash2, Target, Shield, Swords, Star, Trophy, Clock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { useMastery } from '../../context/MasteryContext';
import type { Challenge } from '../../types/mastery';

// --- Helper Functions ---

/**
 * Format the objective into a human-readable label.
 */
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

/**
 * Format the restriction kind into a human-readable label.
 */
function formatRestrictionKind(kind: string): string {
  switch (kind) {
    case 'gadget_only':
      return 'Gadget Only';
    case 'playstyle':
      return 'Playstyle';
    case 'loadout_limit':
      return 'Loadout Limit';
    default:
      return kind;
  }
}

/**
 * Format the operator scope into a human-readable label.
 */
function formatOperatorScope(scope: Challenge['operatorScope']): string {
  switch (scope) {
    case 'any':
      return 'Any Operator';
    case 'random_pool':
      return 'Specific Pool';
    case 'specific_operator':
      return 'Specific Operator';
    default:
      return scope;
  }
}

/**
 * Format the slot into a human-readable label.
 */
function formatSlot(slot: Challenge['slot']): string {
  switch (slot) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'mission':
      return 'Mission';
    default:
      return slot;
  }
}

/**
 * Get the badge variant for a slot type.
 */
function getSlotVariant(slot: Challenge['slot']): 'attack' | 'defense' | 'warning' {
  switch (slot) {
    case 'daily':
      return 'attack';
    case 'weekly':
      return 'defense';
    case 'mission':
      return 'warning';
    default:
      return 'attack';
  }
}

/**
 * Calculate time remaining until a challenge expires.
 * Returns a human-readable string or null if no expiry.
 */
function getTimeRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;

  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

// --- Component Props ---

interface ChallengeDetailModalProps {
  /** The challenge to display details for. */
  challenge: Challenge | null;
  /** Whether the modal is open. */
  isOpen: boolean;
  /** Callback when the modal is closed. */
  onClose: () => void;
}

// --- Component ---

/**
 * ChallengeDetailModal displays full challenge details including objective,
 * restrictions, operator scope, progress, and rewards. It also provides
 * a discard button with a confirmation dialog.
 *
 * Requirements: 2.4, 6.5, 10.7
 */
export function ChallengeDetailModal({
  challenge,
  isOpen,
  onClose,
}: ChallengeDetailModalProps) {
  const { discardChallenge } = useMastery();
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const handleDiscardClick = useCallback(() => {
    setShowDiscardConfirm(true);
  }, []);

  const handleDiscardCancel = useCallback(() => {
    setShowDiscardConfirm(false);
  }, []);

  const handleDiscardConfirm = useCallback(async () => {
    if (!challenge) return;

    setIsDiscarding(true);
    try {
      await discardChallenge(challenge.id);
      setShowDiscardConfirm(false);
      onClose();
    } finally {
      setIsDiscarding(false);
    }
  }, [challenge, discardChallenge, onClose]);

  if (!challenge) return null;

  const progressPercent =
    challenge.targetCount > 0
      ? Math.round((challenge.progress / challenge.targetCount) * 100)
      : 0;

  const timeRemaining = getTimeRemaining(challenge.expiresAt);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${formatSlot(challenge.slot)} Challenge`}
    >
      <div className="space-y-5">
        {/* Slot and Time Remaining Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant={getSlotVariant(challenge.slot)} size="md">
            {formatSlot(challenge.slot)}
          </Badge>
          {timeRemaining && (
            <span className="inline-flex items-center gap-1 text-sm text-zinc-400">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              {timeRemaining}
            </span>
          )}
        </div>

        {/* Objective Section */}
        <Card variant="elevated" padding="sm">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-yellow-500" aria-hidden="true" />
              Objective
            </h3>
            <p className="text-white text-base">
              {formatObjective(challenge.objective)}
            </p>
            <p className="text-zinc-400 text-sm">
              Complete {challenge.targetCount}{' '}
              {challenge.objective === 'complete_deployments' && 'deployment(s)'}
              {challenge.objective === 'win_rounds' && 'round win(s)'}
              {challenge.objective === 'survive_rounds' && 'round survival(s)'}
              {challenge.objective === 'get_kills' && 'kill(s)'}
            </p>
          </div>
        </Card>

        {/* Restrictions Section */}
        {(challenge.role || challenge.restriction) && (
          <Card variant="elevated" padding="sm">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" aria-hidden="true" />
                Restrictions
              </h3>
              <ul className="space-y-1.5" aria-label="Challenge restrictions">
                {challenge.role && (
                  <li className="text-zinc-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" aria-hidden="true" />
                    <span>
                      Role: <span className="text-white font-medium">{challenge.role}</span>
                    </span>
                  </li>
                )}
                {challenge.restriction && (
                  <li className="text-zinc-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" aria-hidden="true" />
                    <span>
                      {formatRestrictionKind(challenge.restriction.kind)}:{' '}
                      <span className="text-white font-medium">{challenge.restriction.value}</span>
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </Card>
        )}

        {/* Operator Scope Section */}
        <Card variant="elevated" padding="sm">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Swords className="w-4 h-4 text-orange-400" aria-hidden="true" />
              Operator Scope
            </h3>
            <p className="text-zinc-300 text-sm">
              {formatOperatorScope(challenge.operatorScope)}
            </p>
            {challenge.operatorPool.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {challenge.operatorPool.map((operatorId) => (
                  <Badge key={operatorId} variant="default" size="sm">
                    {operatorId}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Progress Section */}
        <Card variant="elevated" padding="sm">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Progress
            </h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">
                {challenge.progress} / {challenge.targetCount}
              </span>
              <span className="text-zinc-400">{progressPercent}%</span>
            </div>
            <ProgressBar
              value={progressPercent}
              color={progressPercent >= 100 ? 'green' : 'yellow'}
            />
          </div>
        </Card>

        {/* Rewards Section */}
        <Card variant="elevated" padding="sm">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" aria-hidden="true" />
              Rewards on Completion
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                <div>
                  <p className="text-white font-bold text-sm">
                    {challenge.xpReward} XP
                  </p>
                  <p className="text-zinc-500 text-xs">Account XP</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" aria-hidden="true" />
                <div>
                  <p className="text-white font-bold text-sm">
                    {challenge.masteryPointReward} MP
                  </p>
                  <p className="text-zinc-500 text-xs">Mastery Points</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Discard Button */}
        {!challenge.completedAt && (
          <div className="pt-2 border-t border-zinc-700">
            {!showDiscardConfirm ? (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleDiscardClick}
                aria-label={`Discard ${formatSlot(challenge.slot)} challenge`}
              >
                Discard Challenge
              </Button>
            ) : (
              <div
                className="space-y-3"
                role="alertdialog"
                aria-labelledby="discard-confirm-title"
                aria-describedby="discard-confirm-desc"
              >
                <p
                  id="discard-confirm-title"
                  className="text-sm font-bold text-red-400"
                >
                  Discard this challenge?
                </p>
                <p
                  id="discard-confirm-desc"
                  className="text-xs text-zinc-400"
                >
                  You will not receive any rewards for this challenge. 
                  {challenge.slot === 'mission'
                    ? ' You can re-activate this mission later.'
                    : ' A new challenge will be generated at the next refresh.'}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDiscardConfirm}
                    loading={isDiscarding}
                    aria-label="Confirm discard"
                  >
                    Confirm Discard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscardCancel}
                    disabled={isDiscarding}
                    aria-label="Cancel discard"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
