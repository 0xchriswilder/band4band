import React, { useState, useEffect, useRef } from 'react';
import Papa, { type ParseResult } from 'papaparse';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useWriteContract } from 'wagmi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Building2,
  UserPlus,
  Upload,
  Play,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Users,
  FileSpreadsheet,
  DollarSign,
  Hash,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  ArrowRight,
  Lock,
  Unlock,
  TrendingUp,
  Eye,
  EyeOff,
  ArrowUpRight,
  BarChart3,
  Shield,
  Pencil,
  Trash2,
  X,
  FileText,
  Calendar,
  Mail,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { CusdcpLogo } from '../components/icons/CusdcpLogo';
import { CusdtLogo } from '../components/icons/CusdtLogo';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { usePayrollEmployer } from '../hooks/usePayrollEmployer';
import { useWrapToken } from '../hooks/useWrapToken';
import { useConfidentialBalance } from '../hooks/useConfidentialBalance';
import { useFhevmEncrypt } from '../hooks/useFhevmEncrypt';
import { useFhevmDecrypt } from '../hooks/useFhevmDecrypt';
import { formatAddress, formatAmount, parseAmount, getUserFriendlyErrorMessage } from '../lib/utils';
import { CONTRACTS, CONF_TOKEN_ABI, TOKEN_CONFIG } from '../lib/contracts';
import { ConnectWalletCTA } from '../components/ConnectWalletCTA';
import { Avatar } from '../components/Avatar';
import { useEmployerInvoices, useEmployerLatestPaymentHandles, useEmployerEmployeeNames } from '../hooks/usePayrollHistory';
import { NextPayDateCard } from '../features/payroll/components/NextPayDateCard';
import { PayrollRunSummarySection } from '../features/payroll/components/PayrollRunSummarySection';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type ImportPreviewRow = {
  address: string;
  salary: string;
  name?: string;
  email?: string;
  paymentFrequency?: 'monthly' | 'biweekly' | 'weekly';
};

function normalizeFrequency(v: string): 'monthly' | 'biweekly' | 'weekly' {
  const s = (v || '').trim().toLowerCase();
  if (s === 'biweekly' || s === 'bi-weekly') return 'biweekly';
  if (s === 'weekly') return 'weekly';
  return 'monthly';
}

export function EmployerDashboard() {
  const { isConnected, address } = useAccount();
  const {
    payrollAddress,
    hasPayroll,
    isOperatorSet,
    localEmployees,
    onchainEmployees,
    isWriting,
    isEncrypting,
    registerEmployer,
    approvePayrollOperator,
    onboardEmployee,
    batchOnboardEmployees,
    editEmployeeSalary,
    removeEmployeeFromPayroll,
    payAllSalaries,
    payOneSalary,
    refetchPayroll,
    refetchEmployees,
  } = usePayrollEmployer();

  const {
    usdcBalance,
    usdcBalanceFormatted,
    isWriting: isWrapping,
    needsApproval,
    wrapUsdc,
    refetch: refetchBalances,
  } = useWrapToken();

  const {
    hasBalance: hasCusdcpBalance,
    decryptedBalance: cusdcpBalance,
    isDecrypted: cusdcpDecrypted,
    isDecrypting: cusdcpDecrypting,
    fheReady,
    decrypt: decryptCusdcpBalance,
    refetch: refetchCusdcpBalance,
  } = useConfidentialBalance();

  const { encryptAmount } = useFhevmEncrypt();
  const { decryptHandle, decryptHandleBatch, isDecrypting: isDecryptingFhe } = useFhevmDecrypt();
  const { writeContractAsync, isPending: isUnwrapWriting } = useWriteContract();

  const [showBalance, setShowBalance] = useState(false);
  const [wrapAmount, setWrapAmount] = useState('');
  const [unwrapAmount, setUnwrapAmount] = useState('');
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [paySalaries, setPaySalaries] = useState<Record<string, string>>({});
  const [employeeAddress, setEmployeeAddress] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [salary, setSalary] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[] | null>(null);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [onboardToken, setOnboardToken] = useState<'cUSDCP' | 'cUSDT'>('cUSDCP');
  const [paymentFrequency, setPaymentFrequency] = useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [employeeEmail, setEmployeeEmail] = useState('');

  // Employer salary decrypt state (handles from Supabase; decrypt with CONF_TOKEN like Activity/Employee)
  const [decryptedSalaries, setDecryptedSalaries] = useState<Record<string, bigint>>({});
  const [decryptingEmployee, setDecryptingEmployee] = useState<string | null>(null);

  // Per-row pay (single employee)
  const [payingEmployee, setPayingEmployee] = useState<string | null>(null);

  // Edit salary modal
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editSalaryValue, setEditSalaryValue] = useState('');
  const [editPaymentFrequency, setEditPaymentFrequency] = useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Payroll confirmation modal
  const [showPayrollConfirm, setShowPayrollConfirm] = useState(false);
  // Approve Payroll explanation modal + per-action loading (so Onboard and Approve spinners don't couple)
  const [showApprovePayrollModal, setShowApprovePayrollModal] = useState(false);
  const [isApprovingPayroll, setIsApprovingPayroll] = useState(false);
  const [isOnboardingEmployee, setIsOnboardingEmployee] = useState(false);
  // Invoice month filter (YYYY-MM)
  const [invoiceMonth, setInvoiceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { invoicedAddresses } = useEmployerInvoices(invoiceMonth);
  const { handles: salaryHandles, reload: reloadPaymentHandles } = useEmployerLatestPaymentHandles();
  const { names: employeeNames, frequencies: employeeFrequencies, emails: employeeEmails, avatars: employeeAvatars, upsertName: upsertEmployeeName, reload: reloadEmployeeNames } = useEmployerEmployeeNames();

  const handleFileImport = async (file: File) => {
    setIsImporting(true);
    setImportPreviewRows(null);
    setShowImportPreview(false);
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      const rows: ImportPreviewRow[] = [];

      const getName = (row: Record<string, unknown>) => {
        const v = row.name ?? row.employee_name ?? row.Name ?? row.EmployeeName ?? '';
        return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
      };
      const getFrequency = (row: Record<string, unknown>) => {
        const v = row.payment_frequency ?? row.paymentFrequency ?? row.frequency ?? row.Frequency ?? '';
        return normalizeFrequency(typeof v === 'string' ? v : String(v ?? ''));
      };

      if (ext === 'csv') {
        const parsed = await new Promise<{ data: Array<Record<string, string>> }>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (result: ParseResult<Record<string, string>>) => resolve({ data: result.data as Array<Record<string, string>> }),
            error: reject,
          });
        });
        for (const row of parsed.data) {
          const address = row.address ?? row.Address ?? '';
          const salary = row.salary ?? row.Salary ?? '';
          if (address && salary) {
            const name = (row.name ?? row.employee_name ?? row.Name ?? row.EmployeeName ?? '').trim();
            const email = (row.email ?? row.Email ?? '').trim();
            const paymentFrequency = normalizeFrequency(row.payment_frequency ?? row.paymentFrequency ?? row.frequency ?? '');
            rows.push({ address: address.trim(), salary: String(salary).trim(), ...(name ? { name } : {}), ...(email ? { email } : {}), paymentFrequency });
          }
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        for (const row of json) {
          const address = row.address ?? row.Address;
          const salary = row.salary ?? row.Salary;
          if (address && salary) {
            const name = getName(row);
            const email = (row.email ?? row.Email ?? ''); const emailStr = typeof email === 'string' ? email.trim() : '';
            const paymentFrequency = getFrequency(row);
            rows.push({ address: String(address).trim(), salary: String(salary).trim(), ...(name ? { name } : {}), ...(emailStr ? { email: emailStr } : {}), paymentFrequency });
          }
        }
      }

      if (rows.length > 0) {
        setImportPreviewRows(rows);
        setShowImportPreview(true);
      } else {
        toast.error('No valid rows found. Need at least address and salary columns.');
      }
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Import failed'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImportPreview = async () => {
    if (!importPreviewRows || importPreviewRows.length === 0) return;
    setIsImporting(true);
    try {
      await batchOnboardEmployees(importPreviewRows.map(({ address, salary }) => ({ address, salary })));
      for (const r of importPreviewRows) {
        await upsertEmployeeName(r.address, r.name || '', r.paymentFrequency || 'monthly', r.email || '').catch(() => {});
      }
      reloadEmployeeNames();
      setShowImportPreview(false);
      setImportPreviewRows(null);
      toast.success(`${importPreviewRows.length} employee(s) onboarded successfully`);
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Onboard failed'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleOnboard = async () => {
    if (!employeeAddress || !salary) return;
    setIsOnboardingEmployee(true);
    try {
      await onboardEmployee(employeeAddress, salary);
      await upsertEmployeeName(employeeAddress, employeeName.trim(), paymentFrequency, employeeEmail.trim());
      toast.success('Employee onboarded successfully');
      setEmployeeAddress('');
      setEmployeeName('');
      setEmployeeEmail('');
      setSalary('');
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Onboard failed'));
    } finally {
      setIsOnboardingEmployee(false);
    }
  };

  const handleEditSalary = async () => {
    if (!editingEmployee) return;
    try {
      if (editSalaryValue && Number(editSalaryValue) > 0) {
        await editEmployeeSalary(editingEmployee, editSalaryValue);
      }
      await upsertEmployeeName(editingEmployee, editName.trim(), editPaymentFrequency, editEmail.trim());
      reloadEmployeeNames();
      toast.success(editSalaryValue && Number(editSalaryValue) > 0 ? 'Salary and profile updated' : 'Profile updated');
      setEditingEmployee(null);
      setEditSalaryValue('');
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Update failed'));
    }
  };

  const handleRemoveEmployee = async (employeeAddr: string) => {
    try {
      await removeEmployeeFromPayroll(employeeAddr);
      toast.success('Employee removed');
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Remove failed'));
    }
  };

  const handleDecryptSalary = async (employeeAddr: string) => {
    const handle = salaryHandles[employeeAddr.toLowerCase()];
    if (!handle) {
      toast.error('No payment record found for this employee');
      return;
    }
    setDecryptingEmployee(employeeAddr);
    try {
      const value = await decryptHandle(handle, CONTRACTS.CONF_TOKEN);
      if (value !== null) {
        const addrLower = employeeAddr.toLowerCase();
        setDecryptedSalaries((prev) => ({ ...prev, [addrLower]: value }));
        setPaySalaries((prev) => ({ ...prev, [employeeAddr]: formatAmount(value, TOKEN_CONFIG.decimals) }));
        toast.success('Salary decrypted — pay amount updated');
      }
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Decrypt failed'));
    } finally {
      setDecryptingEmployee(null);
    }
  };

  const handleRevealBalance = async () => {
    if (showBalance) {
      setShowBalance(false);
      return;
    }
    if (!hasCusdcpBalance) return;
    try {
      await decryptCusdcpBalance();
      setShowBalance(true);
    } catch {
      // ignore
    }
  };

  const handleRunPayroll = async () => {
    setShowPayrollConfirm(false);
    try {
      const updatedEmployees = localEmployees.map((e) => ({
        ...e,
        salary: paySalaries[e.address] || e.salary,
      }));
      await payAllSalaries(updatedEmployees);
      toast.success('Payroll executed successfully');
      reloadPaymentHandles();
    } catch (err: any) {
      toast.error(getUserFriendlyErrorMessage(err, 'Payroll failed'));
    }
  };

  const payableEmployees = localEmployees.filter((e) => {
    const sal = paySalaries[e.address] || e.salary;
    return sal && Number(sal) > 0;
  });

  const allSalariesDecrypted = localEmployees.every((e) => {
    const addrLower = e.address.toLowerCase();
    return !salaryHandles[addrLower] || addrLower in decryptedSalaries;
  });

  if (!isConnected) {
    return (
      <ConnectWalletCTA
        embedded
        icon={Building2}
        badge="For Institutions & Companies"
        title="Launch Your Confidential"
        titleAccent="Payroll"
        subtitle="Deploy a dedicated payroll contract, onboard your team, and execute encrypted batch salary payments — all on-chain, all private. No one sees what you pay."
        features={[
          {
            icon: Lock,
            title: 'Encrypted Salaries',
            description: 'Every salary is FHE-encrypted before touching the chain. Only you and the employee can decrypt.',
          },
          {
            icon: Users,
            title: 'Batch Payments',
            description: 'Pay your entire team in a single transaction with one-click confidential payroll execution.',
          },
          {
            icon: FileSpreadsheet,
            title: 'CSV / XLSX Import',
            description: 'Bulk-import employees and salaries from spreadsheets. Onboard entire teams in seconds.',
          },
          {
            icon: Shield,
            title: 'Isolated Contracts',
            description: 'Each employer gets a dedicated Payroll contract via factory pattern for full data isolation.',
          },
        ]}
        highlights={[
          { icon: Shield, label: 'FHE-encrypted' },
          { icon: Lock, label: 'ERC-7984 tokens' },
          { icon: TrendingUp, label: 'Batch payroll' },
        ]}
      />
    );
  }

  return (
    <>
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between mb-8"
        >
          <div>
            <h2 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
              Employer Dashboard
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">Manage payroll, onboard employees, and execute confidential payments.</p>
          </div>
          <div className="flex items-center gap-3">
            {hasPayroll && (
              <Badge variant="success" dot size="md">Payroll active</Badge>
            )}
            {isConnected && (
              <Button variant="ghost" size="sm" onClick={() => refetchPayroll()} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content — Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">

            {/* Hero Balance Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="relative overflow-hidden rounded-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] via-orange-500 to-amber-600" />
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-1/2 -right-1/4 w-[500px] h-[500px] bg-white/5 rounded-full" />
                  <div className="absolute -bottom-1/2 -left-1/4 w-[400px] h-[400px] bg-white/5 rounded-full" />
                </div>
                <div className="relative p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white/70 text-sm font-medium">Treasury Balance</p>
                        <p className="text-white font-bold">Encrypted {TOKEN_CONFIG.symbol}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleRevealBalance}
                      disabled={cusdcpDecrypting || !hasCusdcpBalance}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/90 text-sm font-medium transition-all disabled:opacity-50 backdrop-blur-sm"
                    >
                      {cusdcpDecrypting ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Decrypting...</>
                      ) : showBalance ? (
                        <><EyeOff className="w-4 h-4" /> Hide</>
                      ) : (
                        <><Eye className="w-4 h-4" /> Reveal</>
                      )}
                    </button>
                  </div>
                  <div className="mb-6">
                    <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                      {showBalance && cusdcpDecrypted && cusdcpBalance !== null ? (
                        <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-3">
                          {formatAmount(cusdcpBalance, TOKEN_CONFIG.decimals)}
                          <span className="text-2xl font-normal text-white/70">{TOKEN_CONFIG.symbol}</span>
                        </motion.span>
                      ) : (
                        <span className="tracking-wider">$&bull;&bull;&bull;&bull;&bull;&bull;</span>
                      )}
                    </div>
                    <p className="text-white/60 text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Encrypted confidential token balance
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                      <p className="text-white/60 text-xs mb-1">Employees</p>
                      <p className="text-white font-bold text-lg">{onchainEmployees.length || localEmployees.length}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                      <p className="text-white/60 text-xs mb-1">{TOKEN_CONFIG.underlyingSymbol}</p>
                      <p className="text-white font-bold text-lg">{Number(usdcBalanceFormatted).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                      <p className="text-white/60 text-xs mb-1">Operator</p>
                      <p className="text-white font-bold text-lg">{isOperatorSet ? 'Approved' : 'Pending'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Register section — with context so companies understand the process before the CTA */}
            {!hasPayroll && (
              <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-4">
                <Card variant="bordered" padding="lg" className="bg-[var(--color-bg-light)]/50 border-[var(--color-border-light)]">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-2">What you can do in the Payroll app</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                    This dashboard lets you run confidential payroll on-chain: add employees, set encrypted salaries, and pay your team in confidential tokens. Only you and each employee can see that employee’s salary. You can also send e-sign employment contracts (DocuSign), track invoices, and view payment history.
                  </p>
                  <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">The process</p>
                  <ol className="text-sm text-[var(--color-text-secondary)] space-y-1.5 list-decimal list-inside">
                    <li><strong>Register your payroll</strong> — Deploy your dedicated contract (one per company).</li>
                    <li><strong>Wrap USDC</strong> — Convert USDC into confidential tokens to fund the treasury.</li>
                    <li><strong>Approve operator</strong> — Allow your payroll contract to move tokens (one-time).</li>
                    <li><strong>Onboard employees</strong> — Add team members and set encrypted salaries (manually or via CSV import).</li>
                    <li><strong>Run payroll</strong> — Execute batch payments; employees can decrypt their amount.</li>
                  </ol>
                </Card>
                <Card variant="elevated" padding="lg" className="border-l-4 border-l-[var(--color-primary)]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Step 1: Register your payroll contract</h2>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Deploy a dedicated confidential payroll contract via the factory.</p>
                    </div>
                    <Button size="lg" onClick={async () => { try { await registerEmployer(); toast.success('Payroll registered!'); } catch (err: any) { toast.error(getUserFriendlyErrorMessage(err, 'Registration failed')); }}} disabled={!isConnected || isWriting} loading={isWriting}>
                      <Building2 className="h-4 w-4" /> Register Payroll
                    </Button>
                  </div>
                </Card>
                <p className="text-sm text-[var(--color-text-tertiary)] text-center">
                  Not an employer? <Link to="/employee" className="text-[var(--color-primary)] font-medium hover:underline">Go to Employee Portal</Link>
                </p>
              </motion.div>
            )}

            {/* Wrap + Unwrap — only when payroll is registered */}
            {hasPayroll && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card variant="elevated" padding="lg" className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" /> Wrap / Shield
                  </h2>
                  <Badge variant="info" size="sm">{TOKEN_CONFIG.underlyingSymbol} → {TOKEN_CONFIG.symbol}</Badge>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mb-4">Convert {TOKEN_CONFIG.underlyingSymbol} into confidential {TOKEN_CONFIG.symbol} to fund payroll.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gray-50 border border-[var(--color-border-light)]">
                    <div className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">{TOKEN_CONFIG.underlyingSymbol}</div>
                    <div className="text-lg font-bold text-[var(--color-text-primary)] truncate">{Number(usdcBalanceFormatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide">{TOKEN_CONFIG.symbol}</div>
                    {cusdcpDecrypted && cusdcpBalance !== null ? (
                      <div className="text-lg font-bold text-emerald-700 truncate">{formatAmount(cusdcpBalance, TOKEN_CONFIG.decimals)}</div>
                    ) : hasCusdcpBalance ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <Button variant="secondary" size="sm" onClick={() => decryptCusdcpBalance()} disabled={cusdcpDecrypting || !fheReady} loading={cusdcpDecrypting} className="!py-1 !text-xs"><Unlock className="h-3 w-3" /> Reveal</Button>
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-emerald-700">0.00</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <div className="relative flex-1">
                    <Input type="number" placeholder="0.00" step="0.01" min="0" value={wrapAmount} onChange={(e) => setWrapAmount(e.target.value)} className="text-sm" />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-primary)] hover:underline" onClick={() => setWrapAmount(usdcBalanceFormatted)}>MAX</button>
                  </div>
                  <Button size="sm" onClick={async () => { if (!wrapAmount || Number(wrapAmount) <= 0) return; try { await wrapUsdc(wrapAmount); toast.success('Tokens wrapped!'); setWrapAmount(''); refetchBalances(); refetchCusdcpBalance(); } catch (err: any) { toast.error(getUserFriendlyErrorMessage(err, 'Wrap failed')); }}} disabled={!isConnected || isWrapping || !wrapAmount || Number(wrapAmount) <= 0 || usdcBalance === 0n} loading={isWrapping}>
                    <ShieldCheck className="h-4 w-4" /> {wrapAmount && needsApproval(wrapAmount) ? 'Approve & Wrap' : 'Wrap'}
                  </Button>
                </div>
              </Card>
              <Card variant="elevated" padding="lg" className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <ShieldOff className="h-5 w-5 text-orange-500" /> Unwrap / Unshield
                  </h2>
                  <Badge variant="warning" size="sm">{TOKEN_CONFIG.symbol} → {TOKEN_CONFIG.underlyingSymbol}</Badge>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mb-4">Convert confidential {TOKEN_CONFIG.symbol} back to {TOKEN_CONFIG.underlyingSymbol}. Async via Zama gateway.</p>
                <div className="flex gap-2 mt-auto">
                  <div className="relative flex-1">
                    <Input type="number" placeholder="0.00" step="0.01" min="0" value={unwrapAmount} onChange={(e) => setUnwrapAmount(e.target.value)} className="text-sm" />
                    {cusdcpDecrypted && cusdcpBalance !== null && cusdcpBalance > 0n && (
                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-primary)] hover:underline" onClick={() => setUnwrapAmount(formatAmount(cusdcpBalance, TOKEN_CONFIG.decimals))}>MAX</button>
                    )}
                  </div>
                  <Button size="sm" variant="secondary" onClick={async () => {
                    if (!address || !unwrapAmount || Number(unwrapAmount) <= 0) return;
                    setIsUnwrapping(true);
                    try {
                      const amount = parseAmount(unwrapAmount, TOKEN_CONFIG.decimals);
                      const encrypted = await encryptAmount(amount, CONTRACTS.CONF_TOKEN);
                      if (!encrypted || !encrypted.handles[0]) throw new Error('Encrypt failed');
                      await writeContractAsync({ address: CONTRACTS.CONF_TOKEN, abi: CONF_TOKEN_ABI, functionName: 'unwrap', args: [address, address, encrypted.handles[0], encrypted.inputProof as `0x${string}`] });
                      toast.success('Unwrap initiated (async via gateway)');
                      setUnwrapAmount(''); refetchBalances(); refetchCusdcpBalance();
                    } catch (err: any) { toast.error(getUserFriendlyErrorMessage(err, 'Unwrap failed')); } finally { setIsUnwrapping(false); }
                  }} disabled={!isConnected || isUnwrapping || isUnwrapWriting || !unwrapAmount || Number(unwrapAmount) <= 0 || !fheReady} loading={isUnwrapping || isUnwrapWriting}>
                    <ShieldOff className="h-4 w-4" /> Unwrap
                  </Button>
                </div>
              </Card>
            </motion.div>
            )}

            {/* Onboard Employees — only when payroll is registered */}
            {hasPayroll && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <Card variant="elevated" padding="lg">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[var(--color-primary)]" /> Onboard Employees
                </h2>
                <div className="flex gap-1 p-1 rounded-xl bg-gray-100 mb-6">
                  <button className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'manual' ? 'bg-white text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`} onClick={() => setActiveTab('manual')}>Manual Entry</button>
                  <button className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'import' ? 'bg-white text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`} onClick={() => setActiveTab('import')}>Import File</button>
                </div>
                <AnimatePresence mode="wait">
                  {activeTab === 'manual' ? (
                    <motion.div key="manual" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                      <Input label="Employee Name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="e.g. Jane Doe" hint="Optional but recommended for identifying workers." icon={<Users className="h-4 w-4" />} />
                      <Input label="Email address" value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} type="email" placeholder="e.g. jane@company.com" icon={<Mail className="h-4 w-4" />} />
                      <Input label="Employee Wallet Address" value={employeeAddress} onChange={(e) => setEmployeeAddress(e.target.value)} placeholder="0x..." icon={<Hash className="h-4 w-4" />} />
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Salary Amount</label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="2500.00" hint="Amount (6 decimals). Will be encrypted before submitting." icon={<DollarSign className="h-4 w-4" />} />
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button type="button" onClick={() => setOnboardToken('cUSDCP')} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all ${onboardToken === 'cUSDCP' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border-light)] hover:border-[var(--color-primary)]/30'}`} title="cUSDCP">
                              <CusdcpLogo size={20} />
                              <span className="text-sm font-semibold text-[var(--color-text-primary)]">cUSDCP</span>
                            </button>
                            <button type="button" onClick={() => setOnboardToken('cUSDT')} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all ${onboardToken === 'cUSDT' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border-light)] hover:border-[var(--color-primary)]/30 opacity-75'}`} title="cUSDT (coming soon)">
                              <CusdtLogo size={20} />
                              <span className="text-sm font-semibold text-[var(--color-text-primary)]">cUSDT</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Payment Frequency</label>
                        <div className="flex gap-2">
                          {(['monthly', 'biweekly', 'weekly'] as const).map((freq) => (
                            <button key={freq} type="button" onClick={() => setPaymentFrequency(freq)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${paymentFrequency === freq ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border-light)] hover:border-[var(--color-primary)]/30 text-[var(--color-text-secondary)]'}`}>
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm font-medium capitalize">{freq === 'biweekly' ? 'Bi-weekly' : freq === 'monthly' ? 'Monthly' : 'Weekly'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/60">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-emerald-800">Privacy Protected</p>
                          <p className="text-xs text-emerald-700/90 mt-0.5">All payroll transactions for this employee will be processed with maximum privacy.</p>
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleOnboard} disabled={!hasPayroll || isWriting || isEncrypting || !employeeAddress || !salary} loading={isEncrypting || (isWriting && isOnboardingEmployee)}>
                        {isEncrypting ? 'Encrypting salary...' : 'Onboard Employee'}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div key="import" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[var(--color-primary-light)] transition-colors">
                        <FileSpreadsheet className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Drop a CSV or XLSX file</p>
                        <p className="text-xs text-[var(--color-text-tertiary)] mb-4">Required: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[var(--color-primary-dark)]">address</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[var(--color-primary-dark)]">salary</code>. Optional: <code className="bg-gray-100 px-1.5 py-0.5 rounded">name</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded">email</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded">payment_frequency</code> (monthly / biweekly / weekly)</p>
                        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file && hasPayroll && !isWriting && !isEncrypting) void handleFileImport(file); e.target.value = ''; }} />
                        <Button variant="secondary" size="sm" type="button" onClick={() => fileInputRef.current?.click()} disabled={!hasPayroll || isWriting || isEncrypting}>
                          <Upload className="h-4 w-4" /> Choose file
                        </Button>
                      </div>
                      {isImporting && !showImportPreview && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-primary)]/5">
                          <svg className="animate-spin h-4 w-4 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          <span className="text-sm font-medium text-[var(--color-primary-dark)]">Parsing file...</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
            )}

          </div>

          {/* Sidebar — Overview + Quick Actions in one card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
            <Card variant="elevated" padding="md" className="overflow-hidden">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--color-border-light)]">
                <BarChart3 className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Overview &amp; Actions</h3>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><Wallet className="w-4 h-4 text-blue-600" /></div>
                  <div className="min-w-0 flex-1"><p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">Wallet</p><p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{isConnected && address ? formatAddress(address, 6) : 'Not connected'}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasPayroll ? 'bg-emerald-50' : 'bg-amber-50'}`}>{hasPayroll ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}</div>
                  <div className="min-w-0 flex-1"><p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">Contract</p><p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{hasPayroll && payrollAddress ? formatAddress(payrollAddress, 6) : '—'}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center shrink-0"><Users className="w-4 h-4 text-purple-600" /></div>
                  <div className="min-w-0 flex-1"><p className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">Employees</p><p className="text-xs font-bold text-[var(--color-text-primary)]">{onchainEmployees.length || localEmployees.length}</p></div>
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-[var(--color-border-light)]">
                <Link to="/activity" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--color-bg-light)] transition-colors group">
                  <BarChart3 className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]" />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">Payment History</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-[var(--color-primary)]" />
                </Link>
                <Link to="/employee" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--color-bg-light)] transition-colors group">
                  <Users className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]" />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">Employee Portal</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-[var(--color-primary)]" />
                </Link>
              </div>
            </Card>
            {hasPayroll && address && (
              <NextPayDateCard employerAddress={address} />
            )}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100/50 p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-8 h-8 text-[var(--color-primary)] shrink-0 opacity-80" />
                <div>
                  <h3 className="text-xs font-bold text-[var(--color-text-primary)] mb-0.5">Payroll Privacy</h3>
                  <p className="text-[11px] text-[var(--color-text-secondary)] leading-snug">Salaries are FHE-encrypted. Only you and each employee can decrypt.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Employees table — only when payroll is registered */}
        {hasPayroll && (
        <>
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mt-6">
          <Card variant="elevated" padding="lg" className="overflow-hidden border border-[var(--color-border-light)] shadow-sm p-0">
            <div className="bg-gradient-to-r from-[var(--color-primary)]/5 to-transparent border-b border-[var(--color-border-light)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Employees</h2>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Manage pay amounts and run payroll</p>
                  </div>
                  {localEmployees.length > 0 && <Badge variant="primary" size="sm" className="ml-1">{localEmployees.length}</Badge>}
                </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const addressesToDecrypt = localEmployees
                    .map((e) => e.address.toLowerCase())
                    .filter((addr) => salaryHandles[addr] && !(addr in decryptedSalaries));
                  const handlesToDecrypt = addressesToDecrypt.map((addr) => salaryHandles[addr]);
                  const handleToAddr: Record<string, string> = {};
                  addressesToDecrypt.forEach((addr) => { handleToAddr[salaryHandles[addr]] = addr; });
                  const canBatchDecrypt = handlesToDecrypt.length > 0 && !isDecryptingFhe;
                  return (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        if (!canBatchDecrypt) return;
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
                              const addrLower = handleToAddr[handle];
                              if (addrLower) {
                                const emp = localEmployees.find((ee) => ee.address.toLowerCase() === addrLower);
                                if (emp) next[emp.address] = formatAmount(value, TOKEN_CONFIG.decimals);
                              }
                            }
                            return next;
                          });
                          toast.success(`Decrypted ${Object.keys(result).length} salary amount(s)`);
                        } catch (err: any) {
                          toast.error(getUserFriendlyErrorMessage(err, 'Batch decrypt failed'));
                        }
                      }}
                      disabled={!canBatchDecrypt}
                      loading={isDecryptingFhe}
                      title={handlesToDecrypt.length === 0 ? 'No salaries to decrypt (decrypt or pay first)' : 'Decrypt all on-chain salaries (one signature)'}
                    >
                      <Unlock className="h-4 w-4" /> Decrypt all
                    </Button>
                  );
                })()}
                {hasPayroll && !isOperatorSet && (
                  <Button variant="secondary" size="sm" onClick={() => setShowApprovePayrollModal(true)} disabled={isWriting && isApprovingPayroll} loading={isWriting && isApprovingPayroll}>
                    <CheckCircle2 className="h-4 w-4" /> Approve Payroll
                  </Button>
                )}
                <Button size="sm" onClick={() => setShowPayrollConfirm(true)} disabled={!hasPayroll || !isOperatorSet || localEmployees.length === 0 || !allSalariesDecrypted || isWriting || isEncrypting} loading={isEncrypting && localEmployees.length > 0} title={!isOperatorSet ? 'Click "Approve Payroll" first' : !allSalariesDecrypted ? 'Decrypt all on-chain salaries first' : ''}>
                  <Play className="h-4 w-4" /> Run Payroll
                </Button>
              </div>
              </div>
            </div>

            {onchainEmployees.length === 0 && localEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 flex items-center justify-center mb-5">
                  <Users className="h-10 w-10 text-[var(--color-primary)]/70" />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">No employees yet</h3>
                <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mb-1">Add employees manually or import from a spreadsheet to get started.</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">Use the <strong>Onboard Employees</strong> section above to add your first team member.</p>
              </div>
            ) : (
              <>
                <div className="px-6 pt-4 pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[var(--color-text-secondary)]">Enter the salary amount for each employee before running payroll. Click the lock icon to decrypt on-chain salary (uses latest payment from history).</p>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-[var(--color-text-tertiary)]">Invoice month:</label>
                      <input
                        type="month"
                        value={invoiceMonth}
                        onChange={(e) => setInvoiceMonth(e.target.value)}
                        className="rounded-lg border border-[var(--color-border-input)] bg-white px-2 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      />
                      <Link to="/employer/invoices" className="text-xs font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" /> View all invoices
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="mx-4 mb-4 rounded-xl border border-[var(--color-border-light)] overflow-hidden bg-white">
                  <table className="w-full">
                          <thead>
                            <tr className="bg-[var(--color-bg-light)]">
                              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">#</th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Name</th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Address</th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider w-20">Invoice</th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">On-chain Salary</th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Pay Amount ({TOKEN_CONFIG.underlyingSymbol})</th>
                              <th className="px-4 py-3 text-right text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border-light)]">
                            {localEmployees.map((e, i) => {
                              const addrLower = e.address.toLowerCase();
                              const hasHandle = !!salaryHandles[addrLower];
                              const isDecrypted = addrLower in decryptedSalaries;
                              const hasInvoice = invoicedAddresses.has(addrLower);

                              return (
                                <tr key={`${e.address}-${i}`} className="hover:bg-[var(--color-primary)]/5 transition-colors">
                                  <td className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">{i + 1}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <Avatar
                                        src={employeeAvatars?.[addrLower]}
                                        fallbackText={employeeNames[addrLower] || formatAddress(e.address, 8)}
                                        className="w-9 h-9 rounded-lg shrink-0"
                                      />
                                      <div>
                                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{employeeNames[addrLower] || '—'}</span>
                                        {employeeFrequencies[addrLower] && (
                                          <span className="block text-[10px] text-[var(--color-text-tertiary)] capitalize mt-0.5">{employeeFrequencies[addrLower] === 'biweekly' ? 'Bi-weekly' : employeeFrequencies[addrLower]}</span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">{formatAddress(e.address, 6)}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {hasInvoice ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-600" title="Invoice submitted for this month">
                                        <CheckCircle2 className="h-5 w-5" />
                                      </span>
                                    ) : (
                                      <span className="text-[var(--color-text-tertiary)] text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {isDecrypted ? (
                                      <span className="text-sm font-bold text-emerald-600">
                                        {formatAmount(decryptedSalaries[addrLower], TOKEN_CONFIG.decimals)} <span className="text-xs font-normal text-[var(--color-text-tertiary)]">{TOKEN_CONFIG.symbol}</span>
                                      </span>
                                    ) : hasHandle ? (
                                      <Button variant="ghost" size="sm" onClick={() => handleDecryptSalary(e.address)} disabled={decryptingEmployee !== null} loading={decryptingEmployee === e.address}>
                                        <Lock className="h-3 w-3" /> Decrypt
                                      </Button>
                                    ) : (
                                      <Badge variant="default" size="sm"><Lock className="h-3 w-3" /> No payment yet</Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Input type="number" placeholder="2500.00" step="0.01" min="0" value={paySalaries[e.address] ?? (e.salary === '0' ? '' : e.salary)} onChange={(ev) => setPaySalaries((prev) => ({ ...prev, [e.address]: ev.target.value }))} className="w-28 text-sm" />
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        title="Pay this employee"
                                        disabled={!(paySalaries[e.address] ?? e.salary) || Number(paySalaries[e.address] ?? e.salary) <= 0 || !!payingEmployee || isWriting || isEncrypting}
                                        loading={payingEmployee === e.address}
                                        onClick={async () => {
                                          const amt = paySalaries[e.address] ?? e.salary;
                                          if (!amt || Number(amt) <= 0) return;
                                          setPayingEmployee(e.address);
                                          try {
                                            await payOneSalary(e.address, amt);
                                            toast.success(`Paid ${formatAddress(e.address, 4)}`);
                                            reloadPaymentHandles();
                                          } catch (err: any) {
                                            toast.error(getUserFriendlyErrorMessage(err, 'Payment failed'));
                                          } finally {
                                            setPayingEmployee(null);
                                          }
                                        }}
                                      >
                                        <DollarSign className="h-3.5 w-3.5" /> Pay
                                      </Button>
                                      <Button variant="ghost" size="sm" title="Edit salary" onClick={() => { setEditingEmployee(e.address); setEditSalaryValue(''); setEditName(employeeNames[addrLower] ?? ''); setEditEmail(employeeEmails[addrLower] ?? ''); const freq = employeeFrequencies[addrLower]; setEditPaymentFrequency((freq === 'biweekly' || freq === 'weekly' ? freq : 'monthly')); }}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="sm" title="Remove employee" onClick={() => handleRemoveEmployee(e.address)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
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

        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mt-6">
          <PayrollRunSummarySection employerAddress={address ?? undefined} />
        </motion.div>
        </>
        )}

      {/* Edit Salary Modal */}
      <AnimatePresence>
        {editingEmployee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Edit Salary</h3>
                <button onClick={() => setEditingEmployee(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-[var(--color-text-tertiary)]" /></button>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">Update the encrypted salary and profile for <span className="font-mono font-medium">{formatAddress(editingEmployee, 6)}</span>.</p>
              <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Jane Doe" icon={<Users className="h-4 w-4" />} />
              <Input label="Email address" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" placeholder="e.g. jane@company.com" icon={<Mail className="h-4 w-4" />} />
              <Input label={`New Salary (${TOKEN_CONFIG.underlyingSymbol})`} type="number" placeholder="3000.00" step="0.01" min="0" value={editSalaryValue} onChange={(e) => setEditSalaryValue(e.target.value)} icon={<DollarSign className="h-4 w-4" />} />
              <div className="mt-4">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Payment frequency</label>
                <div className="flex gap-2">
                  {(['monthly', 'biweekly', 'weekly'] as const).map((freq) => (
                    <button key={freq} type="button" onClick={() => setEditPaymentFrequency(freq)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${editPaymentFrequency === freq ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border-light)] hover:border-[var(--color-primary)]/30 text-[var(--color-text-secondary)]'}`}>
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium capitalize">{freq === 'biweekly' ? 'Bi-weekly' : freq === 'monthly' ? 'Monthly' : 'Weekly'}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" className="flex-1" onClick={() => setEditingEmployee(null)}>Cancel</Button>
                <Button className="flex-1" onClick={handleEditSalary} disabled={isWriting || isEncrypting} loading={isWriting || isEncrypting}>
                  <Pencil className="h-4 w-4" /> Update Salary
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Preview Modal — confirm before onboarding */}
      <AnimatePresence>
        {showImportPreview && importPreviewRows && importPreviewRows.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Import preview</h3>
                <button type="button" onClick={() => { setShowImportPreview(false); setImportPreviewRows(null); }} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-[var(--color-text-tertiary)]" /></button>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">Review the rows below. Click <strong>Onboard</strong> to add these employees to your payroll.</p>
              <div className="rounded-xl border border-gray-200 overflow-auto flex-1 min-h-0 mb-4">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase">Address</th>
                      <th className="px-4 py-2 text-right text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase">Salary</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase">Frequency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importPreviewRows.map((r, i) => (
                      <tr key={`${r.address}-${i}`} className="hover:bg-[var(--color-primary)]/5">
                        <td className="px-4 py-2 font-mono text-[var(--color-text-primary)]">{formatAddress(r.address, 6)}</td>
                        <td className="px-4 py-2 text-right font-medium text-[var(--color-text-primary)]">{r.salary}</td>
                        <td className="px-4 py-2 text-[var(--color-text-secondary)]">{r.name || '—'}</td>
                        <td className="px-4 py-2 text-[var(--color-text-secondary)]">{r.email || '—'}</td>
                        <td className="px-4 py-2 text-[var(--color-text-secondary)] capitalize">{r.paymentFrequency === 'biweekly' ? 'Bi-weekly' : r.paymentFrequency === 'weekly' ? 'Weekly' : 'Monthly'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => { setShowImportPreview(false); setImportPreviewRows(null); }} disabled={isImporting}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleConfirmImportPreview} disabled={isImporting} loading={isImporting}>
                  <UserPlus className="h-4 w-4" /> Onboard {importPreviewRows.length} employee{importPreviewRows.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approve Payroll explanation modal */}
      <AnimatePresence>
        {showApprovePayrollModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Why approve payroll?</h3>
                <button onClick={() => setShowApprovePayrollModal(false)} className="p-1 rounded-lg hover:bg-gray-100" disabled={isApprovingPayroll}><X className="h-5 w-5 text-[var(--color-text-tertiary)]" /></button>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                The confidential token (cUSDCP) uses an <strong>operator pattern</strong>: your payroll contract must be approved to move tokens on your behalf when you run payroll.
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                This approval is a one-time setup per payroll contract. Once approved, you can run payroll whenever you want without approving again (until the approval expires or you revoke it).
              </p>
              <div className="p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-xl mb-4">
                <p className="text-xs text-[var(--color-text-primary)] font-medium">
                  You will sign a transaction that sets this payroll contract as an allowed operator for your confidential token balance. No tokens are transferred until you click &quot;Run Payroll&quot;.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowApprovePayrollModal(false)} disabled={isApprovingPayroll}>Cancel</Button>
                <Button
                  className="flex-1"
                  onClick={async () => {
                    setIsApprovingPayroll(true);
                    try {
                      await approvePayrollOperator();
                      toast.success('Payroll operator approved!');
                      setShowApprovePayrollModal(false);
                    } catch (err: any) {
                      toast.error(getUserFriendlyErrorMessage(err, 'Approval failed'));
                    } finally {
                      setIsApprovingPayroll(false);
                    }
                  }}
                  disabled={isWriting}
                  loading={isWriting && isApprovingPayroll}
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payroll Confirmation Modal */}
      <AnimatePresence>
        {showPayrollConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Confirm Payroll</h3>
                <button onClick={() => setShowPayrollConfirm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-[var(--color-text-tertiary)]" /></button>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">You are about to execute payroll for the following employees. Salaries will be encrypted on-chain.</p>
              <div className="rounded-xl border border-gray-200 overflow-hidden mb-4 max-h-64 overflow-y-auto">
                <table className="min-w-full">
                  <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase">Employee</th><th className="px-4 py-2 text-right text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase">Salary ({TOKEN_CONFIG.underlyingSymbol})</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {payableEmployees.map((e) => (
                      <tr key={e.address}>
                        <td className="px-4 py-2 text-sm text-[var(--color-text-primary)]">
                          {employeeNames[e.address.toLowerCase()] ? <span className="font-medium">{employeeNames[e.address.toLowerCase()]}</span> : null}
                          <span className={employeeNames[e.address.toLowerCase()] ? 'font-mono text-[var(--color-text-tertiary)] text-xs ml-1' : 'font-mono'}>{formatAddress(e.address, 6)}</span>
                        </td>
                        <td className="px-4 py-2 text-sm font-bold text-[var(--color-text-primary)] text-right">{paySalaries[e.address] || e.salary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <p className="text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  Paying <strong>{payableEmployees.length}</strong> employee(s). This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowPayrollConfirm(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleRunPayroll} disabled={payableEmployees.length === 0 || isWriting || isEncrypting} loading={isWriting || isEncrypting}>
                  <Play className="h-4 w-4" /> Execute Payroll
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default EmployerDashboard;
