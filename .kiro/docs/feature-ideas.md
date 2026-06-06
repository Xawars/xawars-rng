# Feature Ideas & Improvements

A collection of potential features and enhancements for XAwars RNG, grouped by area.

---

## Mastery System (Finishing What We Started)

- **Full-page Mastery tab** — Add a dedicated tab (next to Roulette / Map Advisor / Content) with a proper grid or table of all operators, sortable by tier, K/D, deployments. Gives the system room to breathe instead of being squeezed in the sidebar.
- **Tier-up animation/notification** — Visual + audio feedback when an operator reaches a new mastery level mid-session.
- **Challenge mode toggle** — Biases rolls toward operators you haven't played or have low mastery on. Encourages roster diversity.

---

## Session & Performance

- **Session summary card** — End-of-session screen showing operators played, total K/D, best performer, worst performer, streak info. Screenshottable/shareable.
- **Win/loss tracking** — Track round outcomes per deployment, not just K/D.
- **Activity heatmap / streak calendar** — Visual representation of your activity and longest deployment streaks over time.

---

## UX Polish

- **Mobile mastery drawer** — The mastery list is currently `hidden lg:`, so mobile users can't access it. Add a collapsible drawer or bottom sheet.
- **Keyboard shortcuts** — R to roll, P to pick, Esc to close modals (partially exists but not for roll/pick).
- **Drag-to-reorder history** — Let users pin or reorder favorite operators in the sidebar.

---

## Social / Content Creator

- **Shareable mastery profile cards** — Generated image showing your top 5 operators with tiers, K/D, and deployment count. Ready to post.
- **Friend leaderboards** — Simple public profile system on Supabase to compare stats between friends.
- **Twitch/OBS overlay mode** — Minimal always-on-top view showing current operator + K/D that streamers can window-capture.

---

## Data & Gamification

- **Achievements** — Beyond what's already stubbed. Examples:
  - "First Blood" — First kill tracked
  - "Flex Player" — 10 unique operators deployed
  - "One Trick" — 50 deploys on a single operator
  - "Untouchable" — Complete a deployment with 0 deaths
- **Weekly challenges** — Rotating goals like "Deploy 3 defenders this week" or "Get a 2.0 K/D in a session".
- **XP breakdown modal** — Show how mastery XP was earned (kills vs deploys vs objectives completed).

---

## Recommended Next Steps (Priority Order)

1. Mobile mastery access (currently invisible on smaller screens)
2. Mastery as a full tab with proper space for data visualization
3. Session summary card (shareable, content-creator friendly)
