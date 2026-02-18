import React from 'react';
import { Card } from '../../../components/ui/Card';
import { usePayrollRuns } from '../hooks/usePayrollRuns';
import { formatAddress } from '../../../lib/utils';

const EXPLORER_TX = 'https://sepolia.etherscan.io/tx';

interface PayrollRunSummarySectionProps {
  employerAddress: string | undefined;
  className?: string;
}

export function PayrollRunSummarySection({
  employerAddress,
  className,
}: PayrollRunSummarySectionProps) {
  const { runs, isLoading, reload } = usePayrollRuns(employerAddress);

  if (!employerAddress) return null;

  return (
    <Card variant="elevated" padding="lg" className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
          Payroll run history
        </h3>
        <button
          type="button"
          onClick={() => reload()}
          className="text-xs font-medium text-[var(--color-primary)] hover:underline"
        >
          Refresh
        </button>
      </div>
      {isLoading ? (
        <p className="text-sm text-[var(--color-text-secondary)] py-4">Loading…</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] py-4">
          No payroll runs yet. Run payroll to see history here.
        </p>
      ) : (
        <div className="rounded-xl border border-[var(--color-border-light)] overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--color-bg-light)]">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase">
                  Employees paid
                </th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase">
                  Tx
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)]">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-[var(--color-primary)]/5">
                  <td className="px-4 py-2 text-[var(--color-text-primary)]">
                    {new Date(run.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-primary)]">
                    {run.employee_count}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <a
                      href={`${EXPLORER_TX}/${run.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[var(--color-primary)] hover:underline"
                    >
                      {formatAddress(run.tx_hash, 6)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
