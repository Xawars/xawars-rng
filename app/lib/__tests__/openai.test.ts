import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateContentIdea, parseContentIdea, OPENAI_CONFIG } from '../openai';

describe('parseContentIdea', () => {
  const validContent = {
    contentIdea: 'Test a new Siege strat',
    titleVariations: ['Title 1', 'Title 2', 'Title 3'] as [string, string, string],
    storyHook: 'What if you could ace every round?',
    missionDirective: 'Drop a comment with your best ace clip',
    thumbnailPrompts: ['Prompt 1', 'Prompt 2', 'Prompt 3'] as [string, string, string],
  };

  it('parses valid JSON into a ContentIdea object', () => {
    const result = parseContentIdea(JSON.stringify(validContent));
    expect(result).toEqual(validContent);
  });

  it('throws { type: "parse_error" } for malformed JSON', () => {
    expect(() => parseContentIdea('not json at all')).toThrow();
    try {
      parseContentIdea('not json at all');
    } catch (e) {
      expect(e).toEqual({ type: 'parse_error' });
    }
  });

  it('throws { type: "parse_error" } when contentIdea is missing', () => {
    const { contentIdea, ...rest } = validContent;
    try {
      parseContentIdea(JSON.stringify(rest));
    } catch (e) {
      expect(e).toEqual({ type: 'parse_error' });
    }
  });

  it('throws { type: "parse_error" } when titleVariations has wrong count', () => {
    const invalid = { ...validContent, titleVariations: ['Only one'] };
    try {
      parseContentIdea(JSON.stringify(invalid));
    } catch (e) {
      expect(e).toEqual({ type: 'parse_error' });
    }
  });

  it('throws { type: "parse_error" } when thumbnailPrompts has wrong count', () => {
    const invalid = { ...validContent, thumbnailPrompts: ['One', 'Two'] };
    try {
      parseContentIdea(JSON.stringify(invalid));
    } catch (e) {
      expect(e).toEqual({ type: 'parse_error' });
    }
  });

  it('throws { type: "parse_error" } for null input parsed as JSON', () => {
    try {
      parseContentIdea('null');
    } catch (e) {
      expect(e).toEqual({ type: 'parse_error' });
    }
  });
});

describe('generateContentIdea', () => {
  const mockApiKey = 'sk-test1234567890abcdef';

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sends correct request to OpenAI endpoint', async () => {
    const validResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            contentIdea: 'Test idea',
            titleVariations: ['T1', 'T2', 'T3'],
            storyHook: 'Hook',
            missionDirective: 'Directive',
            thumbnailPrompts: ['P1', 'P2', 'P3'],
          }),
        },
      }],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validResponse),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateContentIdea(mockApiKey);

    expect(fetchMock).toHaveBeenCalledWith(
      OPENAI_CONFIG.endpoint,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockApiKey}`,
        },
      })
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.max_tokens).toBe(1000);
    expect(body.temperature).toBe(0.9);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');

    expect(result.contentIdea).toBe('Test idea');
  });

  it('throws { status } for non-OK responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }));

    await expect(generateContentIdea(mockApiKey)).rejects.toEqual({ status: 401 });
  });

  it('throws { type: "empty_response" } when choices array is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
    }));

    await expect(generateContentIdea(mockApiKey)).rejects.toEqual({ type: 'empty_response' });
  });

  it('throws { type: "empty_response" } when content is empty string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '   ' } }],
      }),
    }));

    await expect(generateContentIdea(mockApiKey)).rejects.toEqual({ type: 'empty_response' });
  });

  it('throws { type: "parse_error" } when content is invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'not valid json' } }],
      }),
    }));

    await expect(generateContentIdea(mockApiKey)).rejects.toEqual({ type: 'parse_error' });
  });

  it('uses AbortController signal in fetch call', async () => {
    const validResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            contentIdea: 'Idea',
            titleVariations: ['A', 'B', 'C'],
            storyHook: 'Hook',
            missionDirective: 'Dir',
            thumbnailPrompts: ['X', 'Y', 'Z'],
          }),
        },
      }],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validResponse),
    });
    vi.stubGlobal('fetch', fetchMock);

    await generateContentIdea(mockApiKey);

    const callArgs = fetchMock.mock.calls[0][1];
    expect(callArgs.signal).toBeInstanceOf(AbortSignal);
  });
});
