import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'glass';
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({
  className,
  variant = 'default',
  padding = 'md',
  ...props
}: CardProps) {
  const base = 'rounded-2xl transition-all duration-200';

  const variants: Record<string, string> = {
    default: 'bg-white border border-[var(--color-border-light)] shadow-[var(--shadow-sm)]',
    elevated: 'bg-[var(--color-bg-surface)] border border-[var(--color-border-light)] shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]',
    bordered: 'bg-white border-2 border-[var(--color-border-light)]',
    glass: 'glass-card shadow-[var(--shadow-md)]',
  };

  const paddings: Record<string, string> = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(base, variants[variant], paddings[padding], className)}
      {...props}
    />
  );
}

export default Card;
