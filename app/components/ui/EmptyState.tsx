import React from 'react';

interface EmptyStateProps {
  message?: string;
  action?: React.ReactNode;
  minHeight?: string;
  className?: string;
}

export function EmptyState({
  message = 'WAITING FOR INTEL...',
  action,
  minHeight = '300px',
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center ${className}`}
      style={{ minHeight }}
    >
      <p className="font-mono uppercase tracking-widest text-sm text-zinc-500">
        {message}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
