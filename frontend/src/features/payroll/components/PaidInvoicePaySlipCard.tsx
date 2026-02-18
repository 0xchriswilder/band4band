import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { EmployeeInvoiceRow } from '../../../lib/supabase';
import { formatAddress } from '../../../lib/utils';
import { TOKEN_CONFIG } from '../../../lib/contracts';

interface PaidInvoicePaySlipCardProps {
  invoice: EmployeeInvoiceRow;
  employerName: string | null;
  employeeAddress: string;
  onClose?: () => void;
}

function formatPeriod(monthDue: string): string {
  if (!monthDue) return '—';
  try {
    const [y, m] = monthDue.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  } catch {
    return monthDue;
  }
}

function formatTimeAgo(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const sec = Math.floor((now - d.getTime()) / 1000);
    if (sec < 60) return `${sec} secs ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)} mins ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
    if (sec < 2592000) return `${Math.floor(sec / 86400)} days ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

export function PaidInvoicePaySlipCard({
  invoice,
  employerName,
  employeeAddress,
  onClose,
}: PaidInvoicePaySlipCardProps) {
  const period = formatPeriod(invoice.month_due);
  const paidAt = invoice.paid_at ?? invoice.created_at;
  const timeAgo = paidAt ? formatTimeAgo(paidAt) : '—';
  const timestampFull = paidAt
    ? new Date(paidAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }) + ' UTC'
    : '—';

  return (
    <Card variant="elevated" padding="lg" className="bg-[var(--color-bg-light)] border-2 border-[var(--color-border-light)]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{period}</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Your onchain pay slip is available.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1 rounded"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
      <hr className="border-[var(--color-border-light)] mb-4" />
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[var(--color-text-tertiary)] font-medium">From</dt>
          <dd className="text-[var(--color-text-primary)] font-medium mt-0.5">
            {employerName || formatAddress(invoice.employer_address, 8)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-tertiary)] font-medium">To</dt>
          <dd className="font-mono text-[var(--color-text-primary)] mt-0.5">
            {formatAddress(employeeAddress, 10)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-tertiary)] font-medium">Timestamp</dt>
          <dd className="text-[var(--color-text-primary)] mt-0.5">
            {timeAgo} ({timestampFull})
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-tertiary)] font-medium">Value</dt>
          <dd className="text-[var(--color-text-primary)] font-mono mt-0.5 flex items-center gap-2">
            <span className="text-amber-600 font-bold">******</span>
            <span>{TOKEN_CONFIG.symbol}</span>
          </dd>
        </div>
      </dl>
      {invoice.paid_tx_hash && (
        <a
          href={`https://sepolia.etherscan.io/tx/${invoice.paid_tx_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-xs font-medium text-[var(--color-primary)] hover:underline"
        >
          View transaction →
        </a>
      )}
    </Card>
  );
}
