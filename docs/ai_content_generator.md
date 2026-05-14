# AI Content Generator - Detailed Specification

## Overview

The AI Content Generator is an intelligent tool designed for Rainbow Six Siege content creators who produce content for YouTube, TikTok, and Instagram. This feature generates engaging content ideas, title variations, story hooks, mission directives for viewer engagement, and thumbnail prompt suggestions - all powered by OpenAI's GPT-4o mini model.

The tool solves the common content creator problem of "what should I create next?" by providing AI-generated, game-specific content ideas that are optimized for engagement and algorithm performance across multiple platforms.

---

## 1. User Requirements Summary

The following requirements were explicitly provided by the user:

| Requirement | Specification |
|-------------|---------------|
| Button Placement | Floating in the right bottom corner of the screen |
| API Key Management | Include an input field for users to add their own OpenAI API key |
| Thumbnail Generation | Generate text prompts only now, actual images later (via ChatGPT integration) |
| Title Variations | 3 title options per content generation |

---

## 2. Technical Architecture|

### 2.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| AI Text Generation | OpenAI GPT-4o mini | Best balance of quality and cost; 10x cheaper than GPT-4o |
| API Client | openai Node.js SDK | Official, well-maintained library |
| State Management | React useState + usePersistedState | Same pattern as other features in the app |
| UI Components | Custom components with Lucide icons | Consistent with existing design system |

### 2.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FLOATING GENERATOR BUTTON                        │
│                  (Fixed position: bottom-right)                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CHECK API KEY EXISTS                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
            ┌───────────────┐           ┌───────────────┐
            │ NO API KEY    │           │ YES API KEY   │
            │               │           │               │
            ▼               │           ▼               │
┌─────────────────────┐     │    ┌─────────────────────┐
│  API KEY INPUT      │     │    │  SEND TO OPENAI     │
│  MODAL              │     │    │  API                │
└─────────────────────┘     │    └─────────────────────┘
         │                   │            │
         │                   │            ▼
         │                   │    ┌─────────────────────┐
         └───────────────────┼───▶│  GENERATE CONTENT   │
                            │    └─────────────────────┘
                            │            │
                            ▼            ▼
                 ┌─────────────────────────────┐
                 │   CONTENT GENERATOR MODAL   │
                 │   - Content Idea             │
                 │   - Title Variations (3)     │
                 │   - Story Hook               │
                 │   - Mission Directive       │
                 │   - Thumbnail Prompts (3)   │
                 └─────────────────────────────┘
```

### 2.3 Cost Analysis

Using GPT-4o mini model provides an excellent cost-to-quality ratio:

| Metric | Value |
|--------|-------|
| Input Tokens (per request) | ~400 |
| Output Tokens (per request) | ~600 |
| Total Tokens (per request) | ~1000 |
| Cost per 1M tokens (input) | $0.150 |
| Cost per 1M tokens (output) | $0.600 |
| **Estimated Cost per Generation** | **$0.00015** |

**Cost Scenarios:**

| Usage Level | Generations | Estimated Cost |
|-------------|-------------|----------------|
| Light (10/day) | 3,650/year | $0.55 |
| Medium (50/day) | 18,250/year | $2.74 |
| Heavy (100/day) | 36,500/year | $5.48 |

This makes the feature essentially free for personal use.

---

## 3. Data Types

### 3.1 TypeScript Interfaces

All new types should be added to `app/data/types.ts`:

```typescript
export interface ContentIdea {
  contentIdea: string;
  titleVariations: string[];
  storyHook: string;
  missionDirective: string;
  thumbnailPrompts: string[];
}

export interface ContentGeneratorState {
  isOpen: boolean;
  isGenerating: boolean;
  currentIdea: ContentIdea | null;
  error: string | null;
}

export interface ApiKeyState {
  isValid: boolean;
  isSet: boolean;
  error: string | null;
}
```

### 3.2 Default Values

```typescript
export const DEFAULT_CONTENT_IDEA: ContentIdea = {
  contentIdea: '',
  titleVariations: [],
  storyHook: '',
  missionDirective: '',
  thumbnailPrompts: [],
};

export const DEFAULT_GENERATOR_STATE: ContentGeneratorState = {
  isOpen: false,
  isGenerating: false,
  currentIdea: null,
  error: null,
};
```

---

## 4. User Interface Components

### 4.1 Floating Generator Button

**Location**: Fixed position, bottom-right corner of the viewport

**Technical Specifications:**
- Position: `fixed bottom-6 right-6` (24px from bottom and right edges)
- Z-index: `z-40` (above most content, below modals which use `z-50`)
- Mobile: Consider repositioning to avoid overlap with safe areas

**Visual Design:**
```
┌───────────────────────────────────┐
│  ╭─────────────────────────────╮  │
│  │        🎬 Generate          │  │
│  ╰─────────────────────────────╯  │
└───────────────────────────────────┘
```

**Styling Details:**
- Background: Yellow-500 (`bg-yellow-500`) matching the app's accent color
- Text: Black (`text-black`), font-bold, uppercase
- Icon: Sparkles (lucide-react) or Film icon
- Border-radius: Full rounded (rounded-full) for pill shape
- Padding: px-4 py-3 (16px horizontal, 12px vertical)
- Shadow: Large shadow (`shadow-lg`)
- Hover: Scale up slightly (scale-105), brighter shadow
- Active: Scale down (scale-95)

**Code Example:**
```tsx
<button
  className="fixed bottom-6 right-6 z-40 flex items-center gap-2 
             bg-yellow-500 text-black font-bold uppercase px-4 py-3 
             rounded-full shadow-lg hover:scale-105 active:scale-95 
             transition-transform"
  onClick={() => setIsOpen(true)}
>
  <Sparkles className="w-5 h-5" />
  Generate
</button>
```

### 4.2 API Key Input Modal

This modal appears when the user hasn't set an API key yet, or when the entered key is invalid.

**Trigger Conditions:**
- First time using the feature (no API key in localStorage)
- API key was cleared
- Previous API key failed validation

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    🔑  Enter Your OpenAI API Key               │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  sk-                                                          │  │
│  │  (placeholder)                                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Don't have one?                                                │
│  [Get API Key at openai.com] → opens in new tab                 │
│                                                                 │
│  ⚠️ Your API key is stored locally in your browser.            │
│     We recommend clearing it after each session.                │
│                                                                 │
│  ┌─────────────┐    ┌───────────────┐                         │
│  │   Cancel    │    │   Save Key    │                         │
│  └─────────────┘    └───────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Input Validation Rules:**
1. Must start with `sk-`
2. Minimum length: 20 characters (sk- + 17+ characters)
3. Display error message if validation fails

**Persistence:**
- Key: `xawars_openai_api_key`
- Storage: localStorage (via usePersistedState hook)

**Code Flow:**
```typescript
const handleSaveKey = (key: string) => {
  if (!key.startsWith('sk-')) {
    setError('Invalid API key format. Must start with "sk-"');
    return;
  }
  if (key.length < 20) {
    setError('API key too short');
    return;
  }
  setApiKey(key);
  setIsKeyModalOpen(false);
  // Proceed to generate
};
```

### 4.3 Content Generator Modal

The main modal where all generated content is displayed.

**Modal Dimensions:**
- Desktop: max-w-lg (448px), centered
- Mobile: w-full with padding

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  ✕                      AI Content Generator              [↻]     │
│                         [Generate New]                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📺 CONTENT IDEA                                     [📋 Copy]      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Play ranked with only Year 1 operators for an entire       │   │
│  │  season - can you hit Gold?                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📝 TITLE VARIATIONS                              [📋 Copy All]   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. YEAR 1 ONLY CHALLENGE - Can I reach Gold?              │   │
│  │  2. RESTRICTED ROSTER RANKED RUN (Year 1 Operators Only)   │   │
│  │  3. The ULTIMATE Year 1 Operator Challenge                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  🎬 STORY HOOK                                     [📋 Copy]       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Returning to the roots of Siege - before operators had    │   │
│  │  complex abilities, it was all about aim and game sense.   │   │
│  │  Let's see if that old-school skill still translates to    │   │
│  │  modern ranked play.                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ⚡ MISSION DIRECTIVE (Viewers)                    [📋 Copy]       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Root for the underdogs! Comment which Year 1 operator     │   │
│  │  you'd pick and why.                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  🖼️ THUMBNAIL PROMPTS                            [📋 Copy All]   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [Prompt 1]  [Prompt 2]  [Prompt 3]                        │   │
│  │  (Each button copies individual prompt)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Component Hierarchy:**
```
ContentGeneratorModal
├── Header (title + generate button)
├── ContentIdeaSection
│   ├── Label (📺 CONTENT IDEA)
│   ├── Content Card
│   └── CopyButton
├── TitleVariationsSection
│   ├── Label (📝 TITLE VARIATIONS)
│   ├── Variations List (3 items numbered)
│   └── Copy All Button
├── StoryHookSection
│   ├── Label (🎬 STORY HOOK)
│   ├── Content Card
│   └── CopyButton
├── MissionDirectiveSection
│   ├── Label (⚡ MISSION DIRECTIVE)
│   ├── Content Card (with "(Viewers)" sublabel)
│   └── CopyButton
└── ThumbnailPromptsSection
    ├── Label (🖼️ THUMBNAIL PROMPTS)
    ├── Prompts Grid (3 buttons)
    └── Copy All Button
```

**Copy Button Behavior:**
- Individual copy: Copy single section to clipboard, show "Copied!" toast
- Copy All for titles: Copy all 3 titles as a numbered list
- Copy All for prompts: Copy all 3 prompts as a bullet list
- Visual feedback: Button text changes to "Copied!" for 2 seconds

### 4.4 Loading State

While generating content, show a loading indicator:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ✕                      AI Content Generator            [↻]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ╭──────────────────────────╮                     │
│                    │    Generating ideas...  │                     │
│                    │    ████████████░░░░ 80%  │                     │
│                    ╰──────────────────────────╯                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Loading Indicators:**
- Animated spinner or progress bar
- "Generating content ideas..." text
- Disable generate button while loading

### 4.5 Error State

Display errors gracefully:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ✕                      AI Content Generator            [↻]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  ⚠️ Failed to generate content                               │  │
│  │  Error: Invalid API key                                      │  │
│  │  [Try Again]                                                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. API Integration

### 5.1 OpenAI Client Setup

Create a new file `app/lib/openai.ts` to handle all OpenAI API interactions:

```typescript
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function initializeOpenAI(apiKey: string): OpenAI {
  if (!apiKey.startsWith('sk-')) {
    throw new Error('Invalid API key format');
  }
  
  openaiClient = new OpenAI({
    apiKey: apiKey,
  });
  
  return openaiClient;
}

export function getOpenAIClient(): OpenAI | null {
  return openaiClient;
}

export function isOpenAIInitialized(): boolean {
  return openaiClient !== null;
}
```

### 5.2 Content Generation Function

The core function that generates all content in a single API call:

```typescript
import { getOpenAIClient } from './openai';
import { ContentIdea } from '../data/types';

const SYSTEM_PROMPT = `You are a Rainbow Six Siege content strategist specializing in YouTube, TikTok, and Instagram content. 
Generate engaging, clickable, platform-optimized content ideas. 
Your suggestions should be specific, actionable, and entertaining.
Focus on challenges, experiments, and storytelling angles that will resonate with the Siege community.`;

const USER_PROMPT = `Generate a Rainbow Six Siege content idea for YouTube/TikTok/Instagram.

Return ONLY valid JSON (no markdown formatting):
{
  "contentIdea": "A specific, actionable challenge or story concept (1-2 sentences)",
  "titleVariations": ["title1", "title2", "title3"],
  "storyHook": "A compelling narrative hook for the video intro/description (2-3 sentences)",
  "missionDirective": "An engagement prompt for viewers (1 sentence, encourages comments/shares)",
  "thumbnailPrompts": ["detailed prompt for AI image generation 1", "prompt 2", "prompt 3"]
}

Requirements:
- Content idea: Specific, actionable, engaging
- Titles: Mix of styles - at least one clickbait, one educational, one storytelling
- Story hook: Compelling narrative that makes viewers want to watch
- Mission directive: Clear call-to-action for viewer engagement
- Thumbnail prompts: Detailed descriptions suitable for DALL-E/Midjourney - include subject, mood, colors, composition
- Platform optimized: YouTube/TikTok/Instagram friendly
- Rainbow Six Siege specific: Use actual operator names, game mechanics, rank names`;

export async function generateContentIdea(): Promise<ContentIdea> {
  const client = getOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI client not initialized');
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT }
    ],
    temperature: 0.9,
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content generated from API');
  }

  try {
    const parsed = JSON.parse(content) as ContentIdea;
    
    // Validate required fields
    if (!parsed.contentIdea || !parsed.titleVariations || !parsed.storyHook) {
      throw new Error('Invalid response format from API');
    }
    
    return parsed;
  } catch (error) {
    throw new Error('Failed to parse API response');
  }
}
```

### 5.3 Error Handling

| Error Type | Cause | User Message | Action |
|------------|-------|--------------|--------|
| No API Key | localStorage empty | "Please enter your API key" | Show API key modal |
| Invalid Format | Key doesn't start with sk- | "Invalid API key format" | Show error, keep modal open |
| Network Error | API unreachable | "Network error. Check your connection." | Show retry button |
| Rate Limit | Too many requests | "Too many requests. Please wait." | Show wait message |
| Invalid Response | API returned malformed JSON | "Failed to generate content" | Show retry button |
| Empty Response | API returned nothing | "No content generated" | Show retry button |

---

## 6. State Management

### 6.1 Required State Variables

Add to `app/page.tsx` or a custom hook:

```typescript
// API Key State
const [apiKey, setApiKey] = usePersistedState<string>('xawars_openai_api_key', '');
const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

// Generator State
const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
const [isGenerating, setIsGenerating] = useState(false);
const [currentIdea, setCurrentIdea] = useState<ContentIdea | null>(null);
const [generatorError, setGeneratorError] = useState<string | null>(null);
```

### 6.2 Handler Functions

```typescript
const handleOpenGenerator = () => {
  if (!apiKey || !apiKey.startsWith('sk-')) {
    setIsApiKeyModalOpen(true);
    return;
  }
  setIsGeneratorOpen(true);
};

const handleGenerate = async () => {
  setIsGenerating(true);
  setGeneratorError(null);
  
  try {
    // Initialize client if not already done
    if (!isOpenAIInitialized()) {
      initializeOpenAI(apiKey);
    }
    
    const idea = await generateContentIdea();
    setCurrentIdea(idea);
  } catch (error) {
    setGeneratorError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    setIsGenerating(false);
  }
};

const handleSaveApiKey = (key: string) => {
  if (!key.startsWith('sk-')) {
    alert('Invalid API key format. Must start with "sk-"');
    return;
  }
  setApiKey(key);
  setIsApiKeyModalOpen(false);
  // Optionally auto-generate after saving
  handleGenerate();
};

const handleClearApiKey = () => {
  setApiKey('');
  setCurrentIdea(null);
};
```

---

## 7. File Structure

### 7.1 Files to Create

| File Path | Description |
|-----------|-------------|
| `app/components/FloatingGeneratorButton.tsx` | Floating button component |
| `app/components/ContentGeneratorModal.tsx` | Main modal with all content sections |
| `app/components/ApiKeyInputModal.tsx` | API key input modal |
| `app/components/CopyButton.tsx` | Reusable copy button component |
| `app/lib/openai.ts` | OpenAI API client and functions |

### 7.2 Files to Modify

| File Path | Modifications |
|-----------|--------------|
| `app/data/types.ts` | Add ContentIdea, ContentGeneratorState types |
| `app/page.tsx` | Add state, handlers, integrate components |
| `.env.local.example` | Add OPENAI_API_KEY example |

### 7.3 File Contents

#### app/components/FloatingGeneratorButton.tsx

```typescript
'use client';

import { Sparkles } from 'lucide-react';

interface FloatingGeneratorButtonProps {
  onClick: () => void;
}

export function FloatingGeneratorButton({ onClick }: FloatingGeneratorButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 
                 bg-yellow-500 text-black font-bold uppercase px-4 py-3 
                 rounded-full shadow-lg hover:scale-105 hover:shadow-xl 
                 active:scale-95 transition-all"
    >
      <Sparkles className="w-5 h-5" />
      Generate
    </button>
  );
}
```

#### app/components/ApiKeyInputModal.tsx

```typescript
'use client';

import { useState } from 'react';
import { Key, ExternalLink, X } from 'lucide-react';
import { Button } from './ui/Button';

interface ApiKeyInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export function ApiKeyInputModal({ isOpen, onClose, onSave }: ApiKeyInputModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format. Must start with "sk-"');
      return;
    }
    if (apiKey.length < 20) {
      setError('API key too short');
      return;
    }
    onSave(apiKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-white">Enter Your OpenAI API Key</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null);
              }}
              placeholder="sk-..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 
                         text-white placeholder-zinc-500 focus:outline-none 
                         focus:border-yellow-500"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          <div className="text-sm text-zinc-400">
            <p>
              Don't have one?{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-500 hover:underline flex items-center gap-1 inline-flex"
              >
                Get API Key at openai.com <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-xs text-yellow-500/80">
              Your API key is stored locally in your browser. For security, consider 
              clearing it after each session.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} className="flex-1">
              Save Key
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### app/components/CopyButton.tsx

```typescript
'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider 
                  transition-colors ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-500" />
          <span className="text-green-500">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span className="text-zinc-400 hover:text-white">Copy</span>
        </>
      )}
    </button>
  );
}
```

#### app/components/ContentGeneratorModal.tsx

```typescript
'use client';

import { useState } from 'react';
import { X, Sparkles, RotateCcw } from 'lucide-react';
import { ContentIdea } from '../data/types';
import { CopyButton } from './CopyButton';
import { Button } from './ui/Button';

interface ContentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: ContentIdea | null;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function ContentGeneratorModal({
  isOpen,
  onClose,
  idea,
  isGenerating,
  error,
  onGenerate,
}: ContentGeneratorModalProps) {
  const [copyingIndex, setCopyingIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopyAll = async (texts: string[]) => {
    try {
      await navigator.clipboard.writeText(texts.join('\n'));
      setCopyingIndex(-1);
      setTimeout(() => setCopyingIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-bold text-white">AI Content Generator</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating}
              icon={RotateCcw}
              className={isGenerating ? 'animate-spin' : ''}
            >
              Generate
            </Button>
            <button onClick={onClose} className="text-zinc-400 hover:text-white ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-zinc-400">Generating ideas...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
              <p className="text-red-500 font-bold">Failed to generate</p>
              <p className="text-zinc-400 text-sm mt-1">{error}</p>
              <Button variant="primary" size="sm" onClick={onGenerate} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : idea ? (
            <>
              {/* Content Idea */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-yellow-500 tracking-wider">📺 CONTENT IDEA</span>
                  <CopyButton text={idea.contentIdea} />
                </div>
                <div className="bg-zinc-800 rounded-lg p-4 text-white">
                  {idea.contentIdea}
                </div>
              </div>

              {/* Title Variations */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-yellow-500 tracking-wider">📝 TITLE VARIATIONS</span>
                  <CopyButton
                    text={idea.titleVariations.join('\n')}
                    className={copyingIndex === -1 ? 'text-green-500' : ''}
                  />
                </div>
                <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
                  {idea.titleVariations.map((title, index) => (
                    <div key={index} className="text-white">
                      <span className="text-zinc-500 mr-2">{index + 1}.</span>
                      {title}
                    </div>
                  ))}
                </div>
              </div>

              {/* Story Hook */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-yellow-500 tracking-wider">🎬 STORY HOOK</span>
                  <CopyButton text={idea.storyHook} />
                </div>
                <div className="bg-zinc-800 rounded-lg p-4 text-white">
                  {idea.storyHook}
                </div>
              </div>

              {/* Mission Directive */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-yellow-500 tracking-wider">
                    ⚡ MISSION DIRECTIVE <span className="text-zinc-500">(Viewers)</span>
                  </span>
                  <CopyButton text={idea.missionDirective} />
                </div>
                <div className="bg-zinc-800 rounded-lg p-4 text-white">
                  {idea.missionDirective}
                </div>
              </div>

              {/* Thumbnail Prompts */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-yellow-500 tracking-wider">🖼️ THUMBNAIL PROMPTS</span>
                  <CopyButton
                    text={idea.thumbnailPrompts.join('\n\n')}
                    className={copyingIndex === -2 ? 'text-green-500' : ''}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {idea.thumbnailPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(prompt);
                          setCopyingIndex(index);
                          setTimeout(() => setCopyingIndex(null), 2000);
                        } catch (error) {
                          console.error('Failed to copy:', error);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors
                                ${copyingIndex === index 
                                  ? 'bg-green-500/20 text-green-500 border border-green-500/50' 
                                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'}`}
                    >
                      {copyingIndex === index ? '✓ Copied!' : `Prompt ${index + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <p>Click "Generate" to create content ideas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 8. Environment Configuration

### 8.1 Environment Variables

Create or update `.env.local`:

```bash
# OpenAI API Key (optional - can be set in UI)
# Get your key at: https://platform.openai.com/api-keys
# Format: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=
```

### 8.2 Example File

Update `.env.local.example`:

```bash
# OpenAI API Key
# Get your free API key at: https://platform.openai.com/api-keys
# This is optional - you can also enter it in the app UI
OPENAI_API_KEY=

# Other existing variables...
```

---

## 9. Page Integration

### 9.1 Import Statements

In `app/page.tsx`, add:

```typescript
import { FloatingGeneratorButton } from './components/FloatingGeneratorButton';
import { ContentGeneratorModal } from './components/ContentGeneratorModal';
import { ApiKeyInputModal } from './components/ApiKeyInputModal';
import { initializeOpenAI, generateContentIdea, isOpenAIInitialized } from './lib/openai';
import { ContentIdea } from './data/types';
```

### 9.2 State Integration

Add to component:

```typescript
// API Key state
const [apiKey, setApiKey] = usePersistedState<string>('xawars_openai_api_key', '');
const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

// Generator state
const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
const [isGenerating, setIsGenerating] = useState(false);
const [currentIdea, setCurrentIdea] = useState<ContentIdea | null>(null);
const [generatorError, setGeneratorError] = useState<string | null>(null);
```

### 9.3 Handler Functions

```typescript
const handleOpenGenerator = () => {
  if (!apiKey || !apiKey.startsWith('sk-')) {
    setIsApiKeyModalOpen(true);
    return;
  }
  setIsGeneratorOpen(true);
};

const handleGenerate = async () => {
  setIsGenerating(true);
  setGeneratorError(null);

  try {
    if (!isOpenAIInitialized()) {
      initializeOpenAI(apiKey);
    }
    const idea = await generateContentIdea();
    setCurrentIdea(idea);
  } catch (error) {
    setGeneratorError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    setIsGenerating(false);
  }
};

const handleSaveApiKey = (key: string) => {
  setApiKey(key);
  setIsApiKeyModalOpen(false);
};

const handleClearApiKey = () => {
  setApiKey('');
  setCurrentIdea(null);
};
```

### 9.4 Render Integration

Add to JSX (before closing main tag):

```tsx
{/* Floating Generator Button */}
<FloatingGeneratorButton onClick={handleOpenGenerator} />

{/* API Key Input Modal */}
<ApiKeyInputModal
  isOpen={isApiKeyModalOpen}
  onClose={() => setIsApiKeyModalOpen(false)}
  onSave={handleSaveApiKey}
/>

{/* Content Generator Modal */}
<ContentGeneratorModal
  isOpen={isGeneratorOpen}
  onClose={() => setIsGeneratorOpen(false)}
  idea={currentIdea}
  isGenerating={isGenerating}
  error={generatorError}
  onGenerate={handleGenerate}
/>
```

---

## 10. Acceptance Criteria

### 10.1 Functional Requirements

| ID | Requirement | Test Scenario |
|----|-------------|---------------|
| F1 | Floating button visible in bottom-right | Navigate to any page, button should be visible |
| F2 | API key modal appears when no key set | Click button, API key modal should appear |
| F3 | API key validates format | Enter "test", should show error; enter "sk-xxx...", should work |
| F4 | API key persists across sessions | Set key, refresh page, key should still be there |
| F5 | Generate creates new content | Click generate, should receive new idea |
| F6 | Content displays in modal | Generated content should show all 5 sections |
| F7 | Copy buttons work | Click copy, text should be in clipboard |
| F8 | Loading state shows while generating | Click generate, should see loading indicator |
| F9 | Error state shows on failure | Use invalid key, should show error message |

### 10.2 Visual Requirements

| ID | Requirement | Test Scenario |
|----|-------------|---------------|
| V1 | Button uses yellow accent | Check button matches app's yellow theme |
| V2 | Modal is properly centered | Check modal is centered on various screen sizes |
| V3 | Sections are clearly labeled | Each section should have clear icon + label |
| V4 | Copy feedback is visible | After copy, button should show "Copied!" |
| V5 | Responsive on mobile | Test on mobile viewport, should be usable |

### 10.3 Technical Requirements

| ID | Requirement | Test Scenario |
|----|-------------|---------------|
| T1 | No console errors | Open dev tools, check for errors |
| T2 | TypeScript compiles | Run `npm run build`, should succeed |
| T3 | localStorage works | Check localStorage after setting key |
| T4 | API calls are async | Check network tab, call should be async |

---

## 11. Future Enhancements (Out of Scope)

The following features are noted for potential future implementation but are NOT part of the initial scope:

| Enhancement | Description |
|-------------|-------------|
| Actual Image Generation | Integrate DALL-E 3 to generate actual thumbnail images |
| Content History | Save and browse past generated ideas |
| Platform Customization | Optimize output for specific platforms (YouTube vs TikTok vs Instagram) |
| Export Options | Export as text file, share link, etc. |
| Content Calendar | Schedule and plan content ahead |
| Analytics | Track which ideas performed best |
| Multiple Language | Generate content in multiple languages |
| Custom Prompts | User can provide custom context/instructions |

---

## 12. Testing Checklist

Before considering the feature complete, verify:

- [ ] Button appears in bottom-right corner
- [ ] Clicking button without API key shows input modal
- [ ] Invalid API key shows error message
- [ ] Valid API key saves and allows generation
- [ ] Generate button creates new unique content each time
- [ ] All 5 sections display correctly
- [ ] Copy buttons copy correct text
- [ ] Copied feedback shows "Copied!" message
- [ ] Loading spinner shows during generation
- [ ] Error message shows on API failure
- [ ] Works after page refresh (persistence)
- [ ] Mobile responsive design works

---

## 13. Dependencies

### Required Packages

| Package | Version | Purpose |
|---------|---------|---------|
| openai | ^4.0.0 | OpenAI API client |
| lucide-react | (existing) | Icons |
| use-sound | (existing) | (not needed for this feature) |

### Installation

```bash
npm install openai
```

---

## 14. Security Considerations

1. **API Key Storage**: Keys are stored in localStorage, which is accessible via JavaScript. For a client-side only app, this is the only option, but users should be aware.

2. **Recommendation**: Add a warning suggesting users clear the API key after each session, especially on shared devices.

3. **Rate Limiting**: OpenAI has rate limits. Handle 429 errors gracefully.

4. **Input Sanitization**: While the API handles this, consider validating API responses to ensure they match expected structure.

---

## 15. Troubleshooting Guide

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| Button not visible | Z-index conflict | Increase z-index value |
| Modal won't close | State not updating | Check onClose handler |
| Generate button disabled | isGenerating still true | Check finally block sets to false |
| API key not saving | localStorage issue | Check browser storage quota |
| Copy not working | Clipboard API blocked | Show manual "select all" fallback |
| Content not in English | Model behavior | Adjust system prompt |

---

## Appendix A: Sample API Response

Input: Default prompt to GPT-4o mini

Output:
```json
{
  "contentIdea": "Play ranked with only Year 1 operators for an entire season - can you hit Gold?",
  "titleVariations": [
    "YEAR 1 ONLY CHALLENGE - Can I reach Gold?",
    "RESTRICTED ROSTER RANKED RUN (Year 1 Operators Only)",
    "The ULTIMATE Year 1 Operator Challenge"
  ],
  "storyHook": "Returning to the roots of Siege - before operators had complex abilities, it was all about aim and game sense. Let's see if that old-school skill still translates to modern ranked play.",
  "missionDirective": "Root for the underdogs! Comment which Year 1 operator you'd pick and why.",
  "thumbnailPrompts": [
    "Rainbow Six Siege operator Sledge holding his hammer standing in front of a golden rank badge, dramatic lighting, esports aesthetic, dark background with gold accents",
    "Vintage Year 1 operators montage collage with modern rank diamond icon overlay, retro gaming aesthetic, purple and gold color scheme, YouTube thumbnail style",
    "Single operator Thermite with breach charge glowing, facing a wall with Gold rank symbol, intense gaming vibe, neon blue and gold colors, professional esports thumbnail"
  ]
}
```

---

## Appendix B: Color Palette

| Element | Color | Hex Code |
|---------|-------|----------|
| Primary Button | Yellow 500 | #EAB308 |
| Button Hover | Yellow 400 | #FACC15 |
| Background | Zinc 900 | #18181B |
| Card Background | Zinc 800 | #27272A |
| Text Primary | White | #FFFFFF |
| Text Secondary | Zinc 400 | #A1A1AA |
| Accent | Yellow 500 | #EAB308 |
| Error | Red 500 | #EF4444 |
| Success | Green 500 | #22C55E |