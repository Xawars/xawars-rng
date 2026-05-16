import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Input({
  label,
  error,
  helperText,
  disabled = false,
  loading = false,
  className = '',
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  const baseStyles =
    'w-full bg-zinc-800/50 border-2 border-zinc-700 rounded-md px-4 py-3 text-sm text-white placeholder-zinc-500 transition duration-200 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900';

  const errorStyles = error ? 'border-red-500' : '';
  const disabledStyles = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-zinc-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled || loading}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${baseStyles} ${errorStyles} ${disabledStyles} ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-zinc-500">{helperText}</p>
      )}
    </div>
  );
}
