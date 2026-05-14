import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContentIdeaHistoryPanel } from '../ContentIdeaHistoryPanel';
import { SavedContentIdea } from '../../hooks/useContentIdeaHistory';

// Mock lucide-react icons to avoid SVG rendering issues in tests
vi.mock('lucide-react', () => ({
  Trash2: ({ className }: { className?: string }) => (
    <svg data-testid="trash-icon" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg data-testid="clock-icon" className={className} />
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-icon" className={className} />
  ),
}));

function createEntry(overrides: Partial<SavedContentIdea> = {}): SavedContentIdea {
  return {
    id: 'test-id-1',
    savedAt: '2025-01-15T10:00:00.000Z',
    contentIdea: 'A short content idea',
    titleVariations: ['Title A', 'Title B', 'Title C'],
    storyHook: 'What if I told you...',
    missionDirective: 'Drop a comment below',
    thumbnailPrompts: ['Close-up shot', 'Wide angle', 'Action shot'],
    ...overrides,
  };
}

describe('ContentIdeaHistoryPanel', () => {
  let onSelect: ReturnType<typeof vi.fn<(entry: SavedContentIdea) => void>>;
  let onDelete: ReturnType<typeof vi.fn<(id: string) => void>>;
  let onClearAll: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
    onSelect = vi.fn<(entry: SavedContentIdea) => void>();
    onDelete = vi.fn<(id: string) => void>();
    onClearAll = vi.fn<() => void>();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('empty state', () => {
    it('displays empty state message when entries array is empty', () => {
      render(
        <ContentIdeaHistoryPanel
          entries={[]}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );
      expect(screen.getByText('No ideas have been saved yet.')).toBeInTheDocument();
    });

    it('does not render the entry list or clear all button when empty', () => {
      render(
        <ContentIdeaHistoryPanel
          entries={[]}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Clear all history')).not.toBeInTheDocument();
    });
  });

  describe('rendering entries', () => {
    it('renders entries in the order provided', () => {
      const entries = [
        createEntry({ id: 'id-1', contentIdea: 'First idea', savedAt: '2025-01-15T11:00:00.000Z' }),
        createEntry({ id: 'id-2', contentIdea: 'Second idea', savedAt: '2025-01-15T10:00:00.000Z' }),
        createEntry({ id: 'id-3', contentIdea: 'Third idea', savedAt: '2025-01-15T09:00:00.000Z' }),
      ];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('First idea');
      expect(items[1]).toHaveTextContent('Second idea');
      expect(items[2]).toHaveTextContent('Third idea');
    });

    it('shows truncated preview for long content ideas', () => {
      const longText = 'A'.repeat(150);
      const entries = [createEntry({ contentIdea: longText })];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      // truncatePreview(longText, 100) should produce first 100 chars + "…"
      const expectedPreview = 'A'.repeat(100) + '\u2026';
      expect(screen.getByText(expectedPreview)).toBeInTheDocument();
    });

    it('shows full text for short content ideas (no truncation)', () => {
      const shortText = 'Short idea text';
      const entries = [createEntry({ contentIdea: shortText })];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText(shortText)).toBeInTheDocument();
    });

    it('shows formatted timestamps for each entry', () => {
      // 2 hours ago from system time (2025-01-15T12:00:00Z)
      const entries = [
        createEntry({ id: 'id-1', savedAt: '2025-01-15T10:00:00.000Z' }),
      ];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    it('shows absolute date for timestamps older than 7 days', () => {
      const entries = [
        createEntry({ id: 'id-1', savedAt: '2024-12-01T10:00:00.000Z' }),
      ];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('Dec 1, 2024')).toBeInTheDocument();
    });

    it('displays the entry count in the header', () => {
      const entries = [
        createEntry({ id: 'id-1' }),
        createEntry({ id: 'id-2' }),
      ];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('Saved Ideas (2)')).toBeInTheDocument();
    });
  });

  describe('selecting an entry', () => {
    it('calls onSelect with the correct entry when clicked', () => {
      const entry = createEntry({ id: 'id-1', contentIdea: 'Click me' });
      const entries = [entry];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      fireEvent.click(screen.getByText('Click me'));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(entry);
    });
  });

  describe('deleting an entry', () => {
    it('calls onDelete with the correct ID when delete button is clicked', () => {
      const entries = [
        createEntry({ id: 'entry-to-delete', contentIdea: 'Delete this' }),
      ];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      const deleteButton = screen.getByLabelText('Delete idea');
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith('entry-to-delete');
    });

    it('does not call onSelect when delete button is clicked', () => {
      const entries = [createEntry({ id: 'id-1' })];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      const deleteButton = screen.getByLabelText('Delete idea');
      fireEvent.click(deleteButton);

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('clear all', () => {
    it('shows confirmation dialog when Clear All is clicked', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const entries = [createEntry({ id: 'id-1' })];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      fireEvent.click(screen.getByLabelText('Clear all history'));

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to clear all saved ideas? This cannot be undone.'
      );
      confirmSpy.mockRestore();
    });

    it('calls onClearAll when user confirms', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const entries = [createEntry({ id: 'id-1' })];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      fireEvent.click(screen.getByLabelText('Clear all history'));

      expect(onClearAll).toHaveBeenCalledTimes(1);
      confirmSpy.mockRestore();
    });

    it('does not call onClearAll when user cancels', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const entries = [createEntry({ id: 'id-1' })];

      render(
        <ContentIdeaHistoryPanel
          entries={entries}
          onSelect={onSelect}
          onDelete={onDelete}
          onClearAll={onClearAll}
        />
      );

      fireEvent.click(screen.getByLabelText('Clear all history'));

      expect(onClearAll).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });
});
