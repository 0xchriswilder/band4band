import React, { useEffect, useState } from 'react';
import { UserCircle } from 'lucide-react';
import { cn, toDirectImageUrl } from '../lib/utils';

export function Avatar({
  src,
  fallbackText,
  className,
}: {
  src?: string | null;
  fallbackText?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = src?.trim() ? toDirectImageUrl(src.trim()) : '';

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (!resolved || failed) {
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
          <UserCircle className="h-5 w-5 max-h-full max-w-full shrink-0" />
        )}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt=""
      className={cn(
        'rounded-lg object-cover border border-[var(--color-border-light)] shrink-0',
        className
      )}
      crossOrigin="anonymous"
      onError={() => setFailed(true)}
    />
  );
}

