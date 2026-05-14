import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateContentIdea,
  classifyApiError,
  parseContentIdea,
} from '../ai-client';
import { SYSTEM_PROMPT, USER_MESSAGE } from '../openai';

describe('ai-client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Gemini request format construction', () => {
    const validGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  contentIdea: 'Test Gemini idea',
                  titleVariations: ['G1', 'G2', 'G3'],
                  storyHook: 'Gemini hook',
                  missionDirective: 'Gemini directive',
                  thumbnailPrompts: ['GP1', 'GP2', 'GP3'],
                }),
              },
            ],
          },
        },
      ],
    };

    it('sends systemInstruction with SYSTEM_PROMPT in parts[0].text', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validGeminiResponse),
      });
      vi.stubGlobal('fetch', fetchMock);

      await generateContentIdea({ provider: 'gemini', apiKey: 'test-key-12345' });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.systemInstruction.parts[0].text).toBe(SYSTEM_PROMPT);
    });

    it('sends contents with user role and USER_MESSAGE', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validGeminiResponse),
      });
      vi.stubGlobal('fetch', fetchMock);

      await generateContentIdea({ provider: 'gemini', apiKey: 'test-key-12345' });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.contents[0].role).toBe('user');
      expect(body.contents[0].parts[0].text).toBe(USER_MESSAGE);
    });

    it('sends generationConfig with correct parameters', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validGeminiResponse),
      });
      vi.stubGlobal('fetch', fetchMock);

      await generateContentIdea({ provider: 'gemini', apiKey: 'test-key-12345' });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.generationConfig.maxOutputTokens).toBe(1000);
      expect(body.generationConfig.temperature).toBe(0.9);
      expect(body.generationConfig.responseMimeType).toBe('application/json');
    });

    it('includes API key in the endpoint URL as query parameter', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validGeminiResponse),
      });
      vi.stubGlobal('fetch', fetchMock);

      await generateContentIdea({ provider: 'gemini', apiKey: 'test-key-12345' });

      const url = fetchMock.mock.calls[0][0];
      expect(url).toContain('key=test-key-12345');
    });

    it('does not include an Authorization header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validGeminiResponse),
      });
      vi.stubGlobal('fetch', fetchMock);

      await generateContentIdea({ provider: 'gemini', apiKey: 'test-key-12345' });

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers).not.toHaveProperty('Authorization');
    });
  });

  describe('Gemini auth error detection', () => {
    it('classifies HTTP 400 with INVALID_ARGUMENT as auth error', () => {
      const error = {
        status: 400,
        body: {
          error: {
            status: 'INVALID_ARGUMENT',
            message: 'API key not valid. Please pass a valid API key.',
          },
        },
      };

      const result = classifyApiError('gemini', error);
      expect(result).toEqual({
        type: 'auth',
        message: 'API key is invalid. Please re-enter.',
        retryable: false,
      });
    });

    it('does NOT classify HTTP 400 without INVALID_ARGUMENT as auth error', () => {
      const error = {
        status: 400,
        body: {
          error: {
            status: 'INVALID_REQUEST',
            message: 'Request payload is malformed.',
          },
        },
      };

      const result = classifyApiError('gemini', error);
      expect(result.type).not.toBe('auth');
    });

    it('does NOT classify HTTP 400 with no error body as auth error', () => {
      const error = { status: 400 };

      const result = classifyApiError('gemini', error);
      expect(result.type).not.toBe('auth');
    });
  });

  describe('OpenAI/OpenRouter auth error detection', () => {
    it('classifies OpenAI HTTP 401 as auth error', () => {
      const result = classifyApiError('openai', { status: 401 });
      expect(result).toEqual({
        type: 'auth',
        message: 'API key is invalid. Please re-enter.',
        retryable: false,
      });
    });

    it('classifies OpenRouter HTTP 401 as auth error', () => {
      const result = classifyApiError('openrouter', { status: 401 });
      expect(result).toEqual({
        type: 'auth',
        message: 'API key is invalid. Please re-enter.',
        retryable: false,
      });
    });
  });

  describe('Backward compatibility of parseContentIdea', () => {
    const validContent = {
      contentIdea: 'Test a new Siege strat',
      titleVariations: ['Title 1', 'Title 2', 'Title 3'] as [string, string, string],
      storyHook: 'What if you could ace every round?',
      missionDirective: 'Drop a comment with your best ace clip',
      thumbnailPrompts: ['Prompt 1', 'Prompt 2', 'Prompt 3'] as [string, string, string],
    };

    it('parses valid JSON with all fields into a ContentIdea', () => {
      const result = parseContentIdea(JSON.stringify(validContent));
      expect(result).toEqual(validContent);
    });

    it('throws for invalid JSON', () => {
      expect(() => parseContentIdea('not valid json')).toThrow();
    });

    it('throws for missing required fields', () => {
      const { storyHook, ...rest } = validContent;
      expect(() => parseContentIdea(JSON.stringify(rest))).toThrow();
    });

    it('throws for wrong titleVariations array length', () => {
      const invalid = { ...validContent, titleVariations: ['Only one'] };
      expect(() => parseContentIdea(JSON.stringify(invalid))).toThrow();
    });

    it('throws for wrong thumbnailPrompts array length', () => {
      const invalid = { ...validContent, thumbnailPrompts: ['One', 'Two'] };
      expect(() => parseContentIdea(JSON.stringify(invalid))).toThrow();
    });
  });
});
