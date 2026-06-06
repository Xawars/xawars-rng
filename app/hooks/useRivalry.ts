'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useData } from '../context/DataContext';
import { computeComparison } from '../lib/comparison-engine';
import type { ComparisonResult, RivalryOperatorData } from '../lib/comparison-engine';
import type { MasteryTier } from '../components/mastery/MasteryRow';
import type { Operator } from '../data/types';

export interface UseRivalryReturn {
  leftOperator: Operator | null;
  rightOperator: Operator | null;
  setLeftOperator: (op: Operator | null) => void;
  setRightOperator: (op: Operator | null) => void;
  comparison: ComparisonResult | null;
  validationError: string | null;
  isExporting: boolean;
  exportImage: () => Promise<void>;
  comparisonRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Compute mastery tier from deployments and K/D ratio.
 * Mirrors the logic in MasteryGrid.
 */
function computeTier(deployments: number, kd: number | null): MasteryTier {
  if (deployments === 0) return 'unplayed';
  if (deployments >= 25 && kd !== null && kd >= 1.0) return 'elite';
  if (deployments >= 10) return 'veteran';
  if (deployments >= 3) return 'operative';
  return 'recruit';
}

/**
 * Custom hook that manages the operator rivalry comparison state.
 * Connects the pure ComparisonEngine to DataContext and handles image export.
 */
export function useRivalry(prefilledOperator?: Operator | null): UseRivalryReturn {
  const { operatorStats } = useData();

  const [leftOperator, setLeftOperator] = useState<Operator | null>(prefilledOperator ?? null);
  const [rightOperator, setRightOperator] = useState<Operator | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const comparisonRef = useRef<HTMLDivElement | null>(null);

  // Same-operator validation
  const validationError = useMemo(() => {
    if (
      leftOperator &&
      rightOperator &&
      leftOperator.id === rightOperator.id
    ) {
      return 'Select two different operators to compare';
    }
    return null;
  }, [leftOperator, rightOperator]);

  // Compute total deployments across all operators
  const totalDeployments = useMemo(() => {
    return Object.values(operatorStats).reduce((sum, s) => sum + s.deployments, 0);
  }, [operatorStats]);

  // Build RivalryOperatorData from an Operator and the stats map
  const buildOperatorData = useCallback(
    (operator: Operator): RivalryOperatorData => {
      const stats = operatorStats[operator.id];

      if (!stats) {
        // Missing operator data — treat as zero-deployment operator
        return {
          operatorId: operator.id,
          operatorName: operator.name,
          operatorSide: operator.side,
          kills: 0,
          deaths: 0,
          deployments: 0,
          tier: 'unplayed',
          totalDeploymentsAllOperators: totalDeployments,
        };
      }

      const { kills, deaths, deployments } = stats;
      const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : null;
      const tier = computeTier(deployments, kd);

      return {
        operatorId: operator.id,
        operatorName: operator.name,
        operatorSide: operator.side,
        kills,
        deaths,
        deployments,
        tier,
        totalDeploymentsAllOperators: totalDeployments,
      };
    },
    [operatorStats, totalDeployments]
  );

  // Compute comparison result when both slots are populated with different operators
  const comparison = useMemo<ComparisonResult | null>(() => {
    if (!leftOperator || !rightOperator) return null;
    if (leftOperator.id === rightOperator.id) return null;

    const leftData = buildOperatorData(leftOperator);
    const rightData = buildOperatorData(rightOperator);

    return computeComparison(leftData, rightData);
  }, [leftOperator, rightOperator, buildOperatorData]);

  // Image export using html-to-image
  const exportImage = useCallback(async () => {
    const node = comparisonRef.current;
    if (!node) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: '#09090b',
      });

      // Try native share API first, fallback to download
      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'xawars-rivalry.png', { type: 'image/png' });
        await navigator.share({ files: [file] });
      } else {
        const link = document.createElement('a');
        link.download = 'xawars-rivalry.png';
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Export failed', err);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    leftOperator,
    rightOperator,
    setLeftOperator,
    setRightOperator,
    comparison,
    validationError,
    isExporting,
    exportImage,
    comparisonRef,
  };
}
