import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  color?: 'green' | 'yellow' | 'red';
  className?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ProgressBar({
  value,
  color = 'green',
  className = '',
}: ProgressBarProps) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  const clampedValue = clamp(value, 0, 100);

  return (
    <div
      className={`bg-zinc-800 rounded-full h-2 w-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`rounded-full h-full transition-all duration-300 ${colors[color]}`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
