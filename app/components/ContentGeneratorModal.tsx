'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, AlertCircle, History } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { ContentIdeaHistoryPanel } from './ContentIdeaHistoryPanel';
import { formatTitleVariations, formatThumbnailPrompts } from '../lib/formatters';
import { ContentIdea } from '../lib/openai';
import { PROVIDERS, type ProviderId } from '../lib/ai-providers';
import { useContentIdeaHistory, SavedContentIdea } from '../hooks/useContentIdeaHistory';

interface ContentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: ContentIdea | null;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  onClearApiKey: () => void;
  activeProvider: ProviderId;
  onChangeProvider: () => void;
}

export function ContentGeneratorModal({
  isOpen,
  onClose,
  idea,
  isGenerating,
  error,
  onGenerate,
  onClearApiKey,
  activeProvider,
  onChangeProvider,
}: ContentGeneratorModalProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<SavedContentIdea | null>(null);
  const { entries, addEntry, deleteEntry, clearAll, storageError } = useContentIdeaHistory();
  const prevIdeaRef = useRef<ContentIdea | null>(null);

  // Auto-save: when a new idea arrives, save it to history
  useEffect(() => {
    if (idea && idea !== prevIdeaRef.current) {
      addEntry(idea);
      setSelectedHistoryEntry(null);
    }
    prevIdeaRef.current = idea;
  }, [idea, addEntry]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-accent animate-in zoom-in-95 duration-300 slide-in-from-bottom-4">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-900 p-4 border-b border-white/5 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                AI Content Generator
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-400">
                  {PROVIDERS[activeProvider].displayName}
                </span>
                <button
                  type="button"
                  onClick={onChangeProvider}
                  className="text-xs text-amber-400 cursor-pointer hover:text-amber-300 transition-colors"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 rounded-lg text-black text-sm font-bold hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-yellow-500 active:scale-90"
              aria-label="Generate content"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} style={isGenerating ? { animationDuration: '2s' } : undefined} />
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              disabled={isGenerating}
              className={`p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                showHistory
                  ? 'text-amber-400 bg-zinc-800 hover:text-amber-300'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              aria-label="Toggle history"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Storage Error Banner */}
          {storageError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-start gap-2" role="alert">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300">{storageError}</p>
            </div>
          )}

          {showHistory ? (
            <ContentIdeaHistoryPanel
              entries={entries}
              onSelect={(entry) => {
                setSelectedHistoryEntry(entry);
                setShowHistory(false);
              }}
              onDelete={deleteEntry}
              onClearAll={clearAll}
            />
          ) : (
            <>
              {/* Loading State */}
              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-16 gap-5">
                  {/* Animated sparkle orb */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-yellow-500/20 animate-ping" />
                    <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 animate-pulse">
                      <Sparkles className="w-7 h-7 text-black animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                  </div>
                  {/* Shimmer bar */}
                  <div className="w-48 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 animate-shimmer" />
                  </div>
                  {/* Animated text */}
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-zinc-300 font-medium">Generating ideas</p>
                    <span className="inline-flex">
                      <span className="animate-bounce text-yellow-500 font-bold" style={{ animationDelay: '0ms' }}>.</span>
                      <span className="animate-bounce text-yellow-500 font-bold" style={{ animationDelay: '150ms' }}>.</span>
                      <span className="animate-bounce text-yellow-500 font-bold" style={{ animationDelay: '300ms' }}>.</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Error State */}
              {!isGenerating && error && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <p className="text-sm text-red-400 text-center">{error}</p>
                  <button
                    type="button"
                    onClick={onGenerate}
                    className="px-4 py-2 bg-zinc-800 border border-zinc-700/50 rounded-lg text-white text-sm hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={onClearApiKey}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Clear API Key
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!isGenerating && !error && !idea && !selectedHistoryEntry && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Sparkles className="w-8 h-8 text-zinc-600" />
                  <p className="text-sm text-zinc-500 text-center">
                    Click Generate to create content ideas
                  </p>
                </div>
              )}

              {/* Content Display - Generated Idea */}
              {!isGenerating && !error && idea && !selectedHistoryEntry && (
                <div className="space-y-6 animate-fade-in">
                  {/* Content Idea */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Content Idea
                      </h3>
                      <CopyButton text={idea.contentIdea} />
                    </div>
                    <p className="text-sm text-white leading-relaxed">{idea.contentIdea}</p>
                  </section>

                  {/* Title Variations */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Title Variations
                      </h3>
                      <CopyButton
                        text={formatTitleVariations(idea.titleVariations)}
                        label="Copy All"
                      />
                    </div>
                    <ol className="space-y-1.5">
                      {idea.titleVariations.map((title, index) => (
                        <li key={index} className="text-sm text-white">
                          <span className="text-zinc-500 mr-2">{index + 1}.</span>
                          {title}
                        </li>
                      ))}
                    </ol>
                  </section>

                  {/* Story Hook */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Story Hook
                      </h3>
                      <CopyButton text={idea.storyHook} />
                    </div>
                    <p className="text-sm text-white leading-relaxed">{idea.storyHook}</p>
                  </section>

                  {/* Mission Directive */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Mission Directive
                      </h3>
                      <CopyButton text={idea.missionDirective} />
                    </div>
                    <p className="text-sm text-white leading-relaxed">{idea.missionDirective}</p>
                  </section>

                  {/* Thumbnail Prompts */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Thumbnail Prompts
                      </h3>
                      <CopyButton
                        text={formatThumbnailPrompts(idea.thumbnailPrompts)}
                        label="Copy All"
                      />
                    </div>
                    <ol className="space-y-1.5">
                      {idea.thumbnailPrompts.map((prompt, index) => (
                        <li key={index} className="text-sm text-white">
                          <span className="text-zinc-500 mr-2">{index + 1}.</span>
                          {prompt}
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              )}

              {/* Content Display - Selected History Entry */}
              {!isGenerating && !error && selectedHistoryEntry && (
                <div className="space-y-6 animate-fade-in">
                  {/* Content Idea */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Content Idea
                      </h3>
                      <CopyButton text={selectedHistoryEntry.contentIdea} />
                    </div>
                    <p className="text-sm text-white leading-relaxed">{selectedHistoryEntry.contentIdea}</p>
                  </section>

                  {/* Title Variations */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Title Variations
                      </h3>
                      <CopyButton
                        text={formatTitleVariations(selectedHistoryEntry.titleVariations)}
                        label="Copy All"
                      />
                    </div>
                    <ol className="space-y-1.5">
                      {selectedHistoryEntry.titleVariations.map((title, index) => (
                        <li key={index} className="text-sm text-white">
                          <span className="text-zinc-500 mr-2">{index + 1}.</span>
                          {title}
                        </li>
                      ))}
                    </ol>
                  </section>

                  {/* Story Hook */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Story Hook
                      </h3>
                      <CopyButton text={selectedHistoryEntry.storyHook} />
                    </div>
                    <p className="text-sm text-white leading-relaxed">{selectedHistoryEntry.storyHook}</p>
                  </section>

                  {/* Mission Directive */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Mission Directive
                      </h3>
                      <CopyButton text={selectedHistoryEntry.missionDirective} />
                    </div>
                    <p className="text-sm text-white leading-relaxed">{selectedHistoryEntry.missionDirective}</p>
                  </section>

                  {/* Thumbnail Prompts */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Thumbnail Prompts
                      </h3>
                      <CopyButton
                        text={formatThumbnailPrompts(selectedHistoryEntry.thumbnailPrompts)}
                        label="Copy All"
                      />
                    </div>
                    <ol className="space-y-1.5">
                      {selectedHistoryEntry.thumbnailPrompts.map((prompt, index) => (
                        <li key={index} className="text-sm text-white">
                          <span className="text-zinc-500 mr-2">{index + 1}.</span>
                          {prompt}
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
