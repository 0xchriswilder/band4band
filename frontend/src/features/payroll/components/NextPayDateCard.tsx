import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Calendar } from 'lucide-react';
import { useNextPayDate } from '../hooks/useNextPayDate';

interface NextPayDateCardProps {
  employerAddress: string | undefined;
  className?: string;
}

export function NextPayDateCard({ employerAddress, className }: NextPayDateCardProps) {
  const { lastRunDate, nextSuggestedDate, isLoading } = useNextPayDate(employerAddress);

  if (!employerAddress) return null;

  return (
    <Card variant="elevated" padding="md" className={className}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-0.5">
            Pay schedule
          </p>
          {isLoading ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
          ) : lastRunDate ? (
            <>
              <p className="text-sm text-[var(--color-text-primary)]">
                Last payroll: {lastRunDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              {nextSuggestedDate && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Next suggested (monthly): {nextSuggestedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">No payroll runs yet</p>
          )}
        </div>
      </div>
    </Card>
  );
}
