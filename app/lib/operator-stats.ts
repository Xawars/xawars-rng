import type { OperatorStatRecord } from '../types/database';

/**
 * Delta object for updating an operator's stats.
 * Each field is optional; only provided fields are applied.
 */
export interface OperatorStatDelta {
  kills?: number;
  deaths?: number;
  incrementDeployments?: boolean;
}

/**
 * Creates a fresh OperatorStatRecord with zero stats.
 */
function createEmptyRecord(
  operatorId: string,
  operatorName: string,
  operatorSide: 'attacker' | 'defender'
): OperatorStatRecord {
  return {
    operatorId,
    operatorName,
    operatorSide,
    kills: 0,
    deaths: 0,
    deployments: 0,
  };
}

/**
 * Updates a single operator's stats in the stats map.
 * If the operator doesn't exist yet, a new entry is created.
 * Returns a new map (does not mutate the input).
 *
 * @param stats - The current operator stats map keyed by operatorId
 * @param operatorId - The unique identifier of the operator
 * @param operatorName - The display name of the operator
 * @param operatorSide - Whether the operator is 'attacker' or 'defender'
 * @param delta - The stat changes to apply (kills, deaths, incrementDeployments)
 * @returns A new stats map with the updated operator entry
 */
export function updateOperatorStat(
  stats: Record<string, OperatorStatRecord>,
  operatorId: string,
  operatorName: string,
  operatorSide: 'attacker' | 'defender',
  delta: OperatorStatDelta
): Record<string, OperatorStatRecord> {
  const existing = stats[operatorId] ?? createEmptyRecord(operatorId, operatorName, operatorSide);

  const updated: OperatorStatRecord = {
    ...existing,
    kills: existing.kills + (delta.kills ?? 0),
    deaths: existing.deaths + (delta.deaths ?? 0),
    deployments: existing.deployments + (delta.incrementDeployments ? 1 : 0),
  };

  return {
    ...stats,
    [operatorId]: updated,
  };
}

/**
 * Retrieves the stats for a specific operator from the stats map.
 * Returns undefined if the operator has no recorded stats.
 *
 * @param stats - The current operator stats map keyed by operatorId
 * @param operatorId - The unique identifier of the operator to look up
 * @returns The operator's stat record, or undefined if not found
 */
export function getOperatorStat(
  stats: Record<string, OperatorStatRecord>,
  operatorId: string
): OperatorStatRecord | undefined {
  return stats[operatorId];
}
