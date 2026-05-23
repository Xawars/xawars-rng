# Requirements Document

## Introduction

The Operator Mastery MVP is the first major module of the Xawars ecosystem. It evolves the existing random operator selector into a structured progression loop that gives players a reason to come back daily and weekly. The random operator roll remains the central experience, but it is wrapped in a gamified challenge layer: role-based assignments, objective-based challenges, restrictions, operator-specific missions, and a mastery progression that produces meaningful (non-cosmetic) rewards.

This MVP intentionally builds on top of the existing `auth-persistence-gamification` spec rather than duplicating it. That spec already provides:
- Account-level XP and Level with the formula `floor(totalXP / 100) + 1`
- Daily streak tracking
- A generic Achievement system (deployment, kills, rank, content, streak milestones)
- Cloud persistence via Supabase with an offline sync queue
- A guest/localStorage fallback when no session exists

The Operator Mastery MVP introduces three new layers on top of that foundation:
1. **Challenge Engine** — generates randomized, role/objective/restriction-based challenges that wrap the operator roll
2. **Mastery Progression** — per-operator mastery tiers that track skill growth on a specific operator over time
3. **Mission, Badge, and Streak Surface** — operator-specific missions, mastery badges, and a Mastery dashboard surface that lets users see and act on their progression

The MVP is scoped to validate gamification engagement before the premium Siege Advisor layer is built. It is free for all authenticated users, with a guest fallback that previews challenges but does not persist progression. Cosmetic-only rewards are explicitly out of scope; rewards must reflect actual commitment or skill development.

## Scope

### In Scope (MVP)

- A Challenge Engine that generates randomized challenges combining a role, objective, restriction, and target operator (or operator pool)
- Active challenge slot management (one daily challenge, one weekly challenge, plus on-demand operator-specific missions)
- Per-operator Mastery Tiers (Bronze → Silver → Gold → Platinum → Diamond) driven by Mastery Points earned through play
- Operator-specific Missions tied to a single operator that grant Mastery Points for that operator
- Mastery Badges awarded when an operator reaches a new tier
- Challenge-completion XP that flows into the existing account-level XP/Level system
- A Mastery dashboard that shows active challenges, per-operator mastery progress, and unlocked mastery badges
- A guest preview mode that lets unauthenticated users see one example challenge but does not persist progression

### Out of Scope (MVP)

- The landing page and three-module hub (separate spec)
- Map Advisor changes (already partially built, separate spec)
- Siege Advisor (deferred per product vision)
- Cosmetic-only rewards (skins, banners, profile frames)
- Social features (leaderboards, sharing, comparing mastery with friends)
- Seasonal resets or season passes
- Server-authoritative anti-cheat validation beyond what the existing gamification engine provides
- New ranked-tracking, kill/death, or content-generation behavior beyond reading existing values

## Glossary

- **Mastery_System**: The overall module that wraps the operator roll in a structured challenge and progression loop. Composed of the Challenge_Engine, Mastery_Engine, and Mastery_Dashboard.
- **Challenge_Engine**: The component responsible for generating, assigning, tracking, and completing Challenges.
- **Mastery_Engine**: The component responsible for awarding Mastery_Points, computing Mastery_Tiers, and unlocking Mastery_Badges per operator.
- **Mastery_Dashboard**: The UI surface that displays active Challenges, per-operator Mastery progression, and unlocked Mastery_Badges.
- **Operator_Roller**: The existing random operator selector that produces a Deployment when the user accepts.
- **Deployment**: An accepted operator roll, persisted by the existing DataContext as a deployment record. The Deployment is the primary signal the Mastery_System uses to attribute progress.
- **Match_Result**: A user-reported outcome of a Deployment. For MVP, recognized values are `win`, `loss`, and `survived_round`. The user reports the Match_Result by tapping a result control on the active Deployment card; a Deployment without a reported Match_Result counts as `incomplete` and does not advance win-based or survival-based Challenges.
- **Challenge**: A structured task with a Role, an Objective, an optional Restriction, an Operator_Scope, a Target_Count, a Slot, an XP_Reward, and a Mastery_Point_Reward.
- **Daily_Challenge**: A Challenge occupying the `daily` Slot. Exactly one Daily_Challenge is active per user at any time. Refreshes on the user's local calendar day boundary.
- **Weekly_Challenge**: A Challenge occupying the `weekly` Slot. Exactly one Weekly_Challenge is active per user at any time. Refreshes every 7 calendar days from when the user first activated the weekly slot.
- **Operator_Mission**: A Challenge occupying the `mission` Slot, scoped to a single specific operator. Up to 3 Operator_Missions can be active concurrently.
- **Slot**: The category of a Challenge. One of: `daily`, `weekly`, `mission`.
- **Role**: An attacker or defender role taken from the existing role catalog (Hard Breacher, Soft Breacher, Entry Fragger, Support, Intel / Recon, Flank Watch, Anchor, Roamer, Lurker, Intel Denier, Anti-Breach, Trap Operator, Area Denial, Intel / Camera, Shield, Flex). A Challenge may be Role-scoped or Role-agnostic.
- **Objective**: The completion condition of a Challenge. One of: `complete_deployments`, `win_rounds`, `survive_rounds`, `get_kills`. The Objective is always paired with a Target_Count.
- **Restriction**: An optional constraint on a Challenge that narrows valid Deployments. One of: `gadget_only` (must use a specific gadget from the operator's loadout), `playstyle` (must be marked with a specific role at deploy time), `loadout_limit` (must use a specific primary or secondary). A Challenge has zero or one Restriction.
- **Operator_Scope**: The operator constraint of a Challenge. One of: `any`, `random_pool` (Challenge_Engine selects N operators at generation time and the user must use one of them), `specific_operator` (Operator_Mission only).
- **Target_Count**: The number of qualifying Deployments, wins, survivals, or kills required to complete the Challenge. An integer between 1 and 50.
- **Mastery_Point**: A point awarded by the Mastery_Engine to a specific operator when the user completes a qualifying action with that operator. Mastery_Points are operator-scoped and never decrease.
- **Mastery_Tier**: A per-operator progression tier derived from accumulated Mastery_Points for that operator. Tiers, in ascending order: `Bronze` (0 points), `Silver` (100 points), `Gold` (300 points), `Platinum` (600 points), `Diamond` (1000 points).
- **Mastery_Badge**: A badge awarded to a user-operator pair when the operator first reaches a new Mastery_Tier. Mastery_Badges are persisted with the operator id, the tier, and the unlock timestamp.
- **XP_Reward**: An amount of account-level XP awarded by the Challenge_Engine when a Challenge is completed. XP flows into the existing `awardXP` pipeline of the auth-persistence-gamification spec.
- **Mastery_Point_Reward**: An amount of Mastery_Points awarded by the Mastery_Engine when a Challenge is completed or when a Deployment with a reported Match_Result occurs.
- **Challenge_Progress**: The current count of qualifying events toward a Challenge's Target_Count, persisted per active Challenge.
- **Active_Challenge**: A Challenge that has been generated for the user, has not yet been completed, and has not yet expired.
- **Completed_Challenge**: A Challenge whose Challenge_Progress has reached its Target_Count and whose XP_Reward and Mastery_Point_Reward have been awarded.
- **Expired_Challenge**: A Daily_Challenge or Weekly_Challenge that was not completed before its slot refreshed. Expired Challenges are recorded but award no rewards.
- **Mastery_Dashboard**: A new top-level UI surface within the existing app that lists Active_Challenges, per-operator Mastery progress, and unlocked Mastery_Badges. Reachable from the main hub.
- **Guest**: An unauthenticated visitor, as defined by the existing auth-persistence-gamification spec.
- **Canonical_XP_Formula**: The single source of truth for computing a Challenge's `xp_reward` from its `slot` and `target_count`. Defined as `xp_reward = target_count × 10` when `slot` is `daily`, `xp_reward = target_count × 15` when `slot` is `weekly`, and `xp_reward = target_count × 12` when `slot` is `mission`. The mission multiplier is intentionally set between the daily and weekly multipliers because Operator_Missions span multiple sessions but are scoped to a single operator, so they sit between a single-day and a full-week commitment.
- **Administrative_Exception**: A Challenge explicitly flagged with a non-null `xp_override` numeric value and a non-null `xp_override_reason` string. An Administrative_Exception is set only through admin tooling or a database migration path; the normal Challenge_Engine generation flow never produces one. While set, the Challenge's effective `xp_reward` is the value of `xp_override` rather than the value computed from the Canonical_XP_Formula.

## Requirements

### Requirement 1: Challenge Generation

**User Story:** As a player, I want to receive randomized challenges that combine a role, objective, and restriction with the operator roll, so that random selection becomes a structured progression loop instead of just entertainment.

#### Acceptance Criteria

1. WHEN a User has no Active_Challenge in the `daily` Slot and the user's current local calendar day differs from the Daily_Challenge's last refresh date, THE Challenge_Engine SHALL generate exactly one new Daily_Challenge with Slot `daily`, an Objective, a Target_Count between 1 and 10, an Operator_Scope, an optional Restriction, an XP_Reward, and a Mastery_Point_Reward.
2. WHEN a User has no Active_Challenge in the `weekly` Slot and at least 7 calendar days have elapsed since the user's last Weekly_Challenge refresh, THE Challenge_Engine SHALL generate exactly one new Weekly_Challenge with Slot `weekly`, an Objective, a Target_Count between 5 and 50, an Operator_Scope, an optional Restriction, an XP_Reward, and a Mastery_Point_Reward.
3. WHEN the Challenge_Engine generates a Challenge with Operator_Scope `random_pool`, THE Challenge_Engine SHALL select between 1 and 5 specific operator ids at generation time and persist them with the Challenge.
4. WHEN the Challenge_Engine generates a Challenge with a Restriction of `gadget_only`, THE Challenge_Engine SHALL select a gadget value that exists in the gadget list of every operator in the Challenge's Operator_Scope.
5. THE Challenge_Engine SHALL ensure that every generated Challenge has an XP_Reward computed from the Canonical_XP_Formula defined in Requirement 16, where the multiplier is 10 for Daily_Challenges, 15 for Weekly_Challenges, and 12 for Operator_Missions.
6. THE Challenge_Engine SHALL ensure that every generated Challenge has a Mastery_Point_Reward equal to Target_Count multiplied by 5.
7. IF the Challenge_Engine cannot generate a Challenge that satisfies all selected constraints (for example, no operator in the chosen role has the chosen gadget), THEN THE Challenge_Engine SHALL retry generation up to 5 times with progressively relaxed constraints (drop Restriction first, then Role) and SHALL surface a non-blocking error toast if no valid Challenge can be generated.
8. WHEN a Challenge is generated, THE Challenge_Engine SHALL persist the Challenge to the Database_Service for authenticated users and to localStorage for Guests, including its id, slot, role, objective, target_count, restriction, operator_scope, operator_pool, xp_reward, mastery_point_reward, generated_at, and progress fields.

### Requirement 2: Active Challenge Display on the Roll Surface

**User Story:** As a player using the Operator_Roller, I want to see my Active_Challenges on the roll surface so that I know what challenge I'm working on while I roll.

#### Acceptance Criteria

1. WHEN a User opens the Operator_Roller view, THE Mastery_System SHALL display a Challenge banner showing the Active Daily_Challenge title, role, objective, restriction (if any), Target_Count, and current Challenge_Progress.
2. WHEN a User has an Active Weekly_Challenge, THE Mastery_System SHALL display a second Challenge banner showing the Weekly_Challenge with the same fields as the daily banner.
3. WHEN a User has at least one Active Operator_Mission, THE Mastery_System SHALL display a collapsed indicator showing the count of active Operator_Missions, with a tap target that expands to show their details.
4. WHEN the User taps a Challenge banner, THE Mastery_System SHALL open a Challenge detail view that displays the full Challenge description, all eligibility rules, the operator pool (if any), and a button to discard the Challenge (Daily_Challenge and Weekly_Challenge only).
5. WHILE a Daily_Challenge or Weekly_Challenge is active, THE Mastery_System SHALL display the time remaining until the slot refreshes, accurate to the minute.

### Requirement 3: Challenge Eligibility for a Deployment

**User Story:** As a player rolling an operator, I want my deployment to count toward my active challenges only when it actually matches the challenge's rules, so that progression feels honest and meaningful.

#### Acceptance Criteria

1. WHEN a User accepts a Deployment, THE Challenge_Engine SHALL evaluate every Active_Challenge against the Deployment and SHALL classify each Active_Challenge as `eligible` or `ineligible` for that Deployment.
2. WHEN an Active_Challenge has Operator_Scope `any`, THE Challenge_Engine SHALL classify the Deployment as eligible with respect to operator scope.
3. WHEN an Active_Challenge has Operator_Scope `random_pool`, THE Challenge_Engine SHALL classify the Deployment as eligible with respect to operator scope only when the Deployment's operator id is contained in the Challenge's persisted operator pool.
4. WHEN an Active_Challenge has Operator_Scope `specific_operator`, THE Challenge_Engine SHALL classify the Deployment as eligible with respect to operator scope only when the Deployment's operator id equals the Challenge's specific operator id.
5. WHEN an Active_Challenge specifies a Role, THE Challenge_Engine SHALL classify the Deployment as eligible with respect to role only when the Deployment's role field equals the Challenge's Role.
6. WHEN an Active_Challenge specifies a `gadget_only` Restriction, THE Challenge_Engine SHALL classify the Deployment as eligible with respect to restriction only when the Deployment's loadout gadget equals the Challenge's restriction value.
7. WHEN an Active_Challenge specifies a `loadout_limit` Restriction, THE Challenge_Engine SHALL classify the Deployment as eligible with respect to restriction only when the Deployment's loadout primary or loadout secondary equals the Challenge's restriction value.
8. THE Challenge_Engine SHALL classify a Deployment as fully eligible for a Challenge only when the Deployment is eligible with respect to operator scope, role, and restriction simultaneously.

### Requirement 4: Challenge Progress Updates

**User Story:** As a player, I want my challenge progress to update automatically as I deploy and report results, so that I do not need to track progression manually.

#### Acceptance Criteria

1. WHEN a User accepts a Deployment that is fully eligible for an Active_Challenge with Objective `complete_deployments`, THE Challenge_Engine SHALL increment that Challenge's Challenge_Progress by 1.
2. WHEN a User reports a Match_Result of `win` against a Deployment that is fully eligible for an Active_Challenge with Objective `win_rounds`, THE Challenge_Engine SHALL increment that Challenge's Challenge_Progress by 1.
3. WHEN a User reports a Match_Result of `survived_round` against a Deployment that is fully eligible for an Active_Challenge with Objective `survive_rounds`, THE Challenge_Engine SHALL increment that Challenge's Challenge_Progress by 1.
4. WHEN a User increments the per-operator kill counter for an operator on a Deployment that is fully eligible for an Active_Challenge with Objective `get_kills`, THE Challenge_Engine SHALL increment that Challenge's Challenge_Progress by 1 per kill increment, capped at the Challenge's Target_Count.
5. THE Challenge_Engine SHALL ensure that Challenge_Progress for any Active_Challenge never exceeds its Target_Count.
6. THE Challenge_Engine SHALL ensure that Challenge_Progress never decreases for an Active_Challenge except when a kill increment is reverted (decrement) on the same Deployment, in which case Challenge_Progress for an Objective `get_kills` Challenge SHALL decrement by 1, never below 0.

### Requirement 5: Challenge Completion and Reward Award

**User Story:** As a player, I want to receive XP and Mastery Points the moment I complete a challenge, so that the loop produces an immediate sense of reward.

#### Acceptance Criteria

1. WHEN an Active_Challenge's Challenge_Progress first reaches its Target_Count, THE Challenge_Engine SHALL mark the Challenge as a Completed_Challenge with a completed_at timestamp.
2. WHEN a Challenge becomes a Completed_Challenge, THE Challenge_Engine SHALL invoke the existing account XP pipeline to award the Challenge's XP_Reward.
3. WHEN a Challenge becomes a Completed_Challenge, THE Mastery_Engine SHALL award the Challenge's Mastery_Point_Reward to every operator that was used in any Deployment that contributed to the Challenge_Progress.
4. WHEN a Challenge becomes a Completed_Challenge, THE Mastery_System SHALL display a non-blocking completion toast showing the Challenge title, the XP_Reward, and the Mastery_Point_Reward.
5. THE Challenge_Engine SHALL ensure that the XP_Reward and Mastery_Point_Reward of a single Challenge are awarded exactly once, even if the completion event is processed multiple times due to retries or sync replays.
6. WHEN a Daily_Challenge or Weekly_Challenge is marked as a Completed_Challenge, THE Challenge_Engine SHALL keep its slot empty until the next refresh boundary defined in Requirement 1.

### Requirement 6: Operator-Specific Missions

**User Story:** As a player who likes a specific operator, I want missions tied to that operator so that I can focus my play on operators I care about and earn Mastery Points faster on them.

#### Acceptance Criteria

1. WHEN a User opens the Mastery_Dashboard for a specific operator, THE Mastery_System SHALL display up to 3 available Operator_Missions for that operator, each with Slot `mission`, Operator_Scope `specific_operator`, an Objective, a Target_Count, an XP_Reward, and a Mastery_Point_Reward.
2. WHEN a User taps an available Operator_Mission, THE Challenge_Engine SHALL move that mission into the user's Active_Challenge set if fewer than 3 Operator_Missions are currently active.
3. IF a User taps an available Operator_Mission while 3 Operator_Missions are already active, THEN THE Mastery_System SHALL display a message stating that the Operator_Mission limit is reached and SHALL NOT activate the new mission.
4. THE Challenge_Engine SHALL ensure that an Operator_Mission's Operator_Scope is always `specific_operator` and SHALL never refresh on a calendar boundary; an Operator_Mission remains active until completed or explicitly discarded.
5. WHEN a User explicitly discards an Active Operator_Mission, THE Challenge_Engine SHALL remove that Operator_Mission from the Active_Challenge set without awarding any rewards and SHALL allow that mission to be re-activated later.
6. THE Challenge_Engine SHALL compute every Operator_Mission's XP_Reward from the Canonical_XP_Formula defined in Requirement 16, using the `mission` slot multiplier of 12.

### Requirement 7: Per-Operator Mastery Points and Tiers

**User Story:** As a player who plays the same operators over multiple sessions, I want each operator to have its own mastery progression, so that I can see which operators I have invested in.

#### Acceptance Criteria

1. WHEN a User accepts a Deployment with an operator and reports a Match_Result of `win`, THE Mastery_Engine SHALL award 10 Mastery_Points to that operator.
2. WHEN a User accepts a Deployment with an operator and reports a Match_Result of `survived_round`, THE Mastery_Engine SHALL award 5 Mastery_Points to that operator.
3. WHEN a User completes a kill target for an operator, THE Mastery_Engine SHALL award 15 Mastery_Points to that operator.
4. THE Mastery_Engine SHALL compute Mastery_Tier from per-operator Mastery_Points according to the thresholds: Bronze [0, 100), Silver [100, 300), Gold [300, 600), Platinum [600, 1000), Diamond [1000, infinity).
5. THE Mastery_Engine SHALL ensure per-operator Mastery_Points only ever increase and never decrease.
6. THE Mastery_Engine SHALL persist per-operator Mastery_Points and the most recent Mastery_Tier per operator in the Database_Service for authenticated users and in localStorage for Guests.
7. WHEN a User views the Mastery_Dashboard, THE Mastery_Engine SHALL display each operator's current Mastery_Points, current Mastery_Tier, and Mastery_Points needed to reach the next Mastery_Tier.

### Requirement 8: Mastery Badges

**User Story:** As a player, I want a badge when one of my operators reaches a new mastery tier, so that I have a visible token of my mastery.

#### Acceptance Criteria

1. WHEN an operator's Mastery_Points cross a Mastery_Tier threshold for the first time for a User, THE Mastery_Engine SHALL unlock a Mastery_Badge with the operator id, the new Mastery_Tier, and the unlock timestamp.
2. WHEN a Mastery_Badge is unlocked, THE Mastery_System SHALL display a non-blocking badge-unlock toast showing the operator name and the new tier.
3. THE Mastery_Engine SHALL persist all unlocked Mastery_Badges in the Database_Service for authenticated users and in localStorage for Guests.
4. WHEN a User views the Mastery_Dashboard, THE Mastery_Engine SHALL display all unlocked Mastery_Badges grouped by operator with the unlock timestamp visible.
5. THE Mastery_Engine SHALL ensure that for any user-operator-tier triple, at most one Mastery_Badge is ever unlocked, even if Mastery_Points cross the threshold multiple times after data sync replays.

### Requirement 9: Mastery Streaks Within the Challenge Loop

**User Story:** As a player, I want to be rewarded for completing challenges on consecutive days so that I keep coming back daily.

#### Acceptance Criteria

1. WHEN a User completes a Daily_Challenge, THE Mastery_Engine SHALL increment a Mastery_Challenge_Streak counter, distinct from the existing daily-activity streak in the auth-persistence-gamification spec.
2. WHEN a User does not complete a Daily_Challenge before its slot refreshes, THE Mastery_Engine SHALL reset the Mastery_Challenge_Streak counter to zero.
3. WHEN the Mastery_Challenge_Streak counter reaches 3, 7, or 30, THE Mastery_Engine SHALL award a Mastery_Streak_Bonus of 50 XP, 150 XP, or 750 XP respectively, awarded exactly once per streak length per continuous run.
4. THE Mastery_Engine SHALL persist Mastery_Challenge_Streak, longest Mastery_Challenge_Streak, and last completed daily date in the Database_Service for authenticated users and in localStorage for Guests.

### Requirement 10: Mastery Dashboard

**User Story:** As a player, I want a dedicated Mastery dashboard so that I can review my active challenges, my per-operator progression, and my unlocked badges in one place.

#### Acceptance Criteria

1. WHEN a User navigates to the Mastery_Dashboard, THE Mastery_System SHALL display three sections: Active Challenges, Operator Mastery, and Mastery Badges.
2. THE Mastery_Dashboard SHALL display in the Active Challenges section the current Daily_Challenge, the current Weekly_Challenge, and all Active Operator_Missions with their progress and time-remaining (where applicable).
3. THE Mastery_Dashboard SHALL display in the Operator Mastery section every operator the User has deployed at least once, sorted by Mastery_Points descending, with operator name, current Mastery_Tier, current Mastery_Points, and Mastery_Points needed for the next Mastery_Tier.
4. THE Mastery_Dashboard SHALL display in the Mastery Badges section every unlocked Mastery_Badge grouped by operator, with the badge tier and unlock timestamp.
5. WHEN a User taps an operator in the Operator Mastery section, THE Mastery_Dashboard SHALL navigate to a per-operator detail view that shows the operator's Mastery_Points history, available Operator_Missions, and unlocked Mastery_Badges for that operator.

### Requirement 11: Match Result Reporting

**User Story:** As a player, I want to report whether I won, lost, or survived a round after a deployment so that win-based and survival-based challenges can progress.

#### Acceptance Criteria

1. WHEN a User has an accepted Deployment with no Match_Result reported yet, THE Mastery_System SHALL display a result control on the active Deployment surface offering exactly three options: `Win`, `Loss`, and `Survived Round`.
2. WHEN a User selects a Match_Result, THE Mastery_System SHALL persist the Match_Result against the Deployment record and SHALL invoke the Challenge_Engine progress evaluation for all Active_Challenges.
3. WHEN a User selects a Match_Result, THE Mastery_Engine SHALL award per-operator Mastery_Points according to Requirement 7.
4. THE Mastery_System SHALL allow a User to change a previously reported Match_Result for the most recent Deployment within 10 minutes of the original report; outside that window, the Match_Result is immutable.
5. IF a User changes a Match_Result within the 10-minute window, THEN THE Mastery_Engine SHALL re-evaluate Challenge_Progress and Mastery_Points so that the user's totals reflect only the final reported Match_Result, never both the previous and the new value.

### Requirement 12: Persistence and Sync of Mastery Data

**User Story:** As a logged-in player, I want my mastery progression to be saved to the cloud, so that I can pick up where I left off on any device.

#### Acceptance Criteria

1. WHEN an authenticated User's mastery state changes (active challenge progress, per-operator Mastery_Points, unlocked Mastery_Badges, Mastery_Challenge_Streak, Match_Result on a Deployment), THE Database_Service SHALL persist the change within 5 seconds via the existing SyncQueue.
2. WHEN an authenticated User logs in on a new device, THE Database_Service SHALL load all Active_Challenges, Completed_Challenges from the last 30 days, per-operator Mastery_Points and Mastery_Tiers, unlocked Mastery_Badges, and Mastery_Challenge_Streak state.
3. WHILE the network connection is unavailable, THE Database_Service SHALL queue mastery changes locally using the existing SyncQueue mechanism.
4. WHEN a Mastery sync conflict occurs for a numeric counter (Mastery_Points, Challenge_Progress), THE Database_Service SHALL resolve the conflict by keeping the larger value (max-merge), since these counters are monotonically non-decreasing.
5. WHEN a Mastery sync conflict occurs for a Match_Result on a Deployment, THE Database_Service SHALL resolve it by keeping the value with the more recent timestamp, consistent with the existing conflict-resolution policy.

### Requirement 13: Guest Preview of Mastery

**User Story:** As a visitor without an account, I want to see what the Mastery system looks like so that I can decide whether to create an account, without my progression being silently lost.

#### Acceptance Criteria

1. WHILE no Session exists, THE Mastery_System SHALL display exactly one example Daily_Challenge generated locally, with a clear label indicating that progress is not saved.
2. WHILE no Session exists, THE Mastery_System SHALL track the example Daily_Challenge's Challenge_Progress in localStorage but SHALL NOT award XP, Mastery_Points, or Mastery_Badges.
3. WHEN a Guest attempts to access the Mastery_Dashboard, the Weekly_Challenge, an Operator_Mission, or any Mastery_Badge view, THE Mastery_System SHALL display a login prompt explaining that progression requires an account.
4. WHEN a Guest signs up or logs in for the first time, THE Mastery_System SHALL discard the locally tracked example Challenge_Progress and SHALL generate fresh Daily and Weekly Challenges as a new authenticated User.

### Requirement 14: Meaningful (Non-Cosmetic) Rewards

**User Story:** As a player, I want my mastery rewards to reflect actual play, not arbitrary clicks, so that the system feels respectful of my time.

#### Acceptance Criteria

1. THE Mastery_Engine SHALL grant Mastery_Points and unlock Mastery_Badges only as a consequence of qualifying gameplay events (Deployments with reported Match_Results, kill-target completions, Challenge completions).
2. THE Mastery_Engine SHALL NOT grant Mastery_Points, Mastery_Badges, or XP for purely passive actions such as opening the Mastery_Dashboard, scrolling, or reloading the page.
3. THE Mastery_Engine SHALL NOT grant any cosmetic-only reward (skins, banners, profile frames) in the MVP.
4. THE Mastery_Engine SHALL ensure that Mastery_Tiers represent at minimum the volume of qualifying play defined in Requirement 7, where Diamond tier requires at least 1000 Mastery_Points on a single operator.

### Requirement 15: Integration With Existing Gamification

**User Story:** As a developer maintaining the Xawars codebase, I want the Operator Mastery MVP to reuse the existing XP, achievement, and streak infrastructure rather than duplicating it, so that gamification stays consistent across the product.

#### Acceptance Criteria

1. THE Mastery_System SHALL award account-level XP exclusively through the existing `awardXP(amount, source)` API of the Gamification_Engine defined in the auth-persistence-gamification spec.
2. THE Mastery_System SHALL extend the XPSource type with the values `challenge_completed` and `mastery_streak_bonus` and SHALL NOT introduce a parallel XP store.
3. THE Mastery_System SHALL reuse the existing daily-activity Streak from the auth-persistence-gamification spec for general daily-use tracking and SHALL only introduce a separate Mastery_Challenge_Streak for daily-challenge completion tracking.
4. THE Mastery_System SHALL store its data in new Supabase tables (`challenges`, `operator_mastery`, `mastery_badges`, `mastery_streak`, `match_results`) and SHALL NOT modify the existing `gamification`, `achievements`, `deployments`, `operator_stats`, `ranked_stats`, or `content_ideas` schemas, except to add a nullable `match_result` column to the `deployments` table.
5. WHEN the existing `awardXP` pipeline already triggers an existing Achievement (deployment, kills, rank, content, streak categories), THE Mastery_System SHALL NOT re-trigger or duplicate that Achievement.

### Requirement 16: Universal XP Reward Formula

**User Story:** As a player, I want every challenge in the system to follow the same XP reward rule regardless of when or how it was created, so that my progression feels consistent and predictable across daily challenges, weekly challenges, operator missions, and any future imported challenges.

The Canonical_XP_Formula is the single source of truth for `xp_reward`. It applies as a system-wide invariant to every Challenge — newly generated, imported through future admin tooling, or pre-existing in the Database_Service — with one explicit escape hatch: an Administrative_Exception that pins a Challenge to a specific `xp_override` value for a documented `xp_override_reason`. When a Challenge is found to deviate from the Canonical_XP_Formula and is not an Administrative_Exception, the Mastery_System auto-corrects the Challenge's `xp_reward` to the canonical value. Auto-correction is preferred over quarantine because it produces deterministic, predictable XP rewards for the player and avoids a class of "stuck" challenges that can never award XP.

#### Acceptance Criteria

1. THE Mastery_System SHALL treat the Canonical_XP_Formula (`xp_reward = target_count × 10` for slot `daily`, `xp_reward = target_count × 15` for slot `weekly`, `xp_reward = target_count × 12` for slot `mission`) as the single source of truth for every Challenge's `xp_reward`.
2. WHEN the Challenge_Engine generates a new Challenge, THE Challenge_Engine SHALL set `xp_reward` to the value computed by the Canonical_XP_Formula for that Challenge's `slot` and `target_count`, and SHALL set both `xp_override` and `xp_override_reason` to null.
3. WHEN a Challenge is imported into the Mastery_System through an admin or migration path, THE Mastery_System SHALL validate the imported Challenge's `xp_reward` against the Canonical_XP_Formula and SHALL classify the Challenge as deviating IF its stored `xp_reward` does not equal the canonical value AND the Challenge does not carry both a non-null `xp_override` and a non-null `xp_override_reason`.
4. WHEN the Mastery_System reads a pre-existing Challenge from the Database_Service, THE Mastery_System SHALL validate the Challenge's `xp_reward` against the Canonical_XP_Formula and SHALL classify the Challenge as deviating IF its stored `xp_reward` does not equal the canonical value AND the Challenge does not carry both a non-null `xp_override` and a non-null `xp_override_reason`.
5. WHEN a Challenge is classified as deviating from the Canonical_XP_Formula and is not an Administrative_Exception, THE Mastery_System SHALL auto-correct the Challenge's `xp_reward` to the value computed by the Canonical_XP_Formula, SHALL set any non-null `xp_override` or `xp_override_reason` field to null when only one of the two is non-null (orphan override), and SHALL persist the corrected values through the Database_Service before the Challenge is used to award XP.
6. WHEN a Challenge carries a non-null `xp_override` that is an integer between 0 and 10000 inclusive AND a non-null `xp_override_reason` that contains between 1 and 500 non-whitespace characters, THE Challenge_Engine SHALL use the value of `xp_override` as the effective XP_Reward when the Challenge is completed and SHALL NOT auto-correct the Challenge's `xp_reward`.
7. THE Mastery_System SHALL accept changes to `xp_override` and `xp_override_reason` only through an admin tooling path or a database migration path, SHALL require both fields to be set together (either both non-null or both null) when accepted, SHALL require `xp_override` to be an integer between 0 and 10000 inclusive when non-null, SHALL require `xp_override_reason` to contain between 1 and 500 non-whitespace characters when non-null, and SHALL NOT expose any UI in the MVP that allows end users or the Challenge_Engine generation flow to set these fields.
8. IF the Challenge_Engine generation flow attempts to set a non-null `xp_override` or `xp_override_reason`, THEN THE Mastery_System SHALL reject the attempt and SHALL log the rejection.
9. IF persisting an auto-corrected `xp_reward` value through the Database_Service fails, THEN THE Mastery_System SHALL NOT award the Challenge's XP_Reward to the User and SHALL surface a non-blocking error indicating that the Challenge's reward is temporarily unavailable until persistence succeeds.
10. IF the admin tooling path or database migration path attempts to set `xp_override` to a non-null value while `xp_override_reason` is null, OR set `xp_override_reason` to a non-null value while `xp_override` is null, OR set `xp_override` to a value outside the integer range 0 to 10000 inclusive, OR set `xp_override_reason` to a string with fewer than 1 or more than 500 non-whitespace characters, THEN THE Mastery_System SHALL reject the change, SHALL leave the Challenge's persisted `xp_override` and `xp_override_reason` fields unchanged, and SHALL log the rejection.

#### Correctness Property (Property-Based Testing)

For every Challenge `C` persisted in the Mastery_System whose `xp_override` is null, the following invariant SHALL hold after the Mastery_System has read or generated `C`:

```
C.xp_reward == canonical_xp_formula(C.slot, C.target_count)
```

where `canonical_xp_formula` is defined as:

```
canonical_xp_formula(slot, target_count) =
    target_count × 10  when slot == "daily"
    target_count × 15  when slot == "weekly"
    target_count × 12  when slot == "mission"
```

This invariant is suitable for property-based testing across randomly generated Challenges (varying `slot`, `target_count`, and the presence or absence of `xp_override`) and SHALL be exercised against both freshly generated Challenges and Challenges loaded from the Database_Service.
