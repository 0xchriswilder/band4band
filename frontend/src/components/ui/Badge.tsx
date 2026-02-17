import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'default',
  size = 'sm',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const base = 'inline-flex items-center font-bold rounded-full';

  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-0.5 text-[11px] gap-1.5',
    md: 'px-3 py-1 text-xs gap-2',
  };

  const variants: Record<string, string> = {
    default: 'bg-[#f4eee6] text-[var(--color-text-primary)]',
    primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    success: 'bg-[var(--color-success-bg)] text-emerald-700',
    warning: 'bg-[var(--color-warning-bg)] text-amber-700',
    error: 'bg-[var(--color-error-bg)] text-red-700',
    info: 'bg-[var(--color-info-bg)] text-blue-700',
  };

  const dotColors: Record<string, string> = {
    default: 'bg-[var(--color-text-tertiary)]',
    primary: 'bg-[var(--color-primary)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    error: 'bg-[var(--color-error)]',
    info: 'bg-[var(--color-info)]',
  };

  return (
    <span className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse-dot', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

export default Badge;
