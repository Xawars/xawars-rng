import type { DeploymentRecord } from '../types/database';

/**
 * Maximum number of deployment records stored per user.
 */
export const MAX_DEPLOYMENT_HISTORY = 100;

/**
 * Sorts deployment records by deployedAt timestamp in ascending order (oldest first).
 */
export function sortByDeployedAt(records: DeploymentRecord[]): DeploymentRecord[] {
  return [...records].sort(
    (a, b) => new Date(a.deployedAt).getTime() - new Date(b.deployedAt).getTime()
  );
}

/**
 * Enforces the capacity limit on a deployment history array.
 * If the array exceeds maxSize, removes the oldest records (by deployedAt)
 * until the array length equals maxSize.
 *
 * @param history - The current deployment history
 * @param maxSize - Maximum allowed records (defaults to MAX_DEPLOYMENT_HISTORY)
 * @returns A new array trimmed to the capacity limit
 */
export function enforceCapacity(
  history: DeploymentRecord[],
  maxSize: number = MAX_DEPLOYMENT_HISTORY
): DeploymentRecord[] {
  if (history.length <= maxSize) {
    return history;
  }

  const sorted = sortByDeployedAt(history);
  // Keep only the most recent `maxSize` records
  return sorted.slice(sorted.length - maxSize);
}

/**
 * Adds a deployment record to the history, enforcing the 100-record capacity limit.
 * When the history is at capacity (>= 100 records), the oldest record (by deployedAt)
 * is removed before adding the new one.
 *
 * @param history - The current deployment history
 * @param record - The new deployment record to add
 * @returns A new array with the record added and capacity enforced
 */
export function addDeployment(
  history: DeploymentRecord[],
  record: DeploymentRecord
): DeploymentRecord[] {
  const newHistory = [...history, record];
  return enforceCapacity(newHistory, MAX_DEPLOYMENT_HISTORY);
}

/**
 * Finds and returns the oldest deployment record in the history (by deployedAt timestamp).
 * Returns undefined if the history is empty.
 */
export function getOldestDeployment(
  history: DeploymentRecord[]
): DeploymentRecord | undefined {
  if (history.length === 0) return undefined;

  return history.reduce((oldest, current) =>
    new Date(current.deployedAt).getTime() < new Date(oldest.deployedAt).getTime()
      ? current
      : oldest
  );
}

/**
 * Finds and returns the newest deployment record in the history (by deployedAt timestamp).
 * Returns undefined if the history is empty.
 */
export function getNewestDeployment(
  history: DeploymentRecord[]
): DeploymentRecord | undefined {
  if (history.length === 0) return undefined;

  return history.reduce((newest, current) =>
    new Date(current.deployedAt).getTime() > new Date(newest.deployedAt).getTime()
      ? current
      : newest
  );
}
