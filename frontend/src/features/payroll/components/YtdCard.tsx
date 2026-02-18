import React from 'react';
import { Card } from '../../../components/ui/Card';
import { DollarSign } from 'lucide-react';
import { useEmployeeYtd } from '../hooks/useEmployeeYtd';
import { formatAmount } from '../../../lib/utils';
import { TOKEN_CONFIG } from '../../../lib/contracts';

interface YtdCardProps {
  employeeAddress: string | undefined;
  decryptedValues: Record<string, bigint>;
  decimals?: number;
}

export function YtdCard({
  employeeAddress,
  decryptedValues,
  decimals = TOKEN_CONFIG.decimals,
}: YtdCardProps) {
  const { paymentsInYear, isLoading } = useEmployeeYtd(employeeAddress);
  const year = new Date().getFullYear();

  const ytdSum = React.useMemo(() => {
    let sum = 0n;
    for (const p of paymentsInYear) {
      const key = `${p.tx_hash}-${p.employee}`;
      const amount = decryptedValues[key];
      if (amount !== undefined) sum += amount;
    }
    return sum;
  }, [paymentsInYear, decryptedValues]);

  const decryptedCount = React.useMemo(() => {
    let n = 0;
    for (const p of paymentsInYear) {
      const key = `${p.tx_hash}-${p.employee}`;
      if (decryptedValues[key] !== undefined) n++;
    }
    return n;
  }, [paymentsInYear, decryptedValues]);

  if (!employeeAddress) return null;

  return (
    <Card variant="elevated" padding="md" className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
        <DollarSign className="w-5 h-5 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-0.5">
          Year to date ({year})
        </p>
        {isLoading ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
        ) : paymentsInYear.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No payments this year</p>
        ) : decryptedCount === paymentsInYear.length && ytdSum > 0n ? (
          <p className="text-lg font-bold text-[var(--color-text-primary)]">
            {formatAmount(ytdSum, decimals)} {TOKEN_CONFIG.symbol}
          </p>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {paymentsInYear.length} payment{paymentsInYear.length !== 1 ? 's' : ''} — decrypt payments below to see total
          </p>
        )}
      </div>
    </Card>
  );
}
