import React from 'react';

interface DeltaIndicatorProps {
  value: number;
  className?: string;
}

export function DeltaIndicator({ value, className = '' }: DeltaIndicatorProps) {
  if (value > 0) {
    return (
      <span className={`text-xs font-medium text-green-400 ${className}`}>
        <span aria-hidden="true">▲</span> +{value}
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className={`text-xs font-medium text-red-400 ${className}`}>
        <span aria-hidden="true">▼</span> {value}
      </span>
    );
  }

  return (
    <span className={`text-xs font-medium text-zinc-400 ${className}`}>
      —
    </span>
  );
}
