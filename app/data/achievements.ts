export type AchievementCategory = 'deployment' | 'kills' | 'rank' | 'content' | 'streak';

export interface AchievementCondition {
  type: 'threshold';
  metric: string;
  value: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  xpReward: number;
  condition: AchievementCondition;
  unlockedAt: string | null;
}

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Deployment milestones
  { id: 'deploy_10', title: 'Rookie Roller', description: 'Deploy 10 operators', category: 'deployment', xpReward: 50, condition: { type: 'threshold', metric: 'total_deployments', value: 10 }, unlockedAt: null },
  { id: 'deploy_50', title: 'Seasoned Spinner', description: 'Deploy 50 operators', category: 'deployment', xpReward: 100, condition: { type: 'threshold', metric: 'total_deployments', value: 50 }, unlockedAt: null },
  { id: 'deploy_100', title: 'Deployment Veteran', description: 'Deploy 100 operators', category: 'deployment', xpReward: 200, condition: { type: 'threshold', metric: 'total_deployments', value: 100 }, unlockedAt: null },

  // Kill milestones
  { id: 'kills_100', title: 'Century Slayer', description: 'Reach 100 total kills', category: 'kills', xpReward: 75, condition: { type: 'threshold', metric: 'total_kills', value: 100 }, unlockedAt: null },
  { id: 'kills_500', title: 'Half-K Hunter', description: 'Reach 500 total kills', category: 'kills', xpReward: 150, condition: { type: 'threshold', metric: 'total_kills', value: 500 }, unlockedAt: null },
  { id: 'kills_1000', title: 'Thousand Eliminations', description: 'Reach 1000 total kills', category: 'kills', xpReward: 300, condition: { type: 'threshold', metric: 'total_kills', value: 1000 }, unlockedAt: null },

  // Rank milestones
  { id: 'rank_gold', title: 'Gold Standard', description: 'Reach Gold rank', category: 'rank', xpReward: 100, condition: { type: 'threshold', metric: 'rank_tier', value: 3 }, unlockedAt: null },
  { id: 'rank_diamond', title: 'Diamond Hands', description: 'Reach Diamond rank', category: 'rank', xpReward: 200, condition: { type: 'threshold', metric: 'rank_tier', value: 6 }, unlockedAt: null },
  { id: 'rank_champion', title: "Champion's Crown", description: 'Reach Champion rank', category: 'rank', xpReward: 500, condition: { type: 'threshold', metric: 'rank_tier', value: 7 }, unlockedAt: null },

  // Content milestones
  { id: 'content_10', title: 'Idea Machine', description: 'Generate 10 content ideas', category: 'content', xpReward: 50, condition: { type: 'threshold', metric: 'total_content_ideas', value: 10 }, unlockedAt: null },
  { id: 'content_25', title: 'Creative Flow', description: 'Generate 25 content ideas', category: 'content', xpReward: 100, condition: { type: 'threshold', metric: 'total_content_ideas', value: 25 }, unlockedAt: null },
  { id: 'content_50', title: 'Content Factory', description: 'Generate 50 content ideas', category: 'content', xpReward: 200, condition: { type: 'threshold', metric: 'total_content_ideas', value: 50 }, unlockedAt: null },

  // Streak milestones
  { id: 'streak_3', title: 'Three-Peat', description: 'Maintain a 3-day streak', category: 'streak', xpReward: 30, condition: { type: 'threshold', metric: 'current_streak', value: 3 }, unlockedAt: null },
  { id: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7-day streak', category: 'streak', xpReward: 75, condition: { type: 'threshold', metric: 'current_streak', value: 7 }, unlockedAt: null },
  { id: 'streak_30', title: 'Monthly Dedication', description: 'Maintain a 30-day streak', category: 'streak', xpReward: 250, condition: { type: 'threshold', metric: 'current_streak', value: 30 }, unlockedAt: null },
];
