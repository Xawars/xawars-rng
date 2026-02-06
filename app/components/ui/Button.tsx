import { LucideIcon } from 'lucide-react';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  
  const baseStyles = "inline-flex items-center justify-center font-bold uppercase tracking-wider rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20 active:translate-y-0.5",
    danger: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 active:translate-y-0.5",
    outline: "border-2 border-white/20 hover:border-white/50 text-white hover:bg-white/5 active:bg-white/10",
    ghost: "text-white/60 hover:text-white hover:bg-white/5"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-6 py-3 text-sm gap-2",
    lg: "px-8 py-4 text-base gap-3"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
      {children}
    </button>
  );
}
