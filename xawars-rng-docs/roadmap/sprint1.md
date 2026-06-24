# Sprint 1 — Foundation & Core Progression System

## Sprint Goal

Build the first playable version of XAWARS RNG.

By the end of this sprint, users should be able to:

* Create an account
* Browse operators
* Deploy operators
* Track statistics
* Gain XP
* Unlock achievements
* Progress through mastery tiers

This sprint focuses on validating the core gameplay loop before introducing lessons, quizzes, strategies, or learning paths.

---

# User Story

As a Rainbow Six Siege player,

I want to deploy random operators, track my performance, earn XP, and progress through mastery levels,

so that I feel motivated to improve and continue using the platform.

---

# Core Gameplay Loop

```text
Browse Operators
        ↓
Deploy Operator
        ↓
Play Match
        ↓
Record Results
        ↓
Gain XP
        ↓
Unlock Achievements
        ↓
Increase Mastery
        ↓
Repeat
```

---

# Sprint Scope

## Included

### Authentication

* Sign Up
* Sign In
* Sign Out
* Session Persistence

### Profiles

* Callsign
* Platform
* Avatar
* Rank

### Operators

* Operator Browser
* Operator Details
* Weapon Information
* Ability Information

### Deployments

* Create Deployment
* View Deployment History

### Statistics

* Deployments
* Kills
* Deaths
* K/D Ratio

### Gamification

* XP
* Streaks

### Achievements

* Achievement Unlocks
* XP Rewards

### Mastery

* Operator XP
* Mastery Tiers
* Progress Tracking

---

# Technical Scope

## Database Tables

### profiles

Stores user information.

```text
id
callsign
avatar_url
current_rank
platform
created_at
updated_at
```

### operators

Stores operator metadata.

```text
id
name
codename
role
organization
country
health
speed
difficulty
ability_name
ability_description
icon_url
portrait_url
```

### weapons

Stores weapon information.

```text
id
name
type
damage
fire_rate
capacity
```

### operator_weapons

Maps operators to weapons.

```text
operator_id
weapon_id
slot
```

### deployments

Stores deployment history.

```text
id
user_id
operator_id
loadout
match_type
target_kills
deployed_at
```

### operator_stats

Stores aggregated operator statistics.

```text
user_id
operator_id
kills
deaths
deployments
updated_at
```

### gamification

Stores progression information.

```text
user_id
total_xp
current_streak
longest_streak
updated_at
```

### achievement_definitions

Stores achievement templates.

```text
id
title
description
xp_reward
condition_metric
condition_value
```

### user_achievements

Stores unlocked achievements.

```text
user_id
achievement_id
unlocked_at
```

### user_operator_mastery

Stores operator progression.

```text
user_id
operator_id
tier
total_xp
gameplay_xp
learning_xp
updated_at
```

---

# Features

## Feature 1 — Authentication

### Description

Allow users to create and manage accounts.

### Tasks

* Configure Supabase Authentication
* Create Sign Up page
* Create Sign In page
* Create Sign Out functionality
* Configure session persistence
* Protect authenticated routes

### Acceptance Criteria

* Users can create accounts
* Users can log in
* Users remain logged in after refresh
* Protected pages require authentication

---

# Feature 2 — User Profiles

### Description

Create a profile for every user.

### Tasks

* Create profiles table
* Auto-create profile after registration
* Create profile settings page
* Allow profile updates

### Acceptance Criteria

* Every user has a profile
* Users can update their profile information

---

# Feature 3 — Operator Browser

### Description

Allow users to browse all available operators.

### Tasks

* Create operators page
* Create operator card component
* Create operator details page
* Display weapons
* Display abilities
* Display mastery information

### Acceptance Criteria

* Users can browse operators
* Users can view operator details

---

# Feature 4 — Deployment System

### Description

Allow users to deploy operators for a match.

### Tasks

* Create deployment form
* Save deployment records
* Display deployment history
* Associate deployment with operator

### Acceptance Criteria

* Users can create deployments
* Deployments are saved successfully
* Deployment history is visible

---

# Feature 5 — Statistics System

### Description

Track player performance per operator.

### Metrics

* Deployments
* Kills
* Deaths
* K/D Ratio

### Tasks

* Create operator statistics service
* Update stats automatically
* Create stats dashboard

### Acceptance Criteria

* Statistics update correctly
* K/D ratio is accurate

---

# Feature 6 — XP System

### Description

Reward users for activity.

### Initial XP Rules

```text
Deployment = 50 XP
Kill = 10 XP
```

### Tasks

* Create XP calculation service
* Update XP automatically
* Display XP in UI

### Acceptance Criteria

* XP increases correctly
* XP persists between sessions

---

# Feature 7 — Achievement System

### Description

Reward milestones and progress.

### Initial Achievements

#### Rookie Roller

```text
Deploy 10 operators
```

#### First Blood

```text
Get 1 kill
```

#### Veteran Operator

```text
Reach Veteran mastery
```

### Tasks

* Create achievement engine
* Detect achievement completion
* Grant rewards

### Acceptance Criteria

* Achievements unlock automatically
* XP rewards are granted

---

# Feature 8 — Operator Mastery System

### Description

Track mastery progression for each operator.

### Mastery Tiers

```text
Unplayed
Recruit
Operative
Veteran
Elite
```

### Initial XP Thresholds

```text
Unplayed = 0 XP
Recruit = 50 XP
Operative = 300 XP
Veteran = 800 XP
Elite = 2000 XP
```

### Tasks

* Create mastery service
* Calculate mastery progression
* Persist mastery state
* Create mastery progress UI

### Acceptance Criteria

* Mastery updates correctly
* Progress is saved
* Users can view mastery progress

---

# UI Pages

## Public

### Landing Page

Purpose:

* Explain the product
* Encourage registration

---

## Authenticated

### Dashboard

Displays:

* Total XP
* Current Streak
* Recent Deployments
* Mastery Progress

### Operators

Displays:

* All operators
* Search
* Filters

### Operator Details

Displays:

* Operator information
* Weapons
* Ability
* Stats
* Mastery

### Deployments

Displays:

* Deployment history
* Deployment creation form

### Profile

Displays:

* User profile
* Rank
* Platform
* Achievements

---

# Deliverables

## Backend

* Supabase project
* Database schema
* Authentication
* RLS policies
* Seed scripts

## Frontend

* Authentication pages
* Dashboard
* Operators page
* Operator details page
* Deployments page
* Profile page

## Data

* Operators seeded
* Weapons seeded
* Achievements seeded

---

# Definition of Done

Sprint 1 is complete when a user can:

1. Create an account.
2. Browse operators.
3. Deploy an operator.
4. Record kills and deaths.
5. Gain XP.
6. Unlock achievements.
7. Increase operator mastery.
8. View statistics.
9. Return later and see all progress persisted.

If all nine actions work successfully, Sprint 1 is considered complete.

---

# Out of Scope

The following features are intentionally excluded from Sprint 1:

* Lessons
* Concepts
* Quizzes
* Quiz Attempts
* Strategies
* Strategy Guides
* Mastery Paths
* Operator Synergies
* Operator Counters
* Seasonal Statistics
* Recommendation Engine
* Search System
* Analytics

These features belong to future sprints.
