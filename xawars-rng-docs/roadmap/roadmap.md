# XAWARS RNG Roadmap

## Vision

XAWARS RNG starts as a Rainbow Six Siege operator randomizer and progression tracker, then evolves into a complete learning and mastery platform for competitive players.

The long-term goal is to help players improve through:

* Operator Mastery
* Statistics & Analytics
* Lessons
* Quizzes
* Strategies
* Learning Paths
* Performance Tracking
* Competitive Improvement

---

# Roadmap Overview

| Sprint   | Goal                              |
| -------- | --------------------------------- |
| Sprint 1 | Foundation & Core Progression     |
| Sprint 2 | Learning System                   |
| Sprint 3 | Quiz & Assessment System          |
| Sprint 4 | Mastery Paths                     |
| Sprint 5 | Advanced Intelligence & Analytics |

---

# Sprint 1 — Foundation & Core Progression

## Goal

Build the core gameplay loop.

Users should be able to:

* Create an account
* Browse operators
* Deploy operators
* Track statistics
* Earn XP
* Unlock achievements
* Progress through mastery tiers

## Features

### Authentication

* Sign Up
* Sign In
* Sign Out
* Session Persistence

### Profiles

* Callsign
* Avatar
* Platform
* Rank

### Operators

* Operator Browser
* Operator Details
* Weapons
* Abilities
* Basic Metadata

### Deployments

* Create Deployment
* Deployment History
* Match Type Tracking

### Statistics

* Kills
* Deaths
* K/D Ratio
* Deployments

### Gamification

* XP System
* Streak Tracking

### Operator Mastery

* Unplayed
* Recruit
* Operative
* Veteran
* Elite

### Achievements

* Rookie Roller
* First Blood
* Operator Specialist

## Success Criteria

A user can:

1. Sign in.
2. Browse operators.
3. Deploy an operator.
4. Record kills and deaths.
5. Gain XP.
6. Unlock achievements.
7. Increase mastery.
8. View statistics.

---

# Sprint 1.1 — Infrastructure

## Goal

Create the technical foundation.

### Tasks

* Create Supabase project
* Configure environments
* Configure authentication
* Configure RLS
* Create profiles table
* Create initial migration

### Deliverables

* Working authentication
* Database connection
* User profiles

---

# Sprint 1.2 — Operators & Game Data

## Goal

Introduce operator data.

### Tasks

* Create operators table
* Create weapons table
* Create operator_weapons table
* Seed all operators
* Seed all weapons

### Deliverables

* Operator Browser
* Operator Details
* Seeded game data

---

# Sprint 1.3 — Deployments & Statistics

## Goal

Track gameplay activity.

### Tasks

* Create deployments table
* Create operator_stats table
* Create deployment workflow
* Update statistics automatically

### Deliverables

* Deployment creation
* Deployment history
* Operator statistics

---

# Sprint 1.4 — XP, Achievements & Mastery

## Goal

Create progression systems.

### Tasks

* Create gamification table
* Create achievement system
* Create user_operator_mastery
* Calculate XP
* Calculate mastery tiers

### Deliverables

* XP progression
* Achievements
* Mastery system

---

# Sprint 2 — Learning System

## Goal

Transform XAWARS RNG from a tracker into a learning platform.

## Features

### Concepts

Examples:

* Roaming
* Anchoring
* Droning
* Vertical Play
* Hard Breach Denial

### Lessons

* Lesson Library
* Lesson Details
* Lesson Sections
* Progress Tracking

### Lesson Relationships

Lessons can be associated with:

* Operators
* Maps
* Sites
* Weapons
* Concepts

## Success Criteria

A user can:

* Discover lessons
* Complete lessons
* Track lesson progress

---

# Sprint 3 — Quiz & Assessment System

## Goal

Measure player understanding.

## Features

### Quizzes

* Multiple Choice
* True/False
* Scenario-Based Questions

### Quiz Attempts

* Score Tracking
* Pass/Fail
* Attempt History

### Learning Analytics

* Average Score
* Completion Rate
* Weak Areas

## Success Criteria

A user can:

* Complete quizzes
* View results
* Track performance

---

# Sprint 4 — Mastery Paths

## Goal

Create structured learning journeys.

## Features

### Mastery Paths

Examples:

#### Mute Mastery

* Lesson
* Quiz
* Strategy
* Checkpoint

#### Anchoring Fundamentals

* Smoke
* Maestro
* Echo

### Path Progress

* Locked Nodes
* Available Nodes
* Completed Nodes

### Branching Learning

Support:

* Linear Paths
* Skill Trees

## Success Criteria

A user can:

* Follow a learning path
* Unlock content
* Progress through mastery tracks

---

# Sprint 5 — Advanced Intelligence & Analytics

## Goal

Become a complete improvement platform.

## Features

### Seasonal Stats

* Pick Rate
* Win Rate
* Ban Rate
* Meta Trends

### Operator Synergies

Examples:

* Mute + Mozzie
* Bandit + Kaid

### Operator Counters

Examples:

* Thatcher → Bandit
* IQ → Valkyrie

### Recommendations

* Recommended Operators
* Recommended Maps
* Recommended Lessons

### Search

* Full-Text Search
* Tag-Based Filtering

### Advanced Analytics

* Operator Performance
* Map Performance
* Site Performance
* Progress Trends

## Success Criteria

A user can:

* Understand strengths and weaknesses
* Analyze performance
* Follow personalized recommendations

---

# Long-Term Product Vision

XAWARS RNG is not just an operator randomizer.

It evolves into a complete Rainbow Six Siege improvement platform where players can:

* Learn
* Practice
* Measure
* Improve
* Master

Every feature should support one core objective:

> Help players become better Rainbow Six Siege players.
