// Multi-Provider AI Configuration Registry
// Defines provider types, validation rules, request builders, and response extractors

export type ProviderId = 'openai' | 'openrouter' | 'gemini';

export interface ProviderConfig {
  id: ProviderId;
  displayName: string;
  keyPlaceholder: string;
  keyHelpUrl: string;
  model: string;
  endpoint: string | ((apiKey: string) => string);
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildRequestBody: (model: string, systemPrompt: string, userMessage: string) => object;
  extractContent: (responseData: unknown) => string;
  validateKey: (key: string) => { valid: boolean; error?: string };
  classifyAuthError: (status: number, body?: unknown) => boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: 'openai',
    displayName: 'OpenAI',
    keyPlaceholder: 'sk-...',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    buildHeaders: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildRequestBody: (model: string, systemPrompt: string, userMessage: string) => ({
      model,
      max_tokens: 1000,
      temperature: 0.9,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
    extractContent: (responseData: unknown): string => {
      const data = responseData as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data?.choices?.[0]?.message?.content;
      if (!content || content.trim() === '') {
        throw { type: 'empty_response' };
      }
      return content;
    },
    validateKey: (key: string) => {
      if (!key.startsWith('sk-')) {
        return { valid: false, error: 'Invalid API key format. Must start with sk-' };
      }
      if (key.length < 20) {
        return { valid: false, error: 'API key too short' };
      }
      return { valid: true };
    },
    classifyAuthError: (status: number) => status === 401,
  },

  openrouter: {
    id: 'openrouter',
    displayName: 'OpenRouter',
    keyPlaceholder: 'sk-or-...',
    keyHelpUrl: 'https://openrouter.ai/keys',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    buildHeaders: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    }),
    buildRequestBody: (model: string, systemPrompt: string, userMessage: string) => ({
      model,
      max_tokens: 1000,
      temperature: 0.9,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
    extractContent: (responseData: unknown): string => {
      const data = responseData as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data?.choices?.[0]?.message?.content;
      if (!content || content.trim() === '') {
        throw { type: 'empty_response' };
      }
      return content;
    },
    validateKey: (key: string) => {
      if (!key.startsWith('sk-or-')) {
        return { valid: false, error: 'Invalid API key format. Must start with sk-or-' };
      }
      if (key.length < 20) {
        return { valid: false, error: 'API key too short' };
      }
      return { valid: true };
    },
    classifyAuthError: (status: number) => status === 401,
  },

  gemini: {
    id: 'gemini',
    displayName: 'Gemini',
    keyPlaceholder: 'AI...',
    keyHelpUrl: 'https://aistudio.google.com/apikey',
    model: 'gemini-2.5-flash',
    endpoint: (apiKey: string) =>
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    buildHeaders: () => ({
      'Content-Type': 'application/json',
    }),
    buildRequestBody: (_model: string, systemPrompt: string, userMessage: string) => ({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.9,
        responseMimeType: 'application/json',
      },
    }),
    extractContent: (responseData: unknown): string => {
      const data = responseData as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content || content.trim() === '') {
        throw { type: 'empty_response' };
      }
      return content;
    },
    validateKey: (key: string) => {
      if (key.length < 10) {
        return { valid: false, error: 'Invalid API key. Must be at least 10 characters' };
      }
      return { valid: true };
    },
    classifyAuthError: (status: number, body?: unknown) => {
      if (status !== 400) return false;
      if (body && typeof body === 'object' && 'error' in body) {
        const error = (body as { error?: { status?: string } }).error;
        return error?.status === 'INVALID_ARGUMENT';
      }
      return false;
    },
  },
};

export const PROVIDER_ORDER: ProviderId[] = ['openai', 'openrouter', 'gemini'];
export const DEFAULT_PROVIDER: ProviderId = 'openai';
