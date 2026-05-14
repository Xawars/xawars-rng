import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentGeneratorModal } from '../ContentGeneratorModal';
import { ContentIdea } from '../../lib/openai';
import { ProviderId } from '../../lib/ai-providers';
import { SavedContentIdea } from '../../hooks/useContentIdeaHistory';

// Mock the useContentIdeaHistory hook
const mockAddEntry = vi.fn().mockReturnValue({ success: true });
const mockDeleteEntry = vi.fn();
const mockClearAll = vi.fn();
let mockEntries: SavedContentIdea[] = [];
let mockStorageError: string | null = null;

vi.mock('../../hooks/useContentIdeaHistory', () => ({
  useContentIdeaHistory: () => ({
    entries: mockEntries,
    addEntry: mockAddEntry,
    deleteEntry: mockDeleteEntry,
    clearAll: mockClearAll,
    storageError: mockStorageError,
  }),
}));

// Mock navigator.clipboard for CopyButton usage
beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  mockEntries = [];
  mockStorageError = null;
});

const mockIdea: ContentIdea = {
  contentIdea: 'Test content idea',
  titleVariations: ['Title One', 'Title Two', 'Title Three'],
  storyHook: 'Test story hook',
  missionDirective: 'Test mission directive',
  thumbnailPrompts: ['Prompt One', 'Prompt Two', 'Prompt Three'],
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  idea: null as ContentIdea | null,
  isGenerating: false,
  error: null as string | null,
  onGenerate: vi.fn(),
  onClearApiKey: vi.fn(),
  activeProvider: 'openai' as ProviderId,
  onChangeProvider: vi.fn(),
};

describe('ContentGeneratorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<ContentGeneratorModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('AI Content Generator')).not.toBeInTheDocument();
  });

  describe('Loading state', () => {
    it('shows generating animation with sparkle orb and shimmer', () => {
      render(<ContentGeneratorModal {...defaultProps} isGenerating={true} />);
      expect(screen.getByText('Generating ideas')).toBeInTheDocument();
      // The Generate button text changes to "Generating..."
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      // The sparkle orb has an animate-spin SVG
      const orb = screen.getByText('Generating ideas').closest('.flex')?.parentElement;
      const svg = orb?.querySelector('svg.animate-spin');
      expect(svg).not.toBeNull();
    });

    it('Generate button is disabled', () => {
      render(<ContentGeneratorModal {...defaultProps} isGenerating={true} />);
      const generateButton = screen.getByRole('button', { name: 'Generate content' });
      expect(generateButton).toBeDisabled();
    });
  });

  describe('Error state', () => {
    it('shows error message text', () => {
      render(
        <ContentGeneratorModal {...defaultProps} error="Network error. Check your connection." />
      );
      expect(screen.getByText('Network error. Check your connection.')).toBeInTheDocument();
    });

    it('shows "Try Again" button that calls onGenerate when clicked', () => {
      const onGenerate = vi.fn();
      render(
        <ContentGeneratorModal
          {...defaultProps}
          error="Something went wrong"
          onGenerate={onGenerate}
        />
      );
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      fireEvent.click(retryButton);
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content display', () => {
    it('renders all 5 section headings', () => {
      render(<ContentGeneratorModal {...defaultProps} idea={mockIdea} />);
      expect(screen.getByText('Content Idea')).toBeInTheDocument();
      expect(screen.getByText('Title Variations')).toBeInTheDocument();
      expect(screen.getByText('Story Hook')).toBeInTheDocument();
      expect(screen.getByText('Mission Directive')).toBeInTheDocument();
      expect(screen.getByText('Thumbnail Prompts')).toBeInTheDocument();
    });

    it('renders title variations as numbered list items', () => {
      render(<ContentGeneratorModal {...defaultProps} idea={mockIdea} />);
      // Numbers appear in both Title Variations and Thumbnail Prompts sections
      const ones = screen.getAllByText('1.');
      expect(ones.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Title One')).toBeInTheDocument();
      const twos = screen.getAllByText('2.');
      expect(twos.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Title Two')).toBeInTheDocument();
      const threes = screen.getAllByText('3.');
      expect(threes.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Title Three')).toBeInTheDocument();
    });

    it('renders thumbnail prompts as numbered list items', () => {
      render(<ContentGeneratorModal {...defaultProps} idea={mockIdea} />);
      expect(screen.getByText('Prompt One')).toBeInTheDocument();
      expect(screen.getByText('Prompt Two')).toBeInTheDocument();
      expect(screen.getByText('Prompt Three')).toBeInTheDocument();
    });
  });

  describe('Close interactions', () => {
    it('close button calls onClose', () => {
      const onClose = vi.fn();
      render(<ContentGeneratorModal {...defaultProps} onClose={onClose} />);
      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('backdrop click calls onClose', () => {
      const onClose = vi.fn();
      render(<ContentGeneratorModal {...defaultProps} onClose={onClose} />);
      // The backdrop is the outermost div with the onClick handler
      const backdrop = screen.getByText('AI Content Generator').closest(
        '.fixed.inset-0'
      ) as HTMLElement;
      // Simulate clicking directly on the backdrop (target === currentTarget)
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Provider indicator', () => {
    it('displays the active provider display name', () => {
      render(<ContentGeneratorModal {...defaultProps} activeProvider="openai" />);
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
    });

    it('displays OpenRouter when activeProvider is openrouter', () => {
      render(<ContentGeneratorModal {...defaultProps} activeProvider="openrouter" />);
      expect(screen.getByText('OpenRouter')).toBeInTheDocument();
    });

    it('displays Gemini when activeProvider is gemini', () => {
      render(<ContentGeneratorModal {...defaultProps} activeProvider="gemini" />);
      expect(screen.getByText('Gemini')).toBeInTheDocument();
    });

    it('shows a "Change" link that calls onChangeProvider when clicked', () => {
      const onChangeProvider = vi.fn();
      render(
        <ContentGeneratorModal {...defaultProps} onChangeProvider={onChangeProvider} />
      );
      const changeLink = screen.getByText('Change');
      expect(changeLink).toBeInTheDocument();
      fireEvent.click(changeLink);
      expect(onChangeProvider).toHaveBeenCalledTimes(1);
    });

    it('provider name uses text-xs and text-zinc-400 styling', () => {
      render(<ContentGeneratorModal {...defaultProps} activeProvider="openai" />);
      const providerName = screen.getByText('OpenAI');
      expect(providerName.className).toContain('text-xs');
      expect(providerName.className).toContain('text-zinc-400');
    });

    it('"Change" link uses text-xs and text-amber-400 styling', () => {
      render(<ContentGeneratorModal {...defaultProps} />);
      const changeLink = screen.getByText('Change');
      expect(changeLink.className).toContain('text-xs');
      expect(changeLink.className).toContain('text-amber-400');
    });
  });

  describe('History integration', () => {
    const mockHistoryEntry: SavedContentIdea = {
      id: 'test-uuid-1234',
      savedAt: new Date().toISOString(),
      contentIdea: 'A saved content idea from history',
      titleVariations: ['History Title 1', 'History Title 2', 'History Title 3'],
      storyHook: 'A saved story hook',
      missionDirective: 'A saved mission directive',
      thumbnailPrompts: ['Saved Prompt 1', 'Saved Prompt 2', 'Saved Prompt 3'],
    };

    it('history toggle button exists in header', () => {
      render(<ContentGeneratorModal {...defaultProps} />);
      const toggleButton = screen.getByRole('button', { name: 'Toggle history' });
      expect(toggleButton).toBeInTheDocument();
    });

    it('toggle button is disabled during generation', () => {
      render(<ContentGeneratorModal {...defaultProps} isGenerating={true} />);
      const toggleButton = screen.getByRole('button', { name: 'Toggle history' });
      expect(toggleButton).toBeDisabled();
    });

    it('clicking toggle shows history panel', () => {
      mockEntries = [];
      render(<ContentGeneratorModal {...defaultProps} />);
      const toggleButton = screen.getByRole('button', { name: 'Toggle history' });
      fireEvent.click(toggleButton);
      expect(screen.getByText('No ideas have been saved yet.')).toBeInTheDocument();
    });

    it('clicking toggle again hides history panel', () => {
      mockEntries = [];
      render(<ContentGeneratorModal {...defaultProps} />);
      const toggleButton = screen.getByRole('button', { name: 'Toggle history' });
      // Open
      fireEvent.click(toggleButton);
      expect(screen.getByText('No ideas have been saved yet.')).toBeInTheDocument();
      // Close
      fireEvent.click(toggleButton);
      expect(screen.queryByText('No ideas have been saved yet.')).not.toBeInTheDocument();
    });

    it('selecting an entry closes panel and displays full content', () => {
      mockEntries = [mockHistoryEntry];
      render(<ContentGeneratorModal {...defaultProps} />);

      // Open history panel
      const toggleButton = screen.getByRole('button', { name: 'Toggle history' });
      fireEvent.click(toggleButton);

      // Click on the entry
      const entryButton = screen.getByRole('button', { name: /View idea:/ });
      fireEvent.click(entryButton);

      // Panel should be closed and full content displayed
      expect(screen.queryByText('No ideas have been saved yet.')).not.toBeInTheDocument();
      expect(screen.getByText('A saved content idea from history')).toBeInTheDocument();
      expect(screen.getByText('History Title 1')).toBeInTheDocument();
      expect(screen.getByText('History Title 2')).toBeInTheDocument();
      expect(screen.getByText('History Title 3')).toBeInTheDocument();
      expect(screen.getByText('A saved story hook')).toBeInTheDocument();
      expect(screen.getByText('A saved mission directive')).toBeInTheDocument();
      expect(screen.getByText('Saved Prompt 1')).toBeInTheDocument();
      expect(screen.getByText('Saved Prompt 2')).toBeInTheDocument();
      expect(screen.getByText('Saved Prompt 3')).toBeInTheDocument();
    });

    it('storage error banner displays when storageError is set', () => {
      mockStorageError = 'Idea saved to session but could not be persisted.';
      render(<ContentGeneratorModal {...defaultProps} />);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Idea saved to session but could not be persisted.')).toBeInTheDocument();
    });
  });
});
