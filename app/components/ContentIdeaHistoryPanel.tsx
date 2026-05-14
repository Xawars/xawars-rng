'use client';

import { Trash2, Clock, AlertTriangle } from 'lucide-react';
import { SavedContentIdea } from '../hooks/useContentIdeaHistory';
import { truncatePreview, formatRelativeTime } from '../lib/history-formatters';

interface ContentIdeaHistoryPanelProps {
  entries: SavedContentIdea[];
  onSelect: (entry: SavedContentIdea) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function ContentIdeaHistoryPanel({
  entries,
  onSelect,
  onDelete,
  onClearAll,
}: ContentIdeaHistoryPanelProps) {
  const handleClearAll = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all saved ideas? This cannot be undone.'
    );
    if (confirmed) {
      onClearAll();
    }
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Clock className="w-8 h-8 text-zinc-600" />
        <p className="text-sm text-zinc-500 text-center">
          No ideas have been saved yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header with Clear All */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Saved Ideas ({entries.length})
        </span>
        <button
          type="button"
          onClick={handleClearAll}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label="Clear all history"
        >
          <AlertTriangle className="w-3 h-3" />
          Clear All
        </button>
      </div>

      {/* Entry List */}
      <ul className="space-y-2" role="list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(entry)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(entry);
                }
              }}
              className="w-full text-left p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:bg-zinc-800 hover:border-zinc-600/50 transition-colors group focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              aria-label={`View idea: ${truncatePreview(entry.contentIdea, 50)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-relaxed truncate">
                    {truncatePreview(entry.contentIdea, 100)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {formatRelativeTime(entry.savedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                  className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={`Delete idea`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
