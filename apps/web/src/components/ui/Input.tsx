'use client';

import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    const inputStyles = `
      w-full px-4 py-3 rounded-xl
      bg-background-secondary
      border border-transparent
      text-text-primary placeholder-text-tertiary
      focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent
      transition-all
      ${error ? 'border-accent-red focus:ring-accent-red' : ''}
      ${className}
    `;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-2">
            {label}
          </label>
        )}
        <input ref={ref} className={inputStyles} {...props} />
        {hint && !error && (
          <p className="mt-1.5 text-sm text-text-secondary">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-accent-red">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
