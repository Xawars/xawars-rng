import React from 'react';

interface DividerProps {
  text?: string;
  className?: string;
}

export function Divider({ text, className = '' }: DividerProps) {
  if (!text) {
    return <div className={`border-t border-zinc-700 ${className}`} />;
  }

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex-1 border-t border-zinc-700" />
      <span className="mx-4 text-xs uppercase tracking-wider text-zinc-500">{text}</span>
      <div className="flex-1 border-t border-zinc-700" />
    </div>
  );
}
