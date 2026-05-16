import React, { useId } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Select({
  label,
  error,
  options,
  disabled = false,
  loading = false,
  className = '',
  id: externalId,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = externalId || generatedId;
  const errorId = `${selectId}-error`;

  const isDisabled = disabled || loading;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-zinc-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        disabled={isDisabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white transition duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-sm text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
