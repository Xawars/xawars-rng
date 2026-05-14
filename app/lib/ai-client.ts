// Multi-Provider AI Client Module
// Unified interface for generating content ideas across OpenAI, OpenRouter, and Gemini

import { PROVIDERS, type ProviderId } from './ai-providers';
import {
  type ContentIdea,
  type ApiError,
  type ApiErrorType,
  type ApiKeyValidationResult,
  parseContentIdea,
  SYSTEM_PROMPT,
  USER_MESSAGE,
} from './openai';

export type { ContentIdea, ApiError, ApiErrorType, ApiKeyValidationResult };
export { parseContentIdea };

export interface GenerateOptions {
  provider: ProviderId;
  apiKey: string;
}

/**
 * Validates an API key for the given provider by delegating to the provider's
 * validation logic in the PROVIDERS registry.
 */
export function validateApiKey(provider: ProviderId, key: string): ApiKeyValidationResult {
  const config = PROVIDERS[provider];
  return config.validateKey(key);
}

/**
 * Classifies an unknown error into a typed ApiError object with provider-specific
 * auth error detection. Gemini uses HTTP 400 for auth errors instead of 401.
 */
export function classifyApiError(provider: ProviderId, error: unknown): ApiError {
  // Handle AbortError (timeout via AbortController)
  if (
    error instanceof DOMException && error.name === 'AbortError' ||
    (error !== null && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'AbortError')
  ) {
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
    const body = 'body' in error ? (error as { body?: unknown }).body : undefined;

    const config = PROVIDERS[provider];

    // Check provider-specific auth error classification
    if (config.classifyAuthError(status, body)) {
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
  }

  // Fallback for any unrecognized error
  return {
    type: 'unknown',
    message: 'Something went wrong. Try again.',
    retryable: true,
  };
}

/**
 * Generates a content idea by calling the appropriate AI provider's API.
 * Uses native fetch with AbortController for 30-second timeout.
 *
 * @param options - Provider ID and API key
 * @returns A validated ContentIdea object
 * @throws Object with `status` and optional `body` for HTTP errors
 * @throws TypeError for network failures
 * @throws DOMException (AbortError) for timeouts
 */
export async function generateContentIdea(options: GenerateOptions): Promise<ContentIdea> {
  const { provider, apiKey } = options;
  const config = PROVIDERS[provider];

  // Resolve endpoint (Gemini uses a function, others use a string)
  const endpoint = typeof config.endpoint === 'function'
    ? config.endpoint(apiKey)
    : config.endpoint;

  // Build headers
  const headers = config.buildHeaders(apiKey);

  // Build request body using the same system prompt and user message for all providers
  const body = config.buildRequestBody(config.model, SYSTEM_PROMPT, USER_MESSAGE);

  // Create AbortController with 30-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch {
        // If we can't parse the error body, that's fine
      }
      console.error(`[AI Client] ${provider} error - HTTP ${response.status}:`, responseBody);
      throw { status: response.status, body: responseBody };
    }

    const data = await response.json();

    // Extract content using provider-specific extraction logic
    const content = config.extractContent(data);

    // Parse and validate the content into a ContentIdea
    return parseContentIdea(content);
  } finally {
    clearTimeout(timeoutId);
  }
}
