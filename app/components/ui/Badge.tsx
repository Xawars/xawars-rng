import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'attack' | 'defense' | 'success' | 'error' | 'warning';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  className = '',
}: BadgeProps) {
  const baseStyles = "inline-flex items-center font-bold uppercase tracking-widest rounded-sm border";

  const variants = {
    default: "bg-zinc-800 text-zinc-300 border-zinc-700",
    attack: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    defense: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    success: "bg-green-500/10 text-green-400 border-green-500/30",
    error: "bg-red-500/10 text-red-400 border-red-500/30",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  };

  const sizes = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-1 text-xs",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
