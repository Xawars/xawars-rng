import { LucideIcon } from 'lucide-react';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  loading = false,
  disabled = false,
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseStyles = "inline-flex items-center justify-center font-bold uppercase tracking-wider rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900";
  
  const disabledStyles = "disabled:opacity-50 disabled:cursor-not-allowed";

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
      className={`${baseStyles} ${disabledStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Please wait...
        </>
      ) : (
        <>
          {Icon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} aria-hidden="true" />}
          {children}
        </>
      )}
    </button>
  );
}
