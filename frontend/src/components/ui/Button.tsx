import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    'relative inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
  };

  const variants: Record<string, string> = {
    primary:
      'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/25 hover:bg-orange-600 active:scale-[0.98] focus-visible:ring-[var(--color-primary)]',
    secondary:
      'border-2 border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-white hover:bg-[#f4eee6] active:scale-[0.98] focus-visible:ring-[var(--color-primary)]',
    ghost:
      'text-[var(--color-text-primary)] hover:bg-[#f4eee6] active:bg-[var(--color-primary)]/10',
    danger:
      'bg-[var(--color-error)] text-white shadow-lg shadow-[var(--color-error)]/25 hover:bg-red-600 active:scale-[0.98] focus-visible:ring-red-400',
    success:
      'bg-[var(--color-success)] text-white shadow-lg shadow-[var(--color-success)]/25 hover:bg-emerald-600 active:scale-[0.98] focus-visible:ring-emerald-400',
  };

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export default Button;
