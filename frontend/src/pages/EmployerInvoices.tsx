import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, RefreshCw, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useEmployerInvoices } from '../hooks/usePayrollHistory';
import { formatAddress } from '../lib/utils';
import { ConnectWalletCTA } from '../components/ConnectWalletCTA';
import { useAccount } from 'wagmi';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function EmployerInvoices() {
  const { isConnected } = useAccount();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { invoices, isLoading, reload } = useEmployerInvoices(month);

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <ConnectWalletCTA />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/employer"
            className="p-2 rounded-lg hover:bg-[var(--color-primary)]/10 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
            title="Back to Employer Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <FileText className="h-7 w-7 text-[var(--color-primary)]" />
              Invoices
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              View employee invoices by month. Use the Employer Dashboard to run payroll or pay individuals.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-[var(--color-border-input)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          />
          <Button variant="secondary" size="sm" onClick={() => reload()} disabled={isLoading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <Card variant="elevated" padding="lg">
          {isLoading ? (
            <div className="py-16 text-center">
              <p className="text-[var(--color-text-tertiary)]">Loading invoices…</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex justify-center mb-4">
                <FileText className="h-12 w-12 text-[var(--color-text-tertiary)]/50" />
              </div>
              <p className="text-[var(--color-text-secondary)]">No invoices submitted for this month.</p>
              <Link to="/employer" className="inline-block mt-4 text-[var(--color-primary)] font-medium hover:underline">
                Back to Employer Dashboard
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border-light)]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Employee Address</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {invoices.map((inv, i) => (
                    <tr key={inv.id} className="hover:bg-[var(--color-bg-light)]/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-[var(--color-text-primary)] font-medium">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          {inv.data?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{inv.data?.role ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-[var(--color-text-primary)]">{formatAddress(inv.employee_address, 10)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
