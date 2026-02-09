# Xawars RNG - Feature Specifications

This document provides detailed requirements, user stories, and technical implementation notes for all pending features.

---

## v0.4 - Session History (The "Recap" Update)

### Overview
Allows users and viewers to see a running log of the current session's rolls. Essential for verifying runs and story continuity.

### Requirements
- **Display**: A vertical list component below the main operator card.
- **Capacity**: Show the last 5 rolls. Older rolls fade out or are removed.
- **Data Point**: Each entry must show: Operator Icon, Name, Primary Weapon, Gadget.
- **State**: Clears when "Reset Run" is clicked.
- **Animation**: New entries slide in from the top.

### Technical Implementation
- **State**: `const [history, setHistory] = useState<HistoryItem[]>([])` in `page.tsx`.
- **Action**: In `handleRoll`, `setHistory(prev => [newResult, ...prev].slice(0, 5))`.
- **Component**: Create `Components/HistoryList.tsx`.

---

## v0.5 - Audio Feedback (The "Immersion" Update)

### Overview
Sound effects to give weight to actions, critical for the "show" aspect of the content.

### Requirements
- **Roll Sound**: A high-tech "cycling" or "data processing" sound that plays while the randomizer is spinning (approx 400ms).
- **Reveal Sound**: A distinct "Lock In" sound when the operator is selected.
  - **Variant**: If the operator is an "Elite" or 3-speed (optional logic), play a "Legendary" variant.
- **Stat Interaction**:
  - **Kill**: Satisfying "Click" or "Hitmarker" sound.
  - **Death**: "Flatline" or "Error" tone.
  - **Goal Reached (100 Kills)**: "Objective Complete" fanfare.
- **Controls**: A Mute Button in the UI (User Preference).

### Technical Implementation
- **Library**: `use-sound` or native HTML5 `Audio()` API.
- **Assets**: Need royalty-free SFX (Sci-fi UI pack).
- **Management**: Global `SoundContext` to manage volume/mute state.

---

## v0.6 - Persistence & Safety (The "Reliability" Update)

### Overview
Prevents accidental data loss during a long recording session (e.g., accidental browser refresh).

### Requirements
- **Auto-Save**: State (`kills`, `deaths`, `currentOperator`, `history`) saves to local storage on every change.
- **Auto-Load**: On app load, check for an active run. If found, restore state.
- **Hard Reset**: The existing "Reset Run" button must clear this storage.

### Technical Implementation
- **Storage**: `localStorage.setItem('xawars_run', JSON.stringify(state))`.
- **Hook**: Custom `usePersistedState` hook to wrap the existing state variables.

---

## v0.7 - Content Creator Tools (The "Social" Update)

### Overview
Features specifically designed to help create thumbnails and video descriptions.

### Requirements
- **"Copy Summary" Button**: Copy a text block to clipboard:
  > Xawars RNG Run #42
  > Final Score: 100 Kills / 14 Deaths
  > MVPs: Sledge (14), Ash (12)
- **Streamer Mode**:
  - Adds a solid Green/Blue background setting for OBS Chroma Keying.
  - Hides non-essential UI (Reset button, Footer) to just show the Operator Card.
- **Thumbnail Generator**:
  - Render a high-res image of the current Operator Card + Stats to a `.png` download.

### Technical Implementation
- **Clipboard**: `navigator.clipboard.writeText()`.
- **Image Gen**: `html2canvas` or `satori` to capture the DOM element as an image.

---

## v0.8 - Strat Roulette (The "Variety" Update)

### Overview
Optional "mini-challenges" for each round to spice up gameplay.

### Requirements
- **Toggle**: "Enable Strat Roulette" checkbox.
- **Logic**: When rolling an operator, also roll a random `Strat` from a JSON list.
- **Display**: A "Mission Directive" banner on the Operator Card.
- **Examples**:
  - "Pistol Primary": Use your secondary weapon only.
  - "No Intel": Do not use drones or cams.
  - "Rush": Must enter building within 15 seconds.

### Technical Implementation
- **Data**: New `strats.ts` file.
- **UI**: New text field component within `OperatorDisplay`.

---

## v1.0 - The Platform (The "SaaS" Update)

### Overview
Transition from a local tool to a cloud-connected platform with user accounts.

### 1. Authentication
- **Provider**: Google & Discord (via Supabase Auth).
- **User Object**: `id`, `username`, `avatar_url`, `created_at`.

### 2. Database Schema (PostgreSQL)
- **`profiles`**: User data.
- **`runs`**:
  - `id` (UUID)
  - `user_id` (FK)
  - `kills` (int)
  - `deaths` (int)
  - `duration` (interval)
  - `operators_used` (jsonb)
  - `completed` (boolean)
- **`achievements`**:
  - `id`
  - `name`
  - `criteria` (jsonb)

### 3. Gamification / Progression
- **Operator Mastery**:
  - Track `kills_with_operator` in a separate table.
  - Award "Mastery Levels" (Bronze, Silver, Gold, Diamond) based on kills.
  - Display Mastery Badge on the Operator Card when rolled ("You are a Diamond Sledge").
- **Battle Pass (Concept)**:
  - Monthly "seasons" with global kill counters.
  - Unlocks custom UI themes (e.g., "Black Ice" theme for the app).
