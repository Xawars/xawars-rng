// Content Vault — Template-based infinite content idea generator
// Produces unique R6 Siege content ideas by combining randomized components
// without any AI API dependency.

import { ContentIdea } from './openai';
import { operators } from '../data/operators';
import { MAPS } from '../data/maps';
import { ATTACKER_ROLES, DEFENDER_ROLES } from '../data/roles';

// --- Utility ---

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: readonly T[] | T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Data Pools ---

const MAP_NAMES = MAPS.map((m) => m.name);

const ATTACKERS = operators.filter((op) => op.side === 'attacker');
const DEFENDERS = operators.filter((op) => op.side === 'defender');

const CONTENT_FORMATS = [
  'guide',
  'tier list',
  'challenge',
  'tips & tricks',
  'ranked push',
  'clutch compilation',
  'operator breakdown',
  'loadout showcase',
  'strategy deep-dive',
  'myth busting',
  '1v5 attempt',
  'no-gadget challenge',
  'speedrun strats',
  'solo queue survival',
  'duo synergy',
] as const;

const ANGLES = [
  'is secretly overpowered',
  'nobody talks about',
  'will get you banned for being too good',
  'changed my ranked life',
  'the pros don\'t want you to know',
  'is the most underrated play',
  'makes enemies rage quit',
  'is the hardest counter in the game',
  'breaks the meta wide open',
  'is a hidden gem this season',
  'will carry you to Diamond',
  'is being slept on hard',
  'just got way better',
  'is the ultimate solo queue pick',
  'dominates at every rank',
] as const;

const HOOKS = [
  'I spent 100 hours testing this so you don\'t have to.',
  'This is the play that got me from Gold to Plat in one session.',
  'Everyone told me this was a throw pick. They were wrong.',
  'What if I told you the meta has been lying to you?',
  'I found something that changes everything about how you play this map.',
  'This is the strat that made a Champion player spectate me.',
  'After 2000 hours, I finally discovered the real way to play this.',
  'The moment I tried this, my win rate jumped 20%.',
  'Nobody in ranked expects this. That\'s exactly why it works.',
  'I tested every single option. Here\'s the one that actually matters.',
  'This is the difference between a good player and a great one.',
  'I was hardstuck for months until I figured this out.',
  'The community is sleeping on this and I\'m about to wake everyone up.',
  'This one trick separates Plat players from Diamond players.',
  'I\'ve been gatekeeping this for too long. Here it is.',
] as const;

const DIRECTIVES = [
  'Drop a comment with YOUR go-to operator for this strat.',
  'Subscribe if you want more ranked-climbing content like this.',
  'Challenge: try this in your next 5 games and tell me your results.',
  'Tag a friend who NEEDS to see this before their next ranked session.',
  'Like if you\'ve been sleeping on this operator too.',
  'Comment your rank — I bet this works at every level.',
  'Save this for your next session. You\'ll thank me later.',
  'Follow for daily R6 strats that actually work in ranked.',
  'Share this with your stack before tonight\'s session.',
  'Hit subscribe — I drop strats like this every week.',
  'Comment "W" if you\'re trying this tonight.',
  'Bet you can\'t get a 4K with this setup. Prove me wrong.',
  'What\'s your win rate on this map? Drop it below.',
  'Duet/stitch this with your results. I want to see the clips.',
  'Turn on notifications — the next video is even crazier.',
] as const;

const THUMBNAIL_STYLES = [
  'Close-up of {op} operator icon with glowing {color} outline, shocked face emoji overlay, bold text "{text}"',
  'Split screen: {op} on left looking dominant, enemy team wiped on right, red "X" marks, text "{text}"',
  '{op} silhouette against {map} background, neon arrows pointing at key position, text "{text}"',
  'Before/after rank badge (Gold → Diamond) with {op} icon centered, sparkle effects, text "{text}"',
  'Top-down map layout of {map} with red circles on key spots, {op} icon in corner, text "{text}"',
  '{op} operator art with fire/explosion effects, kill feed overlay showing ace, text "{text}"',
  'Dark background with single spotlight on {op}, stats overlay showing win rate, text "{text}"',
  'Comic-style panel: {op} vs 5 enemies, action lines, bold manga text "{text}"',
  '{map} exterior shot with {op} rappelling, cinematic filter, text "{text}"',
  'Tier list background with {op} circled in S-tier, other ops blurred, text "{text}"',
] as const;

const THUMBNAIL_TEXTS = [
  'BROKEN',
  'FREE ELO',
  'NERF THIS',
  'SECRET META',
  'INSANE',
  'NEVER LOSE',
  'BANNED STRAT?',
  'TOO EASY',
  'GAME OVER',
  'UNSTOPPABLE',
  'NO WAY',
  'THEY QUIT',
  '100% WIN RATE',
  'HIDDEN OP',
  'MUST WATCH',
] as const;

const COLORS = ['red', 'blue', 'gold', 'purple', 'green', 'orange', 'cyan'] as const;

// --- Template Categories ---

interface TemplateContext {
  op: typeof operators[number];
  op2?: typeof operators[number];
  map: string;
  site?: string;
  role: string;
  format: string;
  angle: string;
  gadget: string;
  weapon: string;
}

function buildContext(): TemplateContext {
  const op = pick(operators);
  const op2 = pick(operators.filter((o) => o.id !== op.id));
  const map = pick(MAP_NAMES);
  const mapData = MAPS.find((m) => m.name === map);
  const site = mapData ? pick(mapData.sites).name : undefined;
  const role = pick(op.roles.length > 0 ? op.roles : [...ATTACKER_ROLES, ...DEFENDER_ROLES]);
  const format = pick(CONTENT_FORMATS);
  const angle = pick(ANGLES);
  const gadget = pick(op.gadgets);
  const weapon = pick([...op.primaries, ...op.secondaries]);

  return { op, op2, map, site, role, format, angle, gadget, weapon };
}

// --- Idea Generators (one per content archetype) ---

type IdeaGenerator = (ctx: TemplateContext) => {
  contentIdea: string;
  titleVariations: [string, string, string];
};

const IDEA_GENERATORS: IdeaGenerator[] = [
  // Operator spotlight
  (ctx) => ({
    contentIdea: `Deep-dive into why ${ctx.op.name} as a ${ctx.role} ${ctx.angle}. Cover the best loadout (${ctx.weapon} + ${ctx.gadget}), positioning on ${ctx.map}, and how to maximize impact in ranked.`,
    titleVariations: [
      `${ctx.op.name} ${ctx.angle.toUpperCase()} — ${capitalize(ctx.format)}`,
      `Why ${ctx.op.name} is the BEST ${ctx.role} in ${ctx.map} right now`,
      `${ctx.op.name} ${capitalize(ctx.format)}: The Strat That ${pick(['Pros Use', 'Nobody Knows', 'Changed Everything', 'Wins Every Time'])}`,
    ],
  }),

  // Map strategy
  (ctx) => ({
    contentIdea: `Complete ${ctx.map}${ctx.site ? ` (${ctx.site})` : ''} strategy breakdown using ${ctx.op.name}. Show the angles, rotations, and utility usage that make this site ${pick(['unbreakable', 'a free win', 'impossible to lose', 'the easiest hold'])} when played correctly.`,
    titleVariations: [
      `${ctx.map} ${ctx.site || ''} is FREE with ${ctx.op.name} — Here's How`,
      `The ${ctx.map} Strat That Got Me to ${pick(['Diamond', 'Champion', 'Plat 1', 'Emerald'])}`,
      `STOP Losing ${ctx.map}! ${ctx.op.name} ${ctx.role} ${capitalize(ctx.format)}`,
    ],
  }),

  // Challenge content
  (ctx) => ({
    contentIdea: `${pick(['Only', 'Nothing but', 'Exclusively'])} ${ctx.weapon} challenge with ${ctx.op.name} on ${ctx.map}. ${pick(['No gadget usage allowed', 'Must get at least 3 kills per round', 'Can only play from one position', 'Must clutch or it doesn\'t count'])}. Document the chaos and the clutch moments.`,
    titleVariations: [
      `${ctx.weapon} ONLY ${ctx.op.name} Challenge on ${ctx.map} — ${pick(['Impossible?', 'Too Easy?', 'Never Again', 'Send Help'])}`,
      `I Tried the HARDEST ${ctx.op.name} Challenge and ${pick(['This Happened', 'Lost My Mind', 'It Actually Worked', 'My Team Hated Me'])}`,
      `Can You Win Ranked with ONLY ${ctx.weapon}? (${ctx.op.name} Challenge)`,
    ],
  }),

  // Versus / comparison
  (ctx) => ({
    contentIdea: `${ctx.op.name} vs ${ctx.op2!.name} — which is the better ${ctx.role} pick this season? Compare utility value, fragging potential, and team synergy across multiple maps including ${ctx.map}.`,
    titleVariations: [
      `${ctx.op.name} vs ${ctx.op2!.name}: Who's the REAL ${ctx.role}?`,
      `I Played 50 Games Each — ${ctx.op.name} or ${ctx.op2!.name}? (The Answer Surprised Me)`,
      `${ctx.op.name} vs ${ctx.op2!.name} — One is ${pick(['S-Tier', 'Broken', 'a Must-Pick'])} and One is ${pick(['Trash', 'Overrated', 'a Throw Pick'])}`,
    ],
  }),

  // Tips / educational
  (ctx) => ({
    contentIdea: `${pick(['5', '7', '10'])} ${ctx.op.name} tips that ${pick(['instantly improve your gameplay', 'most players don\'t know', 'separate good from great players', 'will change how you play'])}. Focus on ${ctx.gadget} usage, ${ctx.weapon} recoil control, and positioning on ${ctx.map}.`,
    titleVariations: [
      `${pick(['5', '7', '10'])} ${ctx.op.name} Tips You NEED to Know in ${new Date().getFullYear()}`,
      `${ctx.op.name} Tips That ${pick(['Pros', 'Champions', 'Top Players'])} Use Every Game`,
      `STOP Making These ${ctx.op.name} Mistakes! (${capitalize(ctx.format)})`,
    ],
  }),

  // Loadout / meta
  (ctx) => ({
    contentIdea: `The ultimate ${ctx.op.name} loadout guide for this season. Why ${ctx.weapon} with ${ctx.gadget} is the optimal setup, attachment breakdown, and when to switch based on map (${ctx.map}) and team comp.`,
    titleVariations: [
      `The PERFECT ${ctx.op.name} Loadout — ${ctx.weapon} Setup Guide`,
      `Best ${ctx.op.name} Loadout ${new Date().getFullYear()} — ${pick(['You\'re Using the Wrong One', 'This Changes Everything', 'Pros Run This'])}`,
      `${ctx.op.name} ${ctx.weapon}: The Attachments That ${pick(['Nobody Uses', 'Actually Matter', 'Give You Zero Recoil'])}`,
    ],
  }),

  // Ranked climb / solo queue
  (ctx) => ({
    contentIdea: `How to solo queue with ${ctx.op.name} on ${ctx.map} and consistently win rounds even with uncoordinated teammates. Cover self-sufficient plays, info gathering, and when to take fights vs play for time.`,
    titleVariations: [
      `Solo Queue ${ctx.op.name} on ${ctx.map} — ${pick(['Free Elo', 'Easy Wins', 'Rank Up Fast', 'Never Lose'])}`,
      `How I ${pick(['Climbed to Diamond', 'Escaped Gold', 'Hit Plat', 'Carried'])} Solo Queuing ${ctx.op.name}`,
      `The Solo Queue ${ctx.role} Guide Nobody Asked For (But Everyone Needs)`,
    ],
  }),

  // Clutch / highlight
  (ctx) => ({
    contentIdea: `Clutch compilation and breakdown: ${ctx.op.name} 1vX situations on ${ctx.map}. Analyze decision-making, crosshair placement, and utility usage in high-pressure moments. Show what to do when your team is dead.`,
    titleVariations: [
      `${ctx.op.name} CLUTCH Moments That Shouldn't Be Possible`,
      `1v5 with ${ctx.op.name} on ${ctx.map} — ${pick(['How?!', 'They Reported Me', 'Insane Plays', 'Watch This'])}`,
      `The ${ctx.op.name} Clutch That Made My Enemies ${pick(['Rage Quit', 'Add Me', 'Report Me', 'Spectate'])}`,
    ],
  }),
];

// --- Thumbnail Generator ---

function generateThumbnails(ctx: TemplateContext): [string, string, string] {
  const selected = pickN(THUMBNAIL_STYLES, 3);
  return selected.map((template) =>
    template
      .replace(/\{op\}/g, ctx.op.name)
      .replace(/\{map\}/g, ctx.map)
      .replace(/\{color\}/g, pick(COLORS))
      .replace(/\{text\}/g, pick(THUMBNAIL_TEXTS))
  ) as [string, string, string];
}

// --- Main Export ---

/**
 * Generates a content idea using local templates — no API call needed.
 * Produces a ContentIdea object compatible with the existing modal and history system.
 * Each call produces a unique combination from thousands of possible permutations.
 */
export function generateVaultIdea(): ContentIdea {
  const ctx = buildContext();
  const generator = pick(IDEA_GENERATORS);
  const { contentIdea, titleVariations } = generator(ctx);
  const storyHook = pick(HOOKS);
  const missionDirective = pick(DIRECTIVES);
  const thumbnailPrompts = generateThumbnails(ctx);

  return {
    contentIdea,
    titleVariations,
    storyHook,
    missionDirective,
    thumbnailPrompts,
  };
}
