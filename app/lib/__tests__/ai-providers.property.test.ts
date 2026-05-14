import fc from 'fast-check';
import { PROVIDERS, PROVIDER_ORDER, type ProviderId } from '../ai-providers';
import { SYSTEM_PROMPT, USER_MESSAGE } from '../openai';

/**
 * Property 1: Provider-specific key validation
 *
 * For any provider and for any string input, `validateKey(input)` SHALL return
 * `valid: true` if and only if the input satisfies that provider's prefix and
 * minimum length rules:
 * - OpenAI: starts with "sk-" AND length >= 20
 * - OpenRouter: starts with "sk-or-" AND length >= 20
 * - Gemini: length >= 10
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */
describe('Feature: multi-provider-support, Property 1: Provider-specific key validation', () => {
  describe('OpenAI provider key validation', () => {
    const provider = PROVIDERS.openai;

    it('returns valid: true for any string starting with "sk-" and length >= 20', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 17 }).map((s) => 'sk-' + s),
          (key) => {
            fc.pre(key.length >= 20);
            const result = provider.validateKey(key);
            expect(result).toEqual({ valid: true });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns valid: false for any string not starting with "sk-"', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.startsWith('sk-')),
          (key) => {
            const result = provider.validateKey(key);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns valid: false for strings starting with "sk-" but length < 20', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 16 }).map((s) => 'sk-' + s),
          (key) => {
            fc.pre(key.length < 20);
            const result = provider.validateKey(key);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('valid: true iff starts with "sk-" AND length >= 20 (biconditional)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string().map((s) => 'sk-' + s),
            fc.string()
          ),
          (key) => {
            const result = provider.validateKey(key);
            const shouldBeValid = key.startsWith('sk-') && key.length >= 20;
            expect(result.valid).toBe(shouldBeValid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('OpenRouter provider key validation', () => {
    const provider = PROVIDERS.openrouter;

    it('returns valid: true for any string starting with "sk-or-" and length >= 20', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 14 }).map((s) => 'sk-or-' + s),
          (key) => {
            fc.pre(key.length >= 20);
            const result = provider.validateKey(key);
            expect(result).toEqual({ valid: true });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns valid: false for any string not starting with "sk-or-"', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.startsWith('sk-or-')),
          (key) => {
            const result = provider.validateKey(key);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns valid: false for strings starting with "sk-or-" but length < 20', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 13 }).map((s) => 'sk-or-' + s),
          (key) => {
            fc.pre(key.length < 20);
            const result = provider.validateKey(key);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('valid: true iff starts with "sk-or-" AND length >= 20 (biconditional)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string().map((s) => 'sk-or-' + s),
            fc.string()
          ),
          (key) => {
            const result = provider.validateKey(key);
            const shouldBeValid = key.startsWith('sk-or-') && key.length >= 20;
            expect(result.valid).toBe(shouldBeValid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Gemini provider key validation', () => {
    const provider = PROVIDERS.gemini;

    it('returns valid: true for any string with length >= 10', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          (key) => {
            const result = provider.validateKey(key);
            expect(result).toEqual({ valid: true });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns valid: false for any string with length < 10', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 9 }),
          (key) => {
            fc.pre(key.length < 10);
            const result = provider.validateKey(key);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('valid: true iff length >= 10 (biconditional)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 30 }),
          (key) => {
            const result = provider.validateKey(key);
            const shouldBeValid = key.length >= 10;
            expect(result.valid).toBe(shouldBeValid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 4: Request construction invariants
 *
 * For any provider and for any valid API key, the constructed request SHALL use
 * the endpoint URL, headers, and model from that provider's configuration.
 * The system prompt and user message content SHALL be identical across all providers.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */
describe('Feature: multi-provider-support, Property 4: Request construction invariants', () => {
  // Generate valid API keys per provider
  const validOpenAIKeyArb = fc.string({ minLength: 17 }).map((s) => 'sk-' + s).filter((k) => k.length >= 20);
  const validOpenRouterKeyArb = fc.string({ minLength: 14 }).map((s) => 'sk-or-' + s).filter((k) => k.length >= 20);
  const validGeminiKeyArb = fc.string({ minLength: 10 });

  describe('OpenAI request construction', () => {
    it('uses the correct static endpoint', () => {
      fc.assert(
        fc.property(validOpenAIKeyArb, (apiKey) => {
          const endpoint = PROVIDERS.openai.endpoint;
          expect(endpoint).toBe('https://api.openai.com/v1/chat/completions');
        }),
        { numRuns: 100 }
      );
    });

    it('includes Authorization Bearer header with the API key', () => {
      fc.assert(
        fc.property(validOpenAIKeyArb, (apiKey) => {
          const headers = PROVIDERS.openai.buildHeaders(apiKey);
          expect(headers['Authorization']).toBe(`Bearer ${apiKey}`);
          expect(headers['Content-Type']).toBe('application/json');
        }),
        { numRuns: 100 }
      );
    });

    it('uses model gpt-4o-mini', () => {
      expect(PROVIDERS.openai.model).toBe('gpt-4o-mini');
    });

    it('includes system prompt and user message in request body', () => {
      fc.assert(
        fc.property(validOpenAIKeyArb, (apiKey) => {
          const body = PROVIDERS.openai.buildRequestBody(
            PROVIDERS.openai.model,
            SYSTEM_PROMPT,
            USER_MESSAGE
          ) as { messages: { role: string; content: string }[] };
          const systemMsg = body.messages.find((m) => m.role === 'system');
          const userMsg = body.messages.find((m) => m.role === 'user');
          expect(systemMsg?.content).toBe(SYSTEM_PROMPT);
          expect(userMsg?.content).toBe(USER_MESSAGE);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('OpenRouter request construction', () => {
    it('uses the correct static endpoint', () => {
      fc.assert(
        fc.property(validOpenRouterKeyArb, (apiKey) => {
          const endpoint = PROVIDERS.openrouter.endpoint;
          expect(endpoint).toBe('https://openrouter.ai/api/v1/chat/completions');
        }),
        { numRuns: 100 }
      );
    });

    it('includes Authorization Bearer header and HTTP-Referer', () => {
      fc.assert(
        fc.property(validOpenRouterKeyArb, (apiKey) => {
          const headers = PROVIDERS.openrouter.buildHeaders(apiKey);
          expect(headers['Authorization']).toBe(`Bearer ${apiKey}`);
          expect(headers['Content-Type']).toBe('application/json');
          expect(headers['HTTP-Referer']).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('uses model meta-llama/llama-3.1-8b-instruct:free', () => {
      expect(PROVIDERS.openrouter.model).toBe('meta-llama/llama-3.1-8b-instruct:free');
    });

    it('includes system prompt and user message in request body', () => {
      fc.assert(
        fc.property(validOpenRouterKeyArb, (apiKey) => {
          const body = PROVIDERS.openrouter.buildRequestBody(
            PROVIDERS.openrouter.model,
            SYSTEM_PROMPT,
            USER_MESSAGE
          ) as { messages: { role: string; content: string }[] };
          const systemMsg = body.messages.find((m) => m.role === 'system');
          const userMsg = body.messages.find((m) => m.role === 'user');
          expect(systemMsg?.content).toBe(SYSTEM_PROMPT);
          expect(userMsg?.content).toBe(USER_MESSAGE);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Gemini request construction', () => {
    it('uses a function endpoint that includes the API key as query param', () => {
      fc.assert(
        fc.property(validGeminiKeyArb, (apiKey) => {
          const endpointFn = PROVIDERS.gemini.endpoint;
          expect(typeof endpointFn).toBe('function');
          const url = (endpointFn as (key: string) => string)(apiKey);
          expect(url).toContain(`key=${apiKey}`);
          expect(url).toContain('generativelanguage.googleapis.com');
        }),
        { numRuns: 100 }
      );
    });

    it('has Content-Type header but no Authorization header', () => {
      fc.assert(
        fc.property(validGeminiKeyArb, (apiKey) => {
          const headers = PROVIDERS.gemini.buildHeaders(apiKey);
          expect(headers['Content-Type']).toBe('application/json');
          expect(headers['Authorization']).toBeUndefined();
        }),
        { numRuns: 100 }
      );
    });

    it('uses model gemini-2.5-flash', () => {
      expect(PROVIDERS.gemini.model).toBe('gemini-2.5-flash');
    });

    it('includes system prompt and user message in Gemini format', () => {
      fc.assert(
        fc.property(validGeminiKeyArb, (apiKey) => {
          const body = PROVIDERS.gemini.buildRequestBody(
            PROVIDERS.gemini.model,
            SYSTEM_PROMPT,
            USER_MESSAGE
          ) as {
            systemInstruction: { parts: { text: string }[] };
            contents: { role: string; parts: { text: string }[] }[];
          };
          expect(body.systemInstruction.parts[0].text).toBe(SYSTEM_PROMPT);
          expect(body.contents[0].parts[0].text).toBe(USER_MESSAGE);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-provider invariants', () => {
    it('all providers use the same system prompt and user message', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PROVIDER_ORDER),
          fc.string({ minLength: 20 }),
          (providerId, apiKey) => {
            const provider = PROVIDERS[providerId];
            const body = provider.buildRequestBody(provider.model, SYSTEM_PROMPT, USER_MESSAGE);

            // Extract system prompt and user message from the body regardless of format
            if (providerId === 'gemini') {
              const geminiBody = body as {
                systemInstruction: { parts: { text: string }[] };
                contents: { role: string; parts: { text: string }[] }[];
              };
              expect(geminiBody.systemInstruction.parts[0].text).toBe(SYSTEM_PROMPT);
              expect(geminiBody.contents[0].parts[0].text).toBe(USER_MESSAGE);
            } else {
              const chatBody = body as { messages: { role: string; content: string }[] };
              const systemMsg = chatBody.messages.find((m) => m.role === 'system');
              const userMsg = chatBody.messages.find((m) => m.role === 'user');
              expect(systemMsg?.content).toBe(SYSTEM_PROMPT);
              expect(userMsg?.content).toBe(USER_MESSAGE);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property 5: Response extraction across formats
 *
 * For any provider and for any well-formed API response in that provider's format
 * containing a valid ContentIdea JSON string, the extraction function SHALL produce
 * the same content string regardless of which provider produced the response.
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 */
describe('Feature: multi-provider-support, Property 5: Response extraction across formats', () => {
  // Generate a valid ContentIdea JSON string
  const validContentIdeaJsonArb = fc.record({
    contentIdea: fc.string({ minLength: 1 }),
    titleVariations: fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), fc.string({ minLength: 1 })),
    storyHook: fc.string({ minLength: 1 }),
    missionDirective: fc.string({ minLength: 1 }),
    thumbnailPrompts: fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), fc.string({ minLength: 1 })),
  }).map((idea) => JSON.stringify(idea));

  it('OpenAI extractContent extracts content from choices format', () => {
    fc.assert(
      fc.property(validContentIdeaJsonArb, (jsonStr) => {
        const response = {
          choices: [{ message: { content: jsonStr } }],
        };
        const extracted = PROVIDERS.openai.extractContent(response);
        expect(extracted).toBe(jsonStr);
      }),
      { numRuns: 100 }
    );
  });

  it('OpenRouter extractContent extracts content from choices format', () => {
    fc.assert(
      fc.property(validContentIdeaJsonArb, (jsonStr) => {
        const response = {
          choices: [{ message: { content: jsonStr } }],
        };
        const extracted = PROVIDERS.openrouter.extractContent(response);
        expect(extracted).toBe(jsonStr);
      }),
      { numRuns: 100 }
    );
  });

  it('Gemini extractContent extracts content from candidates format', () => {
    fc.assert(
      fc.property(validContentIdeaJsonArb, (jsonStr) => {
        const response = {
          candidates: [{ content: { parts: [{ text: jsonStr }] } }],
        };
        const extracted = PROVIDERS.gemini.extractContent(response);
        expect(extracted).toBe(jsonStr);
      }),
      { numRuns: 100 }
    );
  });

  it('all providers extract the same JSON string from their respective response formats', () => {
    fc.assert(
      fc.property(validContentIdeaJsonArb, (jsonStr) => {
        const openaiResponse = {
          choices: [{ message: { content: jsonStr } }],
        };
        const openrouterResponse = {
          choices: [{ message: { content: jsonStr } }],
        };
        const geminiResponse = {
          candidates: [{ content: { parts: [{ text: jsonStr }] } }],
        };

        const openaiResult = PROVIDERS.openai.extractContent(openaiResponse);
        const openrouterResult = PROVIDERS.openrouter.extractContent(openrouterResponse);
        const geminiResult = PROVIDERS.gemini.extractContent(geminiResponse);

        // All providers should extract the same content string
        expect(openaiResult).toBe(jsonStr);
        expect(openrouterResult).toBe(jsonStr);
        expect(geminiResult).toBe(jsonStr);
        expect(openaiResult).toBe(openrouterResult);
        expect(openrouterResult).toBe(geminiResult);
      }),
      { numRuns: 100 }
    );
  });

  it('extractContent throws for empty/missing content in OpenAI/OpenRouter format', () => {
    const emptyResponses = [
      { choices: [{ message: { content: '' } }] },
      { choices: [{ message: { content: '   ' } }] },
      { choices: [] },
      { choices: [{ message: {} }] },
      {},
    ];

    for (const response of emptyResponses) {
      expect(() => PROVIDERS.openai.extractContent(response)).toThrow();
      expect(() => PROVIDERS.openrouter.extractContent(response)).toThrow();
    }
  });

  it('extractContent throws for empty/missing content in Gemini format', () => {
    const emptyResponses = [
      { candidates: [{ content: { parts: [{ text: '' }] } }] },
      { candidates: [{ content: { parts: [{ text: '   ' }] } }] },
      { candidates: [] },
      { candidates: [{ content: { parts: [] } }] },
      {},
    ];

    for (const response of emptyResponses) {
      expect(() => PROVIDERS.gemini.extractContent(response)).toThrow();
    }
  });
});
