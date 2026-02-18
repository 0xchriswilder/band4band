import React, { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { toDirectImageUrl } from '../lib/utils';
import { cn } from '../lib/utils';

/** Renders employer/company logo with fallback when image is blocked (e.g. COEP). */
export function EmployerLogo({
  logoUrl,
  fallbackText,
  className,
  imageClassName,
}: {
  logoUrl: string | null | undefined;
  fallbackText?: string | null;
  className?: string;
  imageClassName?: string;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const resolvedUrl = logoUrl?.trim() ? toDirectImageUrl(logoUrl.trim()) : '';

  useEffect(() => {
    setLoadFailed(false);
  }, [resolvedUrl]);

  if (!resolvedUrl || loadFailed) {
    const letter = fallbackText?.trim()?.charAt(0)?.toUpperCase();
    return (
      <div
        className={cn(
          'flex items-center justify-center shrink-0 rounded-lg border border-[var(--color-primary)]/10 bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold',
          className
        )}
        aria-hidden
      >
        {letter ? (
          <span className="text-sm leading-none">{letter}</span>
        ) : (
          <Briefcase className="h-5 w-5 max-h-full max-w-full shrink-0" />
        )}
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt=""
      className={cn('rounded-lg object-cover border border-[var(--color-border-light)] shrink-0', imageClassName ?? className)}
      crossOrigin="anonymous"
      onError={() => setLoadFailed(true)}
    />
  );
}
