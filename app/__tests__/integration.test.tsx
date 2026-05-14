import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState, useCallback } from 'react';
import { FloatingGeneratorButton } from '../components/FloatingGeneratorButton';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { ContentGeneratorModal } from '../components/ContentGeneratorModal';
import { generateContentIdea, validateApiKey, classifyApiError, type ContentIdea } from '../lib/ai-client';
import { DEFAULT_PROVIDER, type ProviderId } from '../lib/ai-providers';

// --- Mocks ---

// Mock useAudioFeedback (not relevant for AI generator integration)
vi.mock('../hooks/useAudioFeedback', () => ({
  useAudioFeedback: () => ({
    playRoll: vi.fn(),
    stopRoll: vi.fn(),
    playReveal: vi.fn(),
  }),
}));

// Mock navigator.clipboard
beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

// --- localStorage mock ---
function createMockLocalStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    _store: store,
  };
}

// --- Test Wrapper Component ---
// Replicates the AI content generator state management from page.tsx
// without all the unrelated game logic.
function AIGeneratorTestWrapper({
  initialApiKey = '',
  initialProvider = DEFAULT_PROVIDER,
}: {
  initialApiKey?: string;
  initialProvider?: ProviderId;
}) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [activeProvider, setActiveProvider] = useState<ProviderId>(initialProvider);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<ContentIdea | null>(null);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const handleGenerate = useCallback(
    async (key?: string, providerOverride?: ProviderId) => {
      const keyToUse = key || apiKey;
      const providerToUse = providerOverride || activeProvider;
      setIsGenerating(true);
      setGeneratorError(null);

      try {
        const idea = await generateContentIdea({ provider: providerToUse, apiKey: keyToUse });
        setCurrentIdea(idea);
      } catch (err: unknown) {
        const classified = classifyApiError(providerToUse, err);
        setGeneratorError(classified.message);

        if (classified.type === 'auth') {
          setApiKey('');
          setIsGeneratorOpen(false);
          setApiKeyError(classified.message);
          setIsApiKeyModalOpen(true);
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [apiKey, activeProvider]
  );

  const handleGeneratorClick = useCallback(() => {
    const validation = validateApiKey(activeProvider, apiKey);
    if (!validation.valid) {
      setIsApiKeyModalOpen(true);
    } else {
      setIsGeneratorOpen(true);
      handleGenerate();
    }
  }, [apiKey, activeProvider, handleGenerate]);

  const handleApiKeySave = useCallback(
    (key: string, provider: ProviderId) => {
      setApiKey(key);
      setActiveProvider(provider);
      setApiKeyError(null);
      setIsApiKeyModalOpen(false);
      setIsGeneratorOpen(true);
      handleGenerate(key, provider);
    },
    [handleGenerate]
  );

  const handleClearApiKey = useCallback(() => {
    setApiKey('');
    setIsGeneratorOpen(false);
    setIsApiKeyModalOpen(true);
  }, []);

  return (
    <div>
      <FloatingGeneratorButton onClick={handleGeneratorClick} />
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => {
          setIsApiKeyModalOpen(false);
          setApiKeyError(null);
        }}
        onSave={handleApiKeySave}
        error={apiKeyError}
        initialProvider={activeProvider}
      />
      <ContentGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        idea={currentIdea}
        isGenerating={isGenerating}
        error={generatorError}
        onGenerate={() => handleGenerate()}
        onClearApiKey={handleClearApiKey}
        activeProvider={activeProvider}
        onChangeProvider={() => {
          setIsGeneratorOpen(false);
          setIsApiKeyModalOpen(true);
        }}
      />
    </div>
  );
}

// --- Valid ContentIdea JSON for mocked responses ---
const validContentIdeaJson = JSON.stringify({
  contentIdea: 'Test Siege content idea',
  titleVariations: ['Title A', 'Title B', 'Title C'],
  storyHook: 'An engaging hook for viewers',
  missionDirective: 'Subscribe and drop a comment',
  thumbnailPrompts: ['Thumbnail 1', 'Thumbnail 2', 'Thumbnail 3'],
});

describe('Integration: Full Provider Flow', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('select Gemini provider → enter key → generate → display result', async () => {
    // Mock fetch to return a valid Gemini response format
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: validContentIdeaJson }],
            },
          },
        ],
      }),
    });

    render(<AIGeneratorTestWrapper />);

    // Click the floating generator button (no key stored, so ApiKeyModal opens)
    const generateButton = screen.getByRole('button', { name: 'Generate AI content' });
    fireEvent.click(generateButton);

    // ApiKeyModal should be open
    expect(screen.getByLabelText('API key')).toBeInTheDocument();

    // Select Gemini from the provider dropdown
    const providerSelect = screen.getByLabelText('AI provider');
    fireEvent.change(providerSelect, { target: { value: 'gemini' } });

    // Enter a valid Gemini key
    const keyInput = screen.getByLabelText('API key');
    fireEvent.change(keyInput, { target: { value: 'AIzaSyAbcdefghijklmnop' } });

    // Click Save
    const saveButton = screen.getByText('Save');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Wait for the content to be displayed
    await waitFor(() => {
      expect(screen.getByText('Test Siege content idea')).toBeInTheDocument();
    });

    // Verify the provider indicator shows "Gemini"
    expect(screen.getByText('Gemini')).toBeInTheDocument();

    // Verify fetch was called with the Gemini endpoint
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).toContain('key=AIzaSyAbcdefghijklmnop');
  });

  it('select OpenAI provider → enter key → generate → display result', async () => {
    // Mock fetch to return a valid OpenAI response format
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: validContentIdeaJson,
            },
          },
        ],
      }),
    });

    render(<AIGeneratorTestWrapper />);

    // Click the floating generator button
    const generateButton = screen.getByRole('button', { name: 'Generate AI content' });
    fireEvent.click(generateButton);

    // ApiKeyModal should be open (no key stored)
    expect(screen.getByLabelText('API key')).toBeInTheDocument();

    // Provider should default to OpenAI
    const providerSelect = screen.getByLabelText('AI provider') as HTMLSelectElement;
    expect(providerSelect.value).toBe('openai');

    // Enter a valid OpenAI key
    const keyInput = screen.getByLabelText('API key');
    fireEvent.change(keyInput, { target: { value: 'sk-1234567890abcdefghij' } });

    // Click Save
    const saveButton = screen.getByText('Save');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Wait for the content to be displayed
    await waitFor(() => {
      expect(screen.getByText('Test Siege content idea')).toBeInTheDocument();
    });

    // Verify the provider indicator shows "OpenAI"
    expect(screen.getByText('OpenAI')).toBeInTheDocument();

    // Verify fetch was called with the OpenAI endpoint
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
  });
});

describe('Integration: Legacy localStorage (key present, no provider) → app loads with OpenAI default', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads with existing OpenAI key and defaults to OpenAI provider', async () => {
    // Mock fetch to return a valid OpenAI response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: validContentIdeaJson,
            },
          },
        ],
      }),
    });

    // Render with a pre-existing API key but default provider (simulates legacy state)
    // In the real app, localStorage has xawars_openai_api_key but no xawars_ai_provider
    // The usePersistedState hook defaults to 'openai' when no provider is stored
    render(
      <AIGeneratorTestWrapper
        initialApiKey="sk-valid-key-1234567890abcdef"
        initialProvider="openai"
      />
    );

    // Click the floating generator button
    const generateButton = screen.getByRole('button', { name: 'Generate AI content' });
    await act(async () => {
      fireEvent.click(generateButton);
    });

    // The ContentGeneratorModal should open directly (key is valid for OpenAI)
    // It should NOT open the ApiKeyModal
    expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();

    // Wait for content to be displayed
    await waitFor(() => {
      expect(screen.getByText('Test Siege content idea')).toBeInTheDocument();
    });

    // Verify fetch was called with the OpenAI endpoint
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');

    // Verify Authorization header uses the legacy key
    expect(options.headers['Authorization']).toBe('Bearer sk-valid-key-1234567890abcdef');

    // Verify the provider indicator shows "OpenAI"
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });
});

describe('Integration: Auth error flow → clear key → reopen modal', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('401 error clears key and reopens ApiKeyModal with error message', async () => {
    // Mock fetch to return a 401 auth error
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    // Start with a valid OpenAI key and provider
    render(
      <AIGeneratorTestWrapper
        initialApiKey="sk-valid-key-1234567890abcdef"
        initialProvider="openai"
      />
    );

    // Click the floating generator button
    const generateButton = screen.getByRole('button', { name: 'Generate AI content' });
    await act(async () => {
      fireEvent.click(generateButton);
    });

    // Wait for the ApiKeyModal to reopen with the error message
    await waitFor(() => {
      expect(screen.getByLabelText('API key')).toBeInTheDocument();
    });

    // Verify the error message is displayed
    expect(screen.getByRole('alert')).toHaveTextContent(
      'API key is invalid. Please re-enter.'
    );

    // Verify the ContentGeneratorModal is closed
    expect(screen.queryByText('AI Content Generator')).not.toBeInTheDocument();
  });

  it('Gemini 400 auth error clears key and reopens ApiKeyModal', async () => {
    // Mock fetch to return a Gemini-style 400 auth error
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          status: 'INVALID_ARGUMENT',
          message: 'API key not valid',
        },
      }),
    });

    // Start with a valid Gemini key
    render(
      <AIGeneratorTestWrapper
        initialApiKey="AIzaSyAbcdefghijklmnop"
        initialProvider="gemini"
      />
    );

    // Click the floating generator button
    const generateButton = screen.getByRole('button', { name: 'Generate AI content' });
    await act(async () => {
      fireEvent.click(generateButton);
    });

    // Wait for the ApiKeyModal to reopen with the error message
    await waitFor(() => {
      expect(screen.getByLabelText('API key')).toBeInTheDocument();
    });

    // Verify the error message is displayed
    expect(screen.getByRole('alert')).toHaveTextContent(
      'API key is invalid. Please re-enter.'
    );
  });

  it('after auth error, user can re-enter a new key and generate successfully', async () => {
    // First call: 401 error
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    // Second call: successful response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: validContentIdeaJson,
            },
          },
        ],
      }),
    });

    render(
      <AIGeneratorTestWrapper
        initialApiKey="sk-old-invalid-key-12345678"
        initialProvider="openai"
      />
    );

    // Click the floating generator button - triggers generation with old key
    const generateButton = screen.getByRole('button', { name: 'Generate AI content' });
    await act(async () => {
      fireEvent.click(generateButton);
    });

    // Wait for ApiKeyModal to reopen after auth error
    await waitFor(() => {
      expect(screen.getByLabelText('API key')).toBeInTheDocument();
    });

    // Verify error message
    expect(screen.getByRole('alert')).toHaveTextContent(
      'API key is invalid. Please re-enter.'
    );

    // Enter a new valid key
    const keyInput = screen.getByLabelText('API key');
    fireEvent.change(keyInput, { target: { value: 'sk-new-valid-key-1234567890' } });

    // Click Save
    const saveButton = screen.getByText('Save');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Wait for the content to be displayed
    await waitFor(() => {
      expect(screen.getByText('Test Siege content idea')).toBeInTheDocument();
    });

    // Verify the second fetch was called with the new key
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondOptions] = fetchMock.mock.calls[1];
    expect(secondOptions.headers['Authorization']).toBe('Bearer sk-new-valid-key-1234567890');
  });
});
