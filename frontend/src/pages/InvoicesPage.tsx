import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useEmployeeProfile, useEmployeeInvoices } from '../hooks/usePayrollHistory';
import { usePayrollEmployer } from '../hooks/usePayrollEmployer';
import { EmployerInvoices } from './EmployerInvoices';
import { useAccount } from 'wagmi';
import { ConnectWalletCTA } from '../components/ConnectWalletCTA';

/**
 * Role-aware Invoices page: employees see "My Invoices", employers see the employer invoice list.
 */
export function InvoicesPage() {
  const { isConnected } = useAccount();
  const { isEmployee, isLoading: employeeLoading } = useEmployeeProfile();
  const { hasPayroll } = usePayrollEmployer();
  const { invoices, isLoading: invoicesLoading } = useEmployeeInvoices();

  if (!isConnected) {
    return (
      <ConnectWalletCTA
        embedded
        icon={FileText}
        title="Invoices"
        titleAccent=""
        subtitle="Connect your wallet to view your invoices or manage employee invoices."
      />
    );
  }

  if (hasPayroll) {
    return <EmployerInvoices />;
  }

  if (employeeLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--color-text-secondary)]">Loading…</p>
      </div>
    );
  }

  if (isEmployee) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/employee"
            className="p-2 rounded-lg hover:bg-[var(--color-bg-light)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
            aria-label="Back to Employee Portal"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <FileText className="h-7 w-7 text-[var(--color-primary)]" />
              My Invoices
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Invoices you’ve submitted. They’re marked paid when your employer runs payroll.
            </p>
          </div>
        </div>

        <Card variant="elevated" padding="lg">
          {invoicesLoading ? (
            <p className="text-sm text-[var(--color-text-tertiary)] py-6 text-center">Loading invoices…</p>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 text-[var(--color-text-tertiary)] mx-auto mb-3 opacity-60" />
              <p className="text-[var(--color-text-primary)] font-medium mb-1">No invoices yet</p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Submit an invoice from the Employee Portal to get started.
              </p>
              <Link
                to="/employee"
                className="text-[var(--color-primary)] font-medium hover:underline inline-flex items-center gap-1"
              >
                Go to Employee Portal <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {invoices.map((inv) => {
                const monthLabel = inv.month_due
                  ? new Date(inv.month_due + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                  : inv.month_due;
                const isPaid = !!inv.paid_at;
                return (
                  <li
                    key={`${inv.employee_address}-${inv.month_due}`}
                    className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[var(--color-bg-light)]"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-[var(--color-text-primary)]">{monthLabel}</span>
                      {inv.data?.name && (
                        <span className="text-sm text-[var(--color-text-secondary)] ml-2">
                          {inv.data.name}
                          {inv.data?.role ? ` · ${inv.data.role}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isPaid ? (
                        <>
                          <Badge variant="success" size="sm">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </Badge>
                          {inv.paid_tx_hash && (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${inv.paid_tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono text-[var(--color-primary)] hover:underline"
                            >
                              Tx: {inv.paid_tx_hash.slice(0, 10)}...
                            </a>
                          )}
                        </>
                      ) : (
                        <Badge variant="default" size="sm">Pending</Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <FileText className="h-12 w-12 text-[var(--color-text-tertiary)] mx-auto mb-3 opacity-60" />
      <p className="text-[var(--color-text-primary)] font-medium mb-1">Invoices</p>
      <p className="text-sm text-[var(--color-text-secondary)] mb-4">
        As an employer, register a payroll first to see employee invoices. As an employee, submit invoices from the Employee Portal.
      </p>
      <div className="flex gap-3 justify-center">
        <Link to="/employer" className="text-[var(--color-primary)] font-medium hover:underline">
          Employer Dashboard
        </Link>
        <Link to="/employee" className="text-[var(--color-primary)] font-medium hover:underline">
          Employee Portal
        </Link>
      </div>
    </div>
  );
}
