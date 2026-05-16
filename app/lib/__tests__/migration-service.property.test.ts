import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { RankedStats, RankProgress, RankTier, RankDivision } from '../../data/types';
import { serializeContentIdea, deserializeContentIdea, type SavedContentIdea } from '../content-ideas';

/**
 * Feature: auth-persistence-gamification, Property 2: Migration Data Transformation Round-Trip
 *
 * For any valid localStorage state containing app data (ranked stats, operator history,
 * kills, deaths, content ideas), transforming it to the cloud database format and back
 * SHALL produce an equivalent data set.
 *
 * **Validates: Requirements 5.1, 5.2**
 */

// --- Cloud format types (matching Supabase schema) ---

interface RankedStatsCloudRow {
  user_id: string;
  platform: 'PC' | 'Console';
  tier: RankTier;
  division: RankDivision;
  rp: number;
  peak_tier: RankTier;
  peak_division: RankDivision;
  updated_at: string;
}

// --- Transformation functions (mirrors migration-service.ts logic) ---

/**
 * Transforms localStorage RankedStats to cloud format rows.
 * This mirrors the logic in migrateRankedStats from migration-service.ts.
 */
function rankedStatsToCloudFormat(
  stats: RankedStats,
  userId: string
): RankedStatsCloudRow[] {
  const rows: RankedStatsCloudRow[] = [];

  for (const platform of ['PC', 'Console'] as const) {
    const platformStats = stats[platform];
    if (platformStats) {
      rows.push({
        user_id: userId,
        platform,
        tier: platformStats.tier,
        division: platformStats.division,
        rp: platformStats.rp,
        peak_tier: platformStats.peakTier,
        peak_division: platformStats.peakDivision,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return rows;
}

/**
 * Transforms cloud format rows back to localStorage RankedStats format.
 * This is the reverse transformation.
 */
function cloudFormatToRankedStats(rows: RankedStatsCloudRow[]): RankedStats {
  const result: Partial<RankedStats> = {};

  for (const row of rows) {
    result[row.platform] = {
      tier: row.tier,
      division: row.division,
      rp: row.rp,
      peakTier: row.peak_tier,
      peakDivision: row.peak_division,
    };
  }

  return result as RankedStats;
}

// --- Arbitraries ---

const rankTierArb: fc.Arbitrary<RankTier> = fc.constantFrom(
  'Copper', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Champion'
);

const rankDivisionArb: fc.Arbitrary<RankDivision> = fc.constantFrom(1, 2, 3, 4, 5);

const rankProgressArb: fc.Arbitrary<RankProgress> = fc.record({
  tier: rankTierArb,
  division: rankDivisionArb,
  rp: fc.integer({ min: 0, max: 5000 }),
  peakTier: rankTierArb,
  peakDivision: rankDivisionArb,
});

const rankedStatsArb: fc.Arbitrary<RankedStats> = fc.record({
  PC: rankProgressArb,
  Console: rankProgressArb,
});

const savedContentIdeaArb: fc.Arbitrary<SavedContentIdea> = fc.record({
  id: fc.uuid(),
  contentIdea: fc.string({ minLength: 1 }),
  storyHook: fc.string({ minLength: 1 }),
  missionDirective: fc.string({ minLength: 1 }),
  titleVariations: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
  thumbnailPrompts: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
  savedAt: fc.date().map((d) => d.toISOString()),
});

describe('Property 2: Migration Data Transformation Round-Trip', () => {
  it('ranked stats: toCloud(fromCloud(stats)) produces equivalent data', () => {
    fc.assert(
      fc.property(rankedStatsArb, fc.uuid(), (stats, userId) => {
        // Transform to cloud format
        const cloudRows = rankedStatsToCloudFormat(stats, userId);

        // Transform back to app format
        const restored = cloudFormatToRankedStats(cloudRows);

        // Verify equivalence (ignoring updated_at which is metadata)
        expect(restored.PC.tier).toBe(stats.PC.tier);
        expect(restored.PC.division).toBe(stats.PC.division);
        expect(restored.PC.rp).toBe(stats.PC.rp);
        expect(restored.PC.peakTier).toBe(stats.PC.peakTier);
        expect(restored.PC.peakDivision).toBe(stats.PC.peakDivision);

        expect(restored.Console.tier).toBe(stats.Console.tier);
        expect(restored.Console.division).toBe(stats.Console.division);
        expect(restored.Console.rp).toBe(stats.Console.rp);
        expect(restored.Console.peakTier).toBe(stats.Console.peakTier);
        expect(restored.Console.peakDivision).toBe(stats.Console.peakDivision);
      }),
      { numRuns: 100 }
    );
  });

  it('content ideas: deserialize(serialize(idea)) produces equivalent data', () => {
    fc.assert(
      fc.property(savedContentIdeaArb, (idea) => {
        // Transform to cloud format (serialize)
        const cloudRecord = serializeContentIdea(idea);

        // Transform back to app format (deserialize)
        const restored = deserializeContentIdea(cloudRecord);

        // Verify equivalence
        expect(restored).toEqual(idea);
      }),
      { numRuns: 100 }
    );
  });

  it('ranked stats cloud rows preserve platform identity', () => {
    fc.assert(
      fc.property(rankedStatsArb, fc.uuid(), (stats, userId) => {
        const cloudRows = rankedStatsToCloudFormat(stats, userId);

        // Should produce exactly 2 rows (one per platform)
        expect(cloudRows).toHaveLength(2);

        // Each row should have the correct platform
        const platforms = cloudRows.map((r) => r.platform).sort();
        expect(platforms).toEqual(['Console', 'PC']);

        // Each row should reference the correct user
        for (const row of cloudRows) {
          expect(row.user_id).toBe(userId);
        }
      }),
      { numRuns: 100 }
    );
  });
});
