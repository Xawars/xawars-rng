import type { MasteryTier } from '../components/mastery/MasteryRow';

/** Input data for one side of the comparison */
export interface RivalryOperatorData {
  operatorId: string;
  operatorName: string;
  operatorSide: 'attacker' | 'defender';
  kills: number;
  deaths: number;
  deployments: number;
  tier: MasteryTier;
  totalDeploymentsAllOperators: number; // for pick rate computation
}

/** The advantage determination for a single stat */
export type Advantage = 'left' | 'right' | 'tie';

/** A single stat comparison result */
export interface StatCardResult {
  metric: RivalryMetric;
  label: string;
  leftValue: number | null;   // null = no data
  rightValue: number | null;
  leftDisplay: string;        // formatted for display
  rightDisplay: string;
  advantage: Advantage;
}

/** The set of comparable metrics */
export type RivalryMetric =
  | 'deployments'
  | 'kills'
  | 'deaths'
  | 'kdRatio'
  | 'avgKills'
  | 'pickRate'
  | 'masteryTier';

/** Summary verdict for the overall comparison */
export interface RivalryVerdict {
  type: 'left-leads' | 'right-leads' | 'even' | 'insufficient-data';
  leftWins: number;
  rightWins: number;
  message: string;
}

/** Full comparison result */
export interface ComparisonResult {
  statCards: StatCardResult[];
  verdict: RivalryVerdict;
}

/** Numeric ranking for mastery tiers (higher = better) */
export const TIER_RANK: Record<MasteryTier, number> = {
  unplayed: 0,
  recruit: 1,
  operative: 2,
  veteran: 3,
  elite: 4,
};

/**
 * Compute K/D ratio.
 * - Returns null when kills=0 and deaths=0
 * - Returns kills value when deaths=0 and kills>0 (perfect K/D)
 * - Otherwise returns kills/deaths rounded to 2 decimal places
 */
export function computeKdRatio(kills: number, deaths: number): number | null {
  if (kills === 0 && deaths === 0) return null;
  if (deaths === 0) return kills;
  return Math.round((kills / deaths) * 100) / 100;
}

/**
 * Compute average kills per deployment.
 * - Returns null when deployments=0
 * - Otherwise returns kills/deployments rounded to 1 decimal place
 */
export function computeAvgKills(kills: number, deployments: number): number | null {
  if (deployments === 0) return null;
  return Math.round((kills / deployments) * 10) / 10;
}

/**
 * Compute pick rate as a percentage.
 * - Returns null when totalDeployments=0
 * - Otherwise returns (operatorDeployments/totalDeployments)*100 rounded to 1 decimal place
 */
export function computePickRate(operatorDeployments: number, totalDeployments: number): number | null {
  if (totalDeployments === 0) return null;
  return Math.round((operatorDeployments / totalDeployments) * 1000) / 10;
}

/**
 * Compare two mastery tiers using the TIER_RANK map.
 * Returns 'left' if left tier is higher, 'right' if right is higher, 'tie' if equal.
 */
export function compareTiers(left: MasteryTier, right: MasteryTier): Advantage {
  const leftRank = TIER_RANK[left];
  const rightRank = TIER_RANK[right];
  if (leftRank > rightRank) return 'left';
  if (rightRank > leftRank) return 'right';
  return 'tie';
}

/**
 * Determine advantage for a "higher is better" metric.
 */
function higherIsBetter(leftVal: number | null, rightVal: number | null): Advantage {
  if (leftVal === null && rightVal === null) return 'tie';
  if (leftVal === null) return 'right';
  if (rightVal === null) return 'left';
  if (leftVal > rightVal) return 'left';
  if (rightVal > leftVal) return 'right';
  return 'tie';
}

/**
 * Determine advantage for a "lower is better" metric (deaths).
 */
function lowerIsBetter(leftVal: number | null, rightVal: number | null): Advantage {
  if (leftVal === null && rightVal === null) return 'tie';
  if (leftVal === null) return 'right';
  if (rightVal === null) return 'left';
  if (leftVal < rightVal) return 'left';
  if (rightVal < leftVal) return 'right';
  return 'tie';
}

/**
 * Format a numeric value for display.
 * Returns "—" for null values.
 */
function formatValue(value: number | null, decimals: number = 0, suffix: string = ''): string {
  if (value === null) return '—';
  if (decimals === 0) return `${value}${suffix}`;
  return `${value.toFixed(decimals)}${suffix}`;
}

/**
 * Compute a full head-to-head comparison between two operators.
 * Returns 7 stat cards and an overall verdict.
 */
export function computeComparison(
  left: RivalryOperatorData,
  right: RivalryOperatorData
): ComparisonResult {
  // Compute derived values
  const leftKd = computeKdRatio(left.kills, left.deaths);
  const rightKd = computeKdRatio(right.kills, right.deaths);
  const leftAvgKills = computeAvgKills(left.kills, left.deployments);
  const rightAvgKills = computeAvgKills(right.kills, right.deployments);
  const leftPickRate = computePickRate(left.deployments, left.totalDeploymentsAllOperators);
  const rightPickRate = computePickRate(right.deployments, right.totalDeploymentsAllOperators);

  // For operators with 0 deployments, ratio-based stats display as dash
  const leftKdDisplay = left.deployments === 0 ? '—' : formatValue(leftKd, leftKd !== null && leftKd % 1 === 0 ? 0 : 2);
  const rightKdDisplay = right.deployments === 0 ? '—' : formatValue(rightKd, rightKd !== null && rightKd % 1 === 0 ? 0 : 2);
  const leftAvgKillsDisplay = left.deployments === 0 ? '—' : formatValue(leftAvgKills, 1);
  const rightAvgKillsDisplay = right.deployments === 0 ? '—' : formatValue(rightAvgKills, 1);
  const leftPickRateDisplay = left.deployments === 0 ? '—' : formatValue(leftPickRate, 1, '%');
  const rightPickRateDisplay = right.deployments === 0 ? '—' : formatValue(rightPickRate, 1, '%');

  const statCards: StatCardResult[] = [
    {
      metric: 'deployments',
      label: 'Deployments',
      leftValue: left.deployments,
      rightValue: right.deployments,
      leftDisplay: formatValue(left.deployments),
      rightDisplay: formatValue(right.deployments),
      advantage: higherIsBetter(left.deployments, right.deployments),
    },
    {
      metric: 'kills',
      label: 'Kills',
      leftValue: left.kills,
      rightValue: right.kills,
      leftDisplay: formatValue(left.kills),
      rightDisplay: formatValue(right.kills),
      advantage: higherIsBetter(left.kills, right.kills),
    },
    {
      metric: 'deaths',
      label: 'Deaths',
      leftValue: left.deaths,
      rightValue: right.deaths,
      leftDisplay: formatValue(left.deaths),
      rightDisplay: formatValue(right.deaths),
      advantage: lowerIsBetter(left.deaths, right.deaths),
    },
    {
      metric: 'kdRatio',
      label: 'K/D Ratio',
      leftValue: leftKd,
      rightValue: rightKd,
      leftDisplay: leftKdDisplay,
      rightDisplay: rightKdDisplay,
      advantage: higherIsBetter(leftKd, rightKd),
    },
    {
      metric: 'avgKills',
      label: 'Avg Kills',
      leftValue: leftAvgKills,
      rightValue: rightAvgKills,
      leftDisplay: leftAvgKillsDisplay,
      rightDisplay: rightAvgKillsDisplay,
      advantage: higherIsBetter(leftAvgKills, rightAvgKills),
    },
    {
      metric: 'pickRate',
      label: 'Pick Rate',
      leftValue: leftPickRate,
      rightValue: rightPickRate,
      leftDisplay: leftPickRateDisplay,
      rightDisplay: rightPickRateDisplay,
      advantage: higherIsBetter(leftPickRate, rightPickRate),
    },
    {
      metric: 'masteryTier',
      label: 'Mastery Tier',
      leftValue: TIER_RANK[left.tier],
      rightValue: TIER_RANK[right.tier],
      leftDisplay: left.tier.charAt(0).toUpperCase() + left.tier.slice(1),
      rightDisplay: right.tier.charAt(0).toUpperCase() + right.tier.slice(1),
      advantage: compareTiers(left.tier, right.tier),
    },
  ];

  // Compute verdict
  const verdict = computeVerdict(left, right, statCards);

  return { statCards, verdict };
}

/**
 * Compute the overall verdict from stat card results.
 */
function computeVerdict(
  left: RivalryOperatorData,
  right: RivalryOperatorData,
  statCards: StatCardResult[]
): RivalryVerdict {
  // Insufficient data if either operator has 0 deployments
  if (left.deployments === 0 || right.deployments === 0) {
    return {
      type: 'insufficient-data',
      leftWins: 0,
      rightWins: 0,
      message: 'Not enough data',
    };
  }

  const leftWins = statCards.filter((c) => c.advantage === 'left').length;
  const rightWins = statCards.filter((c) => c.advantage === 'right').length;

  if (leftWins > rightWins) {
    return {
      type: 'left-leads',
      leftWins,
      rightWins,
      message: `${left.operatorName} leads ${leftWins}-${rightWins}`,
    };
  }

  if (rightWins > leftWins) {
    return {
      type: 'right-leads',
      leftWins,
      rightWins,
      message: `${right.operatorName} leads ${rightWins}-${leftWins}`,
    };
  }

  return {
    type: 'even',
    leftWins,
    rightWins,
    message: 'Dead even',
  };
}
