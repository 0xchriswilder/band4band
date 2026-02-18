import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Users,
  RefreshCw,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Shield,
  BarChart3,
  Download,
  UserCheck,
  Building2,
  UserCircle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  useEmployerPaymentHistory,
  useEmployerEmployees,
  useEmployeePaymentHistory,
  useEmployeeProfile,
  useEmployerCompanyName,
  useEmployerEmployeeNames,
} from '../hooks/usePayrollHistory';
import { useFhevmDecrypt } from '../hooks/useFhevmDecrypt';
import { formatAddress, formatAmount, getUserFriendlyErrorMessage, toDirectImageUrl } from '../lib/utils';
import { TOKEN_CONFIG, CONTRACTS } from '../lib/contracts';
import { ConnectWalletCTA } from '../components/ConnectWalletCTA';
import { Avatar } from '../components/Avatar';
import { EmployerLogo } from '../components/EmployerLogo';
import { CusdcpLogo } from '../components/icons/CusdcpLogo';
import { supabase } from '../lib/supabase';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Activity() {
  const navigate = useNavigate();
  const { isConnected, address } = useAccount();

  // Employer data
  const {
    payments: employerPayments,
    total: employerTotal,
    page: employerPage,
    totalPages: employerTotalPages,
    setPage: setEmployerPage,
    isLoading: employerLoading,
    reload: reloadEmployer,
  } = useEmployerPaymentHistory();
  const { employees, total: employeeCount } = useEmployerEmployees();
  const { names: employerEmployeeNames, avatars: employerEmployeeAvatars } = useEmployerEmployeeNames();

  // Employee data
  const { employee: employeeProfile, isEmployee } = useEmployeeProfile();
  const { companyName: employerCompanyName, logoUrl: employerLogoUrl } = useEmployerCompanyName(employeeProfile?.employer);
  const {
    payments: employeePayments,
    total: employeeTotal,
    page: employeePage,
    totalPages: employeeTotalPages,
    setPage: setEmployeePage,
    isLoading: employeeLoading,
    reload: reloadEmployee,
  } = useEmployeePaymentHistory();

  const { decryptHandle, decryptHandleBatch, isReady: fheReady, isDecrypting: fheDecrypting } = useFhevmDecrypt();
  const [decryptedAmounts, setDecryptedAmounts] = useState<Record<string, bigint>>({});
  const [decryptingKey, setDecryptingKey] = useState<string | null>(null);
  const [chartPayments, setChartPayments] = useState<Array<{ timestamp: string; encrypted: string }>>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartDecryptedByHandle, setChartDecryptedByHandle] = useState<Record<string, bigint>>({});
  const [chartDecrypting, setChartDecrypting] = useState(false);

  const isEmployer = employerTotal > 0 || employees.length > 0;

  // Fetch payments with encrypted handle for employer chart (up to 500)
  useEffect(() => {
    if (!isEmployer || !address) return;
    setChartLoading(true);
    const p = supabase
      .from('salary_payments')
      .select('timestamp, encrypted')
      .eq('employer', address.toLowerCase())
      .order('block_number', { ascending: false })
      .limit(500);
    void Promise.resolve(p).then(({ data, error }) => {
      if (!error && data) {
        setChartPayments((data as Array<{ timestamp: string; encrypted: string }>).filter((r) => r.encrypted && r.encrypted !== '0x' + '0'.repeat(64)));
      } else {
        setChartPayments([]);
      }
      setChartLoading(false);
    }).catch(() => setChartLoading(false));
  }, [isEmployer, address]);

  const handleDecryptChart = async () => {
    const handles = [...new Set(chartPayments.map((p) => p.encrypted))];
    if (handles.length === 0) return;
    setChartDecrypting(true);
    try {
      const result = await decryptHandleBatch(handles, CONTRACTS.CONF_TOKEN);
      setChartDecryptedByHandle(result);
      if (Object.keys(result).length > 0) toast.success('Amounts decrypted for chart');
    } catch (err) {
      toast.error(getUserFriendlyErrorMessage(err, 'Batch decrypt failed'));
    } finally {
      setChartDecrypting(false);
    }
  };

  const payrollVolumeData = useMemo(() => {
    const byMonth: Record<string, bigint> = {};
    for (const p of chartPayments) {
      const d = new Date(p.timestamp);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const amount = chartDecryptedByHandle[p.encrypted] ?? 0n;
      byMonth[key] = (byMonth[key] ?? 0n) + amount;
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, sum]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        sumUsdc: Number(sum) / 10 ** TOKEN_CONFIG.decimals,
        sumRaw: sum,
      }));
  }, [chartPayments, chartDecryptedByHandle]);

  const paymentDistributionData = useMemo(() => {
    return [{ name: 'cUSDCP', value: chartPayments.length, color: '#2775CA' }];
  }, [chartPayments.length]);

  const handleDecryptPayment = async (txHash: string, employee: string, encrypted: string) => {
    const key = `${txHash}-${employee}`;
    if (decryptedAmounts[key] !== undefined) return;
    setDecryptingKey(key);
    try {
      const value = await decryptHandle(encrypted, CONTRACTS.CONF_TOKEN);
      if (value !== null) {
        setDecryptedAmounts((prev) => ({ ...prev, [key]: value }));
        toast.success('Amount decrypted');
      }
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Decrypt failed'));
    } finally {
      setDecryptingKey(null);
    }
  };

  const handleExportCsv = (payments: typeof employerPayments, role: string, employerCompanyName?: string | null) => {
    if (payments.length === 0) return;
    const header = 'Date,Employee,Employer,Payroll Contract,Amount,Tx Hash,Time\n';
    const rows = payments.map((p) => {
      const key = `${p.tx_hash}-${p.employee}`;
      const amount = decryptedAmounts[key] !== undefined
        ? formatAmount(decryptedAmounts[key], TOKEN_CONFIG.decimals)
        : 'Encrypted';
      const timeStr = new Date(p.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const employerCol = employerCompanyName ? `"${employerCompanyName} (${p.employer})"` : p.employer;
      return `${new Date(p.timestamp).toISOString()},${p.employee},${employerCol},${p.payroll_address},${amount},${p.tx_hash},${timeStr}`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${role}-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (!isConnected) {
    return (
      <ConnectWalletCTA
        embedded
        icon={BarChart3}
        badge="Transparent & Confidential"
        title="Your Complete Transaction"
        titleAccent="History"
        subtitle="Access your full on-chain payroll audit trail. View, decrypt, and export all salary payments — whether you are an employer running payroll or an employee receiving wages."
        features={[
          {
            icon: Clock,
            title: 'Full Audit Trail',
            description: 'Every payment is recorded on-chain with timestamps, block numbers, and transaction hashes.',
          },
          {
            icon: Download,
            title: 'Export CSV Reports',
            description: 'Download your complete payment history as CSV for accounting, tax, or compliance purposes.',
          },
          {
            icon: Lock,
            title: 'Decrypt Amounts',
            description: 'Reveal encrypted salary amounts on-demand using your wallet signature — only you can see them.',
          },
          {
            icon: Shield,
            title: 'Multi-Role View',
            description: 'Automatically detects your role. Employers see payroll runs, employees see received payments.',
          },
        ]}
        highlights={[
          { icon: Shield, label: 'On-chain records' },
          { icon: Lock, label: 'Encrypted amounts' },
          { icon: BarChart3, label: 'CSV export' },
        ]}
      />
    );
  }

  // Shared payment table renderer (employerCompanyName: when showing employer column, show company name with address as subscript)
  const renderPaymentTable = (
    payments: typeof employerPayments,
    total: number,
    page: number,
    totalPages: number,
    setPage: (p: number) => void,
    isLoading: boolean,
    reload: () => void,
    showEmployeeCol: boolean,
    showEmployerCol: boolean,
    role: string,
    employerCompanyName?: string | null,
    employerLogoUrl?: string | null,
    employeeNames?: Record<string, string>,
    employeeAvatars?: Record<string, string>,
  ) => (
    <Card variant="elevated" className="overflow-hidden rounded-xl shadow-sm">
      <div className="p-6 border-b border-[var(--color-border-light)] bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Payment History</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Showing {payments.length} of {total} transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {payments.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => handleExportCsv(payments, role, employerCompanyName)}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={reload} disabled={isLoading} loading={isLoading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full mx-auto mb-4"
          />
          <p className="text-[var(--color-text-secondary)] text-sm">Loading payment history...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No payment history</h3>
          <p className="text-[var(--color-text-secondary)] text-sm max-w-sm mx-auto">
            No salary payments found for this wallet yet.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-[var(--color-bg-light)]/50 border-b border-[var(--color-border-light)]">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Date</th>
                  {showEmployeeCol && <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Employee</th>}
                  {showEmployerCol && <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Employer</th>}
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Contract</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Tx Hash</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {payments.map((p) => {
                  const decryptKey = `${p.tx_hash}-${p.employee}`;
                  const isPaymentDecrypted = decryptedAmounts[decryptKey] !== undefined;

                  return (
                    <tr key={decryptKey} className="hover:bg-[var(--color-primary)]/5 transition-colors">
                      <td className="px-6 py-5 text-sm font-medium text-[var(--color-text-primary)]">
                        {new Date(p.timestamp).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      {showEmployeeCol && (
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={employeeAvatars?.[p.employee.toLowerCase()]}
                              fallbackText={employeeNames?.[p.employee.toLowerCase()] || p.employee}
                              className="h-9 w-9 shrink-0 rounded-lg"
                            />
                            {employeeNames?.[p.employee.toLowerCase()] ? (
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                                  {employeeNames[p.employee.toLowerCase()]}
                                </span>
                                <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
                                  {formatAddress(p.employee, 6)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">
                                {formatAddress(p.employee, 6)}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {showEmployerCol && (
                        <td className="px-6 py-5">
                          {employerCompanyName || employerLogoUrl ? (
                            <div className="flex items-center gap-2">
                              {employerLogoUrl && (
                                <EmployerLogo
                                  logoUrl={employerLogoUrl}
                                  fallbackText={employerCompanyName}
                                  className="h-8 w-8"
                                />
                              )}
                              <div className="flex flex-col gap-0.5 min-w-0">
                                {employerCompanyName && (
                                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                                    {employerCompanyName}
                                  </span>
                                )}
                                <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
                                  {formatAddress(p.employer, 6)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">
                              {formatAddress(p.employer, 6)}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-5">
                        <span className="text-sm font-mono text-[var(--color-text-secondary)]">
                          {formatAddress(p.payroll_address, 4)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {isPaymentDecrypted ? (
                          <span className="text-sm font-bold text-emerald-600">
                            {formatAmount(decryptedAmounts[decryptKey], TOKEN_CONFIG.decimals)}
                            <span className="text-xs font-normal text-[var(--color-text-tertiary)] ml-1">{TOKEN_CONFIG.symbol}</span>
                          </span>
                        ) : p.encrypted ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDecryptPayment(p.tx_hash, p.employee, p.encrypted)}
                            disabled={decryptingKey !== null || !fheReady}
                            loading={decryptingKey === decryptKey}
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            {decryptingKey === decryptKey ? 'Decrypting...' : 'Decrypt'}
                          </Button>
                        ) : (
                          <Badge variant="default" size="sm">
                            <Lock className="h-3 w-3" /> Encrypted
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <a
                          href={`https://sepolia.etherscan.io/tx/${p.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--color-primary)] hover:underline font-mono"
                        >
                          {p.tx_hash.slice(0, 10)}...
                        </a>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[var(--color-text-secondary)]">
                        {new Date(p.timestamp).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-[var(--color-border-light)] flex items-center justify-between">
              <p className="text-sm text-[var(--color-text-secondary)]">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );

  return (
    <>
      {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(isEmployer ? '/employer' : '/employee')}
          className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] mb-6 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Dashboard</span>
        </motion.button>

        {/* Page Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col gap-1 md:flex-row md:justify-between md:items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
              Transaction History
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">
              Audit and monitor past encrypted payroll distributions via Zama privacy protocol.
            </p>
          </div>
        </motion.div>

        {/* ─── Employee Section ─── */}
        {isEmployee && employeeProfile && (
          <>
            {/* Employee Onboarding Card */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-6">
              <Card variant="elevated" padding="lg">
                <div className="flex items-center gap-4">
                  {employerLogoUrl ? (
                    <EmployerLogo
                      logoUrl={employerLogoUrl}
                      fallbackText={employerCompanyName}
                      className="w-12 h-12"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                      <UserCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                      Onboarded
                      <Badge variant="success" dot size="sm">
                        {employeeProfile.whitelisted ? 'Active' : 'Removed'}
                      </Badge>
                    </h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      You were onboarded by{' '}
                      {employerCompanyName ? (
                        <>
                          <span className="font-semibold text-[var(--color-text-primary)]">{employerCompanyName}</span>
                          <span className="font-mono text-gray-600"> ({formatAddress(employeeProfile.employer, 6)})</span>
                        </>
                      ) : (
                        <span className="font-mono font-medium text-gray-700">{formatAddress(employeeProfile.employer, 6)}</span>
                      )}
                      {' '}on{' '}
                      {new Date(employeeProfile.added_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Employee Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
            >
              <Card variant="stats">
                <p className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider">Payments Received</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[var(--color-text-primary)]">{employeeTotal}</span>
                </div>
              </Card>
              <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  {employerLogoUrl ? (
                    <EmployerLogo
                      logoUrl={employerLogoUrl}
                      fallbackText={employerCompanyName}
                      className="w-10 h-10"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-purple-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-[var(--color-text-primary)] truncate">
                      {employerCompanyName || formatAddress(employeeProfile.employer, 4)}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] font-mono">
                      {employerCompanyName ? formatAddress(employeeProfile.employer, 6) : 'Employer'}
                    </p>
                  </div>
                </div>
              </Card>
              <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">FHE</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Encrypted</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Employee Payment History */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              {renderPaymentTable(
                employeePayments,
                employeeTotal,
                employeePage,
                employeeTotalPages,
                setEmployeePage,
                employeeLoading,
                reloadEmployee,
                false,
                true,
                'employee',
                employerCompanyName,
                employerLogoUrl,
              )}
            </motion.div>
          </>
        )}

        {/* ─── Separator if both roles ─── */}
        {isEmployee && isEmployer && (
          <div className="my-8 border-t border-gray-200 pt-6">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-[var(--color-primary)]" />
              Employer View
            </h2>
          </div>
        )}

        {/* ─── Employer Section ─── */}
        {isEmployer && (
          <>
            {!isEmployee && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
              >
                <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{employerTotal}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">Total Payments</p>
                    </div>
                  </div>
                </Card>
                <Card variant="elevated" padding="md" className="hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{employeeCount}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">Employees</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Payroll Volume & Payment Distribution charts */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card variant="elevated" padding="lg" className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-0.5">Payroll Volume</h3>
                    <p className="text-xs text-[var(--color-text-tertiary)]">USDC / {TOKEN_CONFIG.symbol} paid per month. Decrypt to show amounts.</p>
                  </div>
                  {chartPayments.length > 0 && Object.keys(chartDecryptedByHandle).length === 0 && (
                    <Button variant="secondary" size="sm" onClick={handleDecryptChart} disabled={!fheReady || chartDecrypting || fheDecrypting} loading={chartDecrypting}>
                      <Unlock className="h-4 w-4" /> Decrypt for chart
                    </Button>
                  )}
                </div>
                {chartLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
                  </div>
                ) : payrollVolumeData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-[var(--color-text-tertiary)] text-sm">No payment data yet</div>
                ) : payrollVolumeData.every((d) => d.sumUsdc === 0) ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3 text-[var(--color-text-tertiary)] text-sm">
                    <p>Click &quot;Decrypt for chart&quot; to show {TOKEN_CONFIG.symbol} paid per month (one signature for all).</p>
                    <Button variant="secondary" size="sm" onClick={handleDecryptChart} disabled={!fheReady || chartDecrypting || fheDecrypting} loading={chartDecrypting}>
                      <Unlock className="h-4 w-4" /> Decrypt for chart
                    </Button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={payrollVolumeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border-light)' }} formatter={(value: number | undefined) => [`$${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${TOKEN_CONFIG.symbol}`, 'Paid']} labelFormatter={(label) => label} />
                      <Area type="monotone" dataKey="sumUsdc" stroke="var(--color-primary)" strokeWidth={2} fill="url(#volumeGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card variant="elevated" padding="lg" className="overflow-hidden">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-0.5">Payment Distribution</h3>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-4">Crypto assets used for payroll</p>
                {chartLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
                  </div>
                ) : paymentDistributionData[0].value === 0 ? (
                  <div className="h-64 flex items-center justify-center text-[var(--color-text-tertiary)] text-sm">No payments yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={paymentDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                        {paymentDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend formatter={() => <span className="flex items-center gap-2"><CusdcpLogo size={16} /> cUSDCP</span>} />
                      <Tooltip formatter={(value: number | undefined) => [`${value ?? 0} payments`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </motion.div>

            {/* Employer Payment History */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: isEmployee ? 0.3 : 0.15 }}>
              {              renderPaymentTable(
                employerPayments,
                employerTotal,
                employerPage,
                employerTotalPages,
                setEmployerPage,
                employerLoading,
                reloadEmployer,
                true,
                false,
                'employer',
                undefined,
                undefined,
                employerEmployeeNames,
                employerEmployeeAvatars,
              )}
            </motion.div>

            {/* Employee List */}
            {employees.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6">
                <Card variant="elevated" className="overflow-hidden">
                  <div className="p-6 border-b border-[var(--color-border-light)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Registered Employees</h2>
                        <p className="text-xs text-[var(--color-text-tertiary)]">{employeeCount} employees indexed</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-5 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">#</th>
                          <th className="px-5 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Address</th>
                          <th className="px-5 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Added</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {employees.map((emp, i) => (
                          <tr key={emp.address} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3 text-sm text-[var(--color-text-tertiary)]">{i + 1}</td>
                            <td className="px-5 py-3">
                              <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">
                                {formatAddress(emp.address, 8)}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              {emp.whitelisted ? (
                                <Badge variant="success" dot size="sm">Active</Badge>
                              ) : (
                                <Badge variant="error" size="sm">Removed</Badge>
                              )}
                            </td>
                            <td className="px-5 py-3 text-sm text-[var(--color-text-secondary)]">
                              {new Date(emp.added_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}

        {/* No data at all */}
        {!isEmployee && !isEmployer && !employerLoading && !employeeLoading && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Card variant="elevated" padding="lg">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserCircle className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No activity found</h3>
                <p className="text-[var(--color-text-secondary)] text-sm max-w-sm mx-auto mb-6">
                  This wallet has no payroll activity yet. Register as an employer or get onboarded by one.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="primary" onClick={() => navigate('/employer')}>
                    <Building2 className="h-4 w-4" /> Employer Dashboard
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/employee')}>
                    <UserCircle className="h-4 w-4" /> Employee Portal
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
    </>
  );
}

export default Activity;
