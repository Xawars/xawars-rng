'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Share2, X } from 'lucide-react';
import { useRivalry } from '../../hooks/useRivalry';
import { RivalrySelector } from './RivalrySelector';
import { RivalryStatCard } from './RivalryStatCard';
import type { Operator } from '../../data/types';

interface RivalryViewProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledOperator?: Operator | null;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function RivalryView({ isOpen, onClose, prefilledOperator }: RivalryViewProps) {
  const {
    leftOperator,
    rightOperator,
    setLeftOperator,
    setRightOperator,
    comparison,
    validationError,
    isExporting,
    exportImage,
    comparisonRef,
  } = useRivalry(prefilledOperator);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Store previous focus and set initial focus on open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 0);

      return () => clearTimeout(timer);
    } else {
      // Return focus to trigger element on close
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap: Tab/Shift+Tab wrap within modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  // Export handler with error toast (Task 6.2)
  const handleExport = useCallback(async () => {
    setExportError(null);
    try {
      await exportImage();
    } catch (err) {
      setExportError('Export failed. Please try again.');
    }
  }, [exportImage]);

  // Auto-dismiss export error toast after 4 seconds
  useEffect(() => {
    if (!exportError) return;
    const timer = setTimeout(() => setExportError(null), 4000);
    return () => clearTimeout(timer);
  }, [exportError]);

  if (!isOpen) return null;

  // Determine verdict display text
  const verdictDisplay = comparison?.verdict
    ? comparison.verdict.message
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Operator Rivalry Comparison"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed inset-0 z-50 flex flex-col bg-zinc-900 overflow-y-auto scrollbar-accent"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
          <h2 className="text-lg font-black text-white uppercase tracking-wide">
            Operator Rivalry
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/5 rounded p-1.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            aria-label="Close rivalry view"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center p-4 gap-6">
          {/* Operator Selector */}
          <RivalrySelector
            leftOperator={leftOperator}
            rightOperator={rightOperator}
            onSelectLeft={setLeftOperator}
            onSelectRight={setRightOperator}
            validationError={validationError}
          />

          {/* Comparison Display (exportable area) */}
          {comparison && leftOperator && rightOperator && (
            <>
              <div
                ref={comparisonRef}
                className="w-full max-w-md flex flex-col gap-2 p-4 rounded-xl bg-zinc-900 border border-zinc-700/50"
              >
                {/* Operator names header */}
                <div className="flex items-center justify-between mb-2 px-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wide">
                    {leftOperator.name}
                  </span>
                  <span className="text-xs font-bold text-white uppercase tracking-wide">
                    {rightOperator.name}
                  </span>
                </div>

                {/* Stat Cards */}
                {comparison.statCards.map((statCard) => (
                  <RivalryStatCard
                    key={statCard.metric}
                    result={statCard}
                    leftOperatorName={leftOperator.name}
                    rightOperatorName={rightOperator.name}
                  />
                ))}

                {/* Verdict Summary */}
                {verdictDisplay && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/50 text-center">
                    <p className="text-sm font-bold text-zinc-200">
                      {verdictDisplay}
                    </p>
                  </div>
                )}

                {/* XA Wars RNG Watermark */}
                <div className="mt-2 text-center">
                  <span className="text-[9px] text-zinc-600 font-medium tracking-wider uppercase">
                    XA Wars RNG
                  </span>
                </div>
              </div>

              {/* Export/Share Button */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-700 hover:border-zinc-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                aria-label="Share rivalry comparison as image"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
                {isExporting ? 'Exporting...' : 'Share'}
              </button>
            </>
          )}
        </div>

        {/* Error toast (non-blocking) */}
        {exportError && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 px-4 py-2 rounded-lg bg-red-900/90 border border-red-700/50 text-red-200 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
            role="alert"
          >
            {exportError}
          </div>
        )}
      </div>
    </>
  );
}
