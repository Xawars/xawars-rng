'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
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
  } = useRivalry(prefilledOperator);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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

          {/* Comparison Display */}
          {comparison && leftOperator && rightOperator && (
            <div
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
