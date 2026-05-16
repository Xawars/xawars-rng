import React from 'react';

interface CardProps {
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export function Card({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
}: CardProps) {
  const baseStyles = 'rounded-xl';

  const variants = {
    default: 'bg-zinc-900 border border-zinc-700 shadow-md',
    elevated: 'bg-zinc-800 border border-zinc-700 shadow-lg',
    interactive: 'bg-zinc-900 border border-zinc-700 shadow-md hover:border-zinc-500 transition-all duration-200 cursor-pointer',
  };

  const paddings = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}
