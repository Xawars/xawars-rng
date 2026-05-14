// AI Content Generator - OpenAI Client Module
// Direct fetch-based client for OpenAI Chat Completions API

export interface ContentIdea {
  contentIdea: string;
  titleVariations: [string, string, string];
  storyHook: string;
  missionDirective: string;
  thumbnailPrompts: [string, string, string];
}

export type ApiErrorType =
  | 'network'
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'parse_error'
  | 'empty_response'
  | 'unknown';

export interface ApiError {
  type: ApiErrorType;
  message: string;
  retryable: boolean;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  error?: string;
}

export const OPENAI_CONFIG = {
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.9,
  timeoutMs: 30000,
  endpoint: 'https://api.openai.com/v1/chat/completions',
} as const;

/**
 * Validates an OpenAI API key format.
 * - Must start with "sk-"
 * - Must be at least 20 characters long
 */
export function validateApiKey(key: string): ApiKeyValidationResult {
  if (!key.startsWith('sk-')) {
    return { valid: false, error: 'Invalid API key format. Must start with sk-' };
  }

  if (key.length < 20) {
    return { valid: false, error: 'API key too short' };
  }

  return { valid: true };
}

/**
 * Classifies an unknown error into a typed ApiError object.
 * Maps HTTP statuses and error conditions to user-friendly messages.
 */
export function classifyApiError(error: unknown): ApiError {
  // Handle AbortError (timeout via AbortController)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      type: 'timeout',
      message: 'Request timed out. Try again.',
      retryable: true,
    };
  }

  // Handle TypeError from fetch (network failures)
  if (error instanceof TypeError) {
    return {
      type: 'network',
      message: 'Network error. Check your connection.',
      retryable: true,
    };
  }

  // Handle Response-based errors (passed as an object with status)
  if (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    const status = (error as { status: number }).status;

    if (status === 401) {
      return {
        type: 'auth',
        message: 'API key is invalid. Please re-enter.',
        retryable: false,
      };
    }

    if (status === 429) {
      return {
        type: 'rate_limit',
        message: 'Too many requests. Please wait.',
        retryable: true,
      };
    }

    if (status >= 500 && status < 600) {
      return {
        type: 'unknown',
        message: 'Server error. Try again later.',
        retryable: true,
      };
    }
  }

  // Handle errors with a 'type' property already set (internal error markers)
  if (
    error !== null &&
    typeof error === 'object' &&
    'type' in error &&
    typeof (error as { type: unknown }).type === 'string'
  ) {
    const errorObj = error as { type: string; message?: string };

    if (errorObj.type === 'empty_response') {
      return {
        type: 'empty_response',
        message: 'No content generated from API',
        retryable: true,
      };
    }

    if (errorObj.type === 'parse_error') {
      return {
        type: 'parse_error',
        message: 'Failed to parse API response',
        retryable: true,
      };
    }
  }

  // Fallback for any unrecognized error
  return {
    type: 'unknown',
    message: 'Server error. Try again later.',
    retryable: true,
  };
}

/**
 * System prompt defining the AI's role as a Rainbow Six Siege content strategist.
 */
export const SYSTEM_PROMPT = `You are a Rainbow Six Siege content strategist specializing in YouTube, TikTok, and Instagram content creation. Generate creative, engaging content ideas that will resonate with the R6 community.

You MUST respond with valid JSON in exactly this format:
{
  "contentIdea": "A brief description of the content idea",
  "titleVariations": ["Title 1", "Title 2", "Title 3"],
  "storyHook": "An engaging opening hook for the content",
  "missionDirective": "A call-to-action or viewer engagement directive",
  "thumbnailPrompts": ["Thumbnail concept 1", "Thumbnail concept 2", "Thumbnail concept 3"]
}

Rules:
- contentIdea: A unique, creative content concept for Rainbow Six Siege
- titleVariations: Exactly 3 catchy, click-worthy title options
- storyHook: A compelling opening line or narrative hook
- missionDirective: A viewer engagement call-to-action (subscribe, comment, challenge)
- thumbnailPrompts: Exactly 3 visual thumbnail descriptions`;

/**
 * The user message sent to the AI for content generation.
 */
export const USER_MESSAGE = 'Generate a fresh Rainbow Six Siege content idea.';

/**
 * Parses and validates a raw JSON string into a ContentIdea object.
 * Throws `{ type: 'parse_error' }` if the JSON is malformed or missing required fields.
 */
export function parseContentIdea(raw: string): ContentIdea {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw { type: 'parse_error' };
  }

  if (parsed === null || typeof parsed !== 'object') {
    throw { type: 'parse_error' };
  }

  const obj = parsed as Record<string, unknown>;

  // Validate all required fields exist and have correct types
  if (typeof obj.contentIdea !== 'string') {
    throw { type: 'parse_error' };
  }

  if (typeof obj.storyHook !== 'string') {
    throw { type: 'parse_error' };
  }

  if (typeof obj.missionDirective !== 'string') {
    throw { type: 'parse_error' };
  }

  // Validate titleVariations is an array of exactly 3 strings
  if (
    !Array.isArray(obj.titleVariations) ||
    obj.titleVariations.length !== 3 ||
    !obj.titleVariations.every((item: unknown) => typeof item === 'string')
  ) {
    throw { type: 'parse_error' };
  }

  // Validate thumbnailPrompts is an array of exactly 3 strings
  if (
    !Array.isArray(obj.thumbnailPrompts) ||
    obj.thumbnailPrompts.length !== 3 ||
    !obj.thumbnailPrompts.every((item: unknown) => typeof item === 'string')
  ) {
    throw { type: 'parse_error' };
  }

  return {
    contentIdea: obj.contentIdea,
    titleVariations: obj.titleVariations as [string, string, string],
    storyHook: obj.storyHook,
    missionDirective: obj.missionDirective,
    thumbnailPrompts: obj.thumbnailPrompts as [string, string, string],
  };
}

/**
 * Generates a content idea by calling the OpenAI Chat Completions API.
 * Uses native fetch with AbortController for 30s timeout.
 *
 * @param apiKey - The user's OpenAI API key
 * @returns A validated ContentIdea object
 * @throws Object with `status` property for HTTP errors (handled by classifyApiError)
 * @throws Object with `type: 'empty_response'` for empty API responses
 * @throws Object with `type: 'parse_error'` for malformed/incomplete JSON
 */
export async function generateContentIdea(apiKey: string): Promise<ContentIdea> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_CONFIG.timeoutMs);

  try {
    const response = await fetch(OPENAI_CONFIG.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.model,
        max_tokens: OPENAI_CONFIG.maxTokens,
        temperature: OPENAI_CONFIG.temperature,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_MESSAGE },
        ],
      }),
    });

    if (!response.ok) {
      throw { status: response.status };
    }

    const data = await response.json();

    // Check for empty response (no choices or empty content)
    if (
      !data.choices ||
      !Array.isArray(data.choices) ||
      data.choices.length === 0 ||
      !data.choices[0].message ||
      !data.choices[0].message.content ||
      data.choices[0].message.content.trim() === ''
    ) {
      throw { type: 'empty_response' };
    }

    const content = data.choices[0].message.content;
    return parseContentIdea(content);
  } finally {
    clearTimeout(timeoutId);
  }
}
