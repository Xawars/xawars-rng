import { describe, it, expect } from 'vitest';
import {
  computeKdRatio,
  computeAvgKills,
  computePickRate,
  compareTiers,
  computeComparison,
  type RivalryOperatorData,
} from '../comparison-engine';

describe('ComparisonEngine', () => {
  describe('computeKdRatio', () => {
    it('returns null when kills=0 and deaths=0', () => {
      expect(computeKdRatio(0, 0)).toBeNull();
    });

    it('returns kills value when deaths=0 and kills>0 (perfect K/D)', () => {
      expect(computeKdRatio(5, 0)).toBe(5);
    });

    it('returns 0 when kills=0 and deaths>0', () => {
      expect(computeKdRatio(0, 5)).toBe(0);
    });

    it('returns kills/deaths rounded to 2 decimal places', () => {
      expect(computeKdRatio(10, 3)).toBe(3.33);
    });
  });

  describe('computeAvgKills', () => {
    it('returns null when deployments=0', () => {
      expect(computeAvgKills(0, 0)).toBeNull();
    });

    it('returns kills/deployments rounded to 1 decimal place', () => {
      expect(computeAvgKills(10, 4)).toBe(2.5);
    });
  });

  describe('computePickRate', () => {
    it('returns null when totalDeployments=0', () => {
      expect(computePickRate(5, 0)).toBeNull();
    });

    it('returns percentage rounded to 1 decimal place', () => {
      expect(computePickRate(5, 20)).toBe(25.0);
    });
  });

  describe('compareTiers', () => {
    it('returns left when left tier is higher', () => {
      expect(compareTiers('elite', 'unplayed')).toBe('left');
    });

    it('returns tie when tiers are equal', () => {
      expect(compareTiers('recruit', 'recruit')).toBe('tie');
    });

    it('returns right when right tier is higher', () => {
      expect(compareTiers('operative', 'veteran')).toBe('right');
    });
  });

  describe('computeComparison - tie scenario', () => {
    it('returns all advantages as tie and verdict even when stats are identical', () => {
      const operator: RivalryOperatorData = {
        operatorId: 'op-a',
        operatorName: 'Vigil',
        operatorSide: 'defender',
        kills: 20,
        deaths: 10,
        deployments: 15,
        tier: 'operative',
        totalDeploymentsAllOperators: 100,
      };

      const other: RivalryOperatorData = {
        ...operator,
        operatorId: 'op-b',
        operatorName: 'Jager',
      };

      const result = computeComparison(operator, other);

      for (const card of result.statCards) {
        expect(card.advantage).toBe('tie');
      }
      expect(result.verdict.type).toBe('even');
      expect(result.verdict.message).toBe('Dead even');
    });
  });

  describe('computeComparison - concrete known values', () => {
    it('produces expected advantages for two operators with known stats', () => {
      const operatorA: RivalryOperatorData = {
        operatorId: 'op-a',
        operatorName: 'Sledge',
        operatorSide: 'attacker',
        kills: 50,
        deaths: 20,
        deployments: 30,
        tier: 'veteran',
        totalDeploymentsAllOperators: 100,
      };

      const operatorB: RivalryOperatorData = {
        operatorId: 'op-b',
        operatorName: 'Mute',
        operatorSide: 'defender',
        kills: 30,
        deaths: 40,
        deployments: 20,
        tier: 'operative',
        totalDeploymentsAllOperators: 100,
      };

      const result = computeComparison(operatorA, operatorB);

      // Deployments: 30 vs 20 → left
      const deployments = result.statCards.find((c) => c.metric === 'deployments');
      expect(deployments?.advantage).toBe('left');

      // Kills: 50 vs 30 → left
      const kills = result.statCards.find((c) => c.metric === 'kills');
      expect(kills?.advantage).toBe('left');

      // Deaths: 20 vs 40 → left (lower is better)
      const deaths = result.statCards.find((c) => c.metric === 'deaths');
      expect(deaths?.advantage).toBe('left');

      // K/D: 50/20=2.5 vs 30/40=0.75 → left
      const kd = result.statCards.find((c) => c.metric === 'kdRatio');
      expect(kd?.leftValue).toBe(2.5);
      expect(kd?.rightValue).toBe(0.75);
      expect(kd?.advantage).toBe('left');

      // Avg kills: 50/30=1.7 vs 30/20=1.5 → left
      const avgKills = result.statCards.find((c) => c.metric === 'avgKills');
      expect(avgKills?.leftValue).toBe(1.7);
      expect(avgKills?.rightValue).toBe(1.5);
      expect(avgKills?.advantage).toBe('left');

      // Pick rate: 30/100=30.0% vs 20/100=20.0% → left
      const pickRate = result.statCards.find((c) => c.metric === 'pickRate');
      expect(pickRate?.leftValue).toBe(30.0);
      expect(pickRate?.rightValue).toBe(20.0);
      expect(pickRate?.advantage).toBe('left');

      // Mastery tier: veteran(3) vs operative(2) → left
      const tier = result.statCards.find((c) => c.metric === 'masteryTier');
      expect(tier?.advantage).toBe('left');

      // Verdict: Sledge leads 7-0
      expect(result.verdict.type).toBe('left-leads');
      expect(result.verdict.leftWins).toBe(7);
      expect(result.verdict.rightWins).toBe(0);
      expect(result.verdict.message).toBe('Sledge leads 7-0');
    });
  });
});
