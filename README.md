# XA Wars RNG

A tactical operator roulette for Rainbow Six Siege. Randomize operators, loadouts, match types, and more — track your mastery stats over time and level up your versatility.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)

## Features

- **Operator Roulette** — Roll a random operator with full loadout (primary, secondary, gadget), match type, platform, and target kills
- **Side Filtering** — Lock rolls to Attackers, Defenders, or both
- **Operator Mastery** — Track deployments, K/D, avg kills, and pick rate per operator with tier progression (Recruit → Operative → Veteran → Elite)
- **Deployment History** — Persistent log of all rolls with stats
- **Map Advisor** — AI-powered map strategy suggestions
- **Content Creator Tools** — Generate thumbnails, export animations, and get AI content ideas for Siege videos
- **Operator Stats & Cards** — Detailed stat breakdowns and shareable operator cards
- **Onboarding Flow** — Guided first-time experience with progressive tips
- **Authentication** — Supabase auth with OAuth support and guest mode
- **Sound Effects** — Audio feedback for rolls and interactions (toggleable)
- **Responsive Design** — Desktop sidebar layout with full mobile support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Icons | Lucide React, r6operators |
| Auth & Data | Supabase |
| AI | Configurable provider (OpenAI, etc.) |
| Testing | Vitest, Testing Library, fast-check |
| Export | html-to-image |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (for auth and data persistence)

### Setup

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd xawars-rng
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Run the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests (single run) |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
app/
├── components/
│   ├── account/       # User profile, callsign, avatar
│   ├── auth/          # Login, OAuth, protected routes
│   ├── mastery/       # Operator mastery tracking & detail modals
│   ├── onboarding/    # Welcome modal, progressive tips
│   └── ui/            # Reusable UI primitives (Button, Card, Modal, etc.)
├── context/           # Auth, Data, Sound providers
├── data/              # Operator definitions, types
├── hooks/             # Custom hooks (audio, stats, persistence)
├── lib/               # AI client, providers
├── login/             # Login page
└── page.tsx           # Main roulette page
```

## License

Private project.
