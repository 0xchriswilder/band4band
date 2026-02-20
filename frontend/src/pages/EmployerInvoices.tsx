import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FileText, RefreshCw, CheckCircle2, ArrowLeft, Play, DollarSign, Unlock, Lock, Users, Shield } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useEmployerInvoices, useEmployerLatestPaymentHandles, markInvoicesPaidForMonth } from '../hooks/usePayrollHistory';
import { usePayrollEmployer } from '../hooks/usePayrollEmployer';
import { useFhevmDecrypt } from '../hooks/useFhevmDecrypt';
import { formatAddress, formatAmount, getUserFriendlyErrorMessage } from '../lib/utils';
import { CONTRACTS, TOKEN_CONFIG } from '../lib/contracts';
import { ConnectWalletCTA } from '../components/ConnectWalletCTA';
import { useAccount } from 'wagmi';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function EmployerInvoices() {
  const { isConnected, address: employerAddress } = useAccount();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { invoices, isLoading, error, reload } = useEmployerInvoices(month);
  const { handles: salaryHandles, reload: reloadPaymentHandles } = useEmployerLatestPaymentHandles();
  const {
    payOneSalary,
    payAllSalaries,
    localEmployees,
    hasPayroll,
    isOperatorSet,
    isWriting,
    isEncrypting,
  } = usePayrollEmployer();
  const { decryptHandleBatch, isDecrypting: isDecryptingFhe } = useFhevmDecrypt();

  const [paySalaries, setPaySalaries] = useState<Record<string, string>>({});
  const [decryptedSalaries, setDecryptedSalaries] = useState<Record<string, bigint>>({});
  const [payingEmployee, setPayingEmployee] = useState<string | null>(null);

  const invoicedAddresses = new Set(invoices.map((i) => i.employee_address.toLowerCase()));
  const invoicedEmployees = localEmployees.filter((e) => invoicedAddresses.has(e.address.toLowerCase()));
  const payableForBatch = invoicedEmployees.filter((e) => {
    const amt = paySalaries[e.address] ?? e.salary;
    return amt && Number(amt) > 0;
  });

  const handleRunPayroll = async () => {
    if (!employerAddress || payableForBatch.length === 0) return;
    try {
      const list = payableForBatch.map((e) => ({
        address: e.address,
        salary: paySalaries[e.address] ?? e.salary,
      }));
      const hash = await payAllSalaries(list);
      if (hash) {
        await markInvoicesPaidForMonth(
          employerAddress,
          payableForBatch.map((e) => e.address),
          month,
          hash
        );
        reload();
        reloadPaymentHandles();
        toast.success('Payroll executed and invoices marked paid');
      }
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Payroll failed'));
    }
  };

  const handlePayOne = async (employeeAddress: string, amount: string) => {
    if (!employerAddress || !amount || Number(amount) <= 0) return;
    setPayingEmployee(employeeAddress);
    try {
      const hash = await payOneSalary(employeeAddress, amount);
      if (hash) {
        await markInvoicesPaidForMonth(employerAddress, [employeeAddress], month, hash);
        reload();
        reloadPaymentHandles();
        toast.success(`Paid ${formatAddress(employeeAddress, 4)}`);
      }
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Payment failed'));
    } finally {
      setPayingEmployee(null);
    }
  };

  const handleBatchDecrypt = async () => {
    const addressesToDecrypt = invoicedEmployees
      .map((e) => e.address.toLowerCase())
      .filter((addr) => salaryHandles[addr] && !(addr in decryptedSalaries));
    const handlesToDecrypt = addressesToDecrypt.map((addr) => salaryHandles[addr]);
    const handleToAddr: Record<string, string> = {};
    addressesToDecrypt.forEach((addr) => {
      handleToAddr[salaryHandles[addr]] = addr;
    });
    if (handlesToDecrypt.length === 0) {
      toast.error('No salaries to decrypt');
      return;
    }
    try {
      const result = await decryptHandleBatch(handlesToDecrypt, CONTRACTS.CONF_TOKEN);
      if (Object.keys(result).length === 0) {
        toast.error('Batch decryption returned no values');
        return;
      }
      setDecryptedSalaries((prev) => {
        const next = { ...prev };
        for (const [handle, value] of Object.entries(result)) {
          const addr = handleToAddr[handle];
          if (addr) next[addr] = value;
        }
        return next;
      });
      setPaySalaries((prev) => {
        const next = { ...prev };
        for (const [handle, value] of Object.entries(result)) {
          const addr = handleToAddr[handle];
          if (addr) next[addr] = formatAmount(value, TOKEN_CONFIG.decimals);
        }
        return next;
      });
      toast.success(`Decrypted ${Object.keys(result).length} salary amount(s)`);
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Batch decrypt failed'));
    }
  };

  const canBatchDecrypt =
    invoicedEmployees.some(
      (e) => salaryHandles[e.address.toLowerCase()] && !(e.address.toLowerCase() in decryptedSalaries)
    ) && !isDecryptingFhe;

  if (!isConnected) {
    return (
      <ConnectWalletCTA
        embedded
        icon={FileText}
        badge="For Employers"
        title="Invoices &"
        titleAccent="Payroll"
        subtitle="Connect your wallet to view employee invoices by month, decrypt salaries, and run confidential payroll."
        features={[
          { icon: FileText, title: 'Monthly Invoices', description: 'See who submitted invoices each month and mark them for payroll.' },
          { icon: Lock, title: 'Decrypt Salaries', description: 'Reveal encrypted salary amounts so you can set pay and run payroll.' },
          { icon: Users, title: 'Batch or Single Pay', description: 'Pay one employee or run batch payroll for the whole month.' },
          { icon: Shield, title: 'On-Chain & Private', description: 'All payments are FHE-encrypted on-chain; only you and the employee can decrypt.' },
        ]}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
              View invoices by month. Decrypt salaries, set pay amounts, and run payroll or pay individuals. Invoices are marked paid when you pay from this page.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-[var(--color-border-input)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          />
          <Button variant="secondary" size="sm" onClick={() => reload()} disabled={isLoading} title="Refresh invoices from Supabase">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </motion.div>

      {error && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => reload()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </motion.div>
      )}

      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <Card variant="elevated" padding="lg">
          {isLoading ? (
            <div className="py-16 text-center">
              <p className="text-[var(--color-text-tertiary)]">Loading invoices from database…</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => reload()} disabled={isLoading}>
                Taking long? Click to retry
              </Button>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-[var(--color-text-secondary)] mb-2">Could not load invoices.</p>
              <Button variant="primary" size="sm" onClick={() => reload()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
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
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Set pay amount per row and run payroll for all invoiced employees, or pay individuals. Use &quot;Decrypt all&quot; to fill amounts from on-chain salary.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {canBatchDecrypt && (
                    <Button variant="secondary" size="sm" onClick={handleBatchDecrypt} disabled={!canBatchDecrypt} loading={isDecryptingFhe} title="Decrypt on-chain salaries for invoiced employees">
                      <Unlock className="h-4 w-4" /> Decrypt all
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleRunPayroll}
                    disabled={!hasPayroll || !isOperatorSet || payableForBatch.length === 0 || isWriting || isEncrypting}
                    loading={isWriting || isEncrypting}
                    title={!isOperatorSet ? 'Approve payroll on Dashboard first' : 'Pay all listed employees in one batch transaction'}
                  >
                    <Play className="h-4 w-4" /> Run Payroll (pay all)
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-border-light)]">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Employee Address</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Pay Amount ({TOKEN_CONFIG.underlyingSymbol})</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Submitted</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-light)]">
                    {invoices.map((inv, i) => {
                      const empAddr = inv.employee_address.toLowerCase();
                      const employee = localEmployees.find((e) => e.address.toLowerCase() === empAddr);
                      const payAmount = paySalaries[inv.employee_address] ?? employee?.salary ?? '';
                      const isPaid = !!(inv.paid_at || inv.paid_tx_hash);
                      return (
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
                          <td className="px-4 py-3">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-semibold">
                                Paid
                              </span>
                            ) : (
                              <span className="text-[var(--color-text-tertiary)] text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              value={payAmount}
                              onChange={(e) => setPaySalaries((prev) => ({ ...prev, [inv.employee_address]: e.target.value }))}
                              className="w-24 text-sm"
                              disabled={isPaid}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">
                            {inv.created_at ? new Date(inv.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              disabled={isPaid || !payAmount || Number(payAmount) <= 0 || !!payingEmployee || isWriting || isEncrypting}
                              loading={payingEmployee === inv.employee_address}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePayOne(inv.employee_address, payAmount);
                              }}
                              title="Pay this employee only (single payment)"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Pay
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
