import React from 'react';
import { X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({
  message,
  onRetry,
  onDismiss,
  className = '',
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={`rounded border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3 ${className}`}
    >
      <p className="text-sm text-red-400 flex-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded"
        >
          RETRY
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="text-red-400 hover:text-red-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
