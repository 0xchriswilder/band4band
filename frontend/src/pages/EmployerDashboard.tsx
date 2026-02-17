import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
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
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { usePayrollEmployer } from '../hooks/usePayrollEmployer';
import { useWrapToken } from '../hooks/useWrapToken';
import { useConfidentialBalance } from '../hooks/useConfidentialBalance';
import { useFhevmEncrypt } from '../hooks/useFhevmEncrypt';
import { useFhevmDecrypt } from '../hooks/useFhevmDecrypt';
import { formatAddress, formatAmount, parseAmount } from '../lib/utils';
import { CONTRACTS, CONF_TOKEN_ABI, TOKEN_CONFIG } from '../lib/contracts';
import { ConnectWalletCTA } from '../components/ConnectWalletCTA';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

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
    fetchSalaryHandles,
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
  const { decryptHandle, isDecrypting: isDecryptingSalary } = useFhevmDecrypt();
  const { writeContractAsync, isPending: isUnwrapWriting } = useWriteContract();

  const [showBalance, setShowBalance] = useState(false);
  const [wrapAmount, setWrapAmount] = useState('');
  const [unwrapAmount, setUnwrapAmount] = useState('');
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [paySalaries, setPaySalaries] = useState<Record<string, string>>({});
  const [employeeAddress, setEmployeeAddress] = useState('');
  const [salary, setSalary] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');

  // Employer salary decrypt state
  const [salaryHandles, setSalaryHandles] = useState<Record<string, string>>({});
  const [decryptedSalaries, setDecryptedSalaries] = useState<Record<string, bigint>>({});

  // Edit salary modal
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editSalaryValue, setEditSalaryValue] = useState('');

  // Payroll confirmation modal
  const [showPayrollConfirm, setShowPayrollConfirm] = useState(false);

  // Load salary handles when payroll is ready
  useEffect(() => {
    if (hasPayroll && payrollAddress) {
      fetchSalaryHandles().then(setSalaryHandles);
    }
  }, [hasPayroll, payrollAddress, fetchSalaryHandles]);

  const handleFileImport = async (file: File) => {
    setIsImporting(true);
    setImportCount(0);
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      const rows: { address: string; salary: string }[] = [];

      if (ext === 'csv') {
        const parsed = await new Promise<{ data: Array<Record<string, string>> }>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => resolve({ data: result.data as Array<Record<string, string>> }),
            error: reject,
          });
        });
        for (const row of parsed.data) {
          if (row.address && row.salary) {
            rows.push({ address: row.address.trim(), salary: String(row.salary).trim() });
          }
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        for (const row of json) {
          if (row.address && row.salary) {
            rows.push({ address: String(row.address).trim(), salary: String(row.salary).trim() });
          }
        }
      }

      if (rows.length > 0) {
        setImportCount(rows.length);
        await batchOnboardEmployees(rows);
        toast.success(`${rows.length} employee(s) onboarded successfully`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleOnboard = async () => {
    if (!employeeAddress || !salary) return;
    try {
      await onboardEmployee(employeeAddress, salary);
      toast.success('Employee onboarded successfully');
      setEmployeeAddress('');
      setSalary('');
    } catch (err: any) {
      toast.error(err?.message || 'Onboard failed');
    }
  };

  const handleEditSalary = async () => {
    if (!editingEmployee || !editSalaryValue) return;
    try {
      await editEmployeeSalary(editingEmployee, editSalaryValue);
      toast.success('Salary updated successfully');
      setEditingEmployee(null);
      setEditSalaryValue('');
    } catch (err: any) {
      toast.error(err?.message || 'Edit salary failed');
    }
  };

  const handleRemoveEmployee = async (employeeAddr: string) => {
    try {
      await removeEmployeeFromPayroll(employeeAddr);
      toast.success('Employee removed');
    } catch (err: any) {
      toast.error(err?.message || 'Remove failed');
    }
  };

  const handleDecryptSalary = async (employeeAddr: string) => {
    const handle = salaryHandles[employeeAddr.toLowerCase()];
    if (!handle || !payrollAddress) {
      toast.error('No salary handle found for this employee');
      return;
    }
    try {
      const value = await decryptHandle(handle, payrollAddress);
      if (value !== null) {
        setDecryptedSalaries((prev) => ({ ...prev, [employeeAddr.toLowerCase()]: value }));
        toast.success('Salary decrypted');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Decrypt failed');
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
      // Refresh salary handles after payment
      fetchSalaryHandles().then(setSalaryHandles);
    } catch (err: any) {
      toast.error(err?.message || 'Payroll failed');
    }
  };

  const payableEmployees = localEmployees.filter((e) => {
    const sal = paySalaries[e.address] || e.salary;
    return sal && Number(sal) > 0;
  });

  if (!isConnected) {
    return (
      <ConnectWalletCTA
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
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-light)]">
      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-[var(--color-primary)]" />
              Employer Dashboard
            </h1>
            <p className="text-[var(--color-text-secondary)]">Manage payroll, onboard employees, and execute confidential payments.</p>
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

            {/* Register section */}
            {!hasPayroll && (
              <motion.div initial="hidden" animate="visible" variants={fadeUp}>
                <Card variant="elevated" padding="lg" className="border-l-4 border-l-[var(--color-primary)]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Step 1: Register your payroll contract</h2>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Deploy a dedicated confidential payroll contract via the factory.</p>
                    </div>
                    <Button size="lg" onClick={async () => { try { await registerEmployer(); toast.success('Payroll registered!'); } catch (err: any) { toast.error(err?.message || 'Registration failed'); }}} disabled={!isConnected || isWriting} loading={isWriting}>
                      <Building2 className="h-4 w-4" /> Register Payroll
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Wrap / Shield */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <Card variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" /> Wrap / Shield Tokens
                  </h2>
                  <Badge variant="info" size="sm">{TOKEN_CONFIG.underlyingSymbol} &rarr; {TOKEN_CONFIG.symbol}</Badge>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">Convert {TOKEN_CONFIG.underlyingSymbol} into confidential {TOKEN_CONFIG.symbol} tokens to fund payroll.</p>
                <div className="grid gap-4 sm:grid-cols-[1fr,auto,1fr] items-center mb-6">
                  <div className="p-4 rounded-xl bg-gray-50 border border-[var(--color-border-light)]">
                    <div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">{TOKEN_CONFIG.underlyingSymbol} Balance</div>
                    <div className="text-xl font-bold text-[var(--color-text-primary)]">{Number(usdcBalanceFormatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-sm font-normal text-[var(--color-text-tertiary)] ml-1">{TOKEN_CONFIG.underlyingSymbol}</span></div>
                  </div>
                  <div className="hidden sm:flex items-center justify-center"><ArrowRight className="h-5 w-5 text-gray-300" /></div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-1">{TOKEN_CONFIG.symbol} Balance</div>
                    {cusdcpDecrypted && cusdcpBalance !== null ? (
                      <div className="text-xl font-bold text-emerald-700">{formatAmount(cusdcpBalance, TOKEN_CONFIG.decimals)}<span className="text-sm font-normal text-emerald-600 ml-1">{TOKEN_CONFIG.symbol}</span></div>
                    ) : hasCusdcpBalance ? (
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm text-emerald-700 font-medium">Encrypted</span>
                        <Button variant="secondary" size="sm" onClick={() => decryptCusdcpBalance()} disabled={cusdcpDecrypting || !fheReady} loading={cusdcpDecrypting}><Unlock className="h-3 w-3" /> Reveal</Button>
                      </div>
                    ) : (
                      <div className="text-xl font-bold text-emerald-700">0.00<span className="text-sm font-normal text-emerald-600 ml-1">{TOKEN_CONFIG.symbol}</span></div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input type="number" placeholder="0.00" step="0.01" min="0" value={wrapAmount} onChange={(e) => setWrapAmount(e.target.value)} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-primary)] hover:underline" onClick={() => setWrapAmount(usdcBalanceFormatted)}>MAX</button>
                  </div>
                  <Button size="md" onClick={async () => { if (!wrapAmount || Number(wrapAmount) <= 0) return; try { await wrapUsdc(wrapAmount); toast.success('Tokens wrapped!'); setWrapAmount(''); refetchBalances(); refetchCusdcpBalance(); } catch (err: any) { toast.error(err?.message || 'Wrap failed'); }}} disabled={!isConnected || isWrapping || !wrapAmount || Number(wrapAmount) <= 0 || usdcBalance === 0n} loading={isWrapping}>
                    <ShieldCheck className="h-4 w-4" /> {wrapAmount && needsApproval(wrapAmount) ? 'Approve & Wrap' : 'Wrap'}
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Unwrap / Unshield */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <Card variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <ShieldOff className="h-5 w-5 text-orange-500" /> Unwrap / Unshield Tokens
                  </h2>
                  <Badge variant="warning" size="sm">{TOKEN_CONFIG.symbol} &rarr; {TOKEN_CONFIG.underlyingSymbol}</Badge>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">Convert confidential {TOKEN_CONFIG.symbol} back to {TOKEN_CONFIG.underlyingSymbol}. Async via Zama gateway.</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input type="number" placeholder="0.00" step="0.01" min="0" value={unwrapAmount} onChange={(e) => setUnwrapAmount(e.target.value)} />
                    {cusdcpDecrypted && cusdcpBalance !== null && cusdcpBalance > 0n && (
                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-primary)] hover:underline" onClick={() => setUnwrapAmount(formatAmount(cusdcpBalance, TOKEN_CONFIG.decimals))}>MAX</button>
                    )}
                  </div>
                  <Button size="md" variant="secondary" onClick={async () => {
                    if (!address || !unwrapAmount || Number(unwrapAmount) <= 0) return;
                    setIsUnwrapping(true);
                    try {
                      const amount = parseAmount(unwrapAmount, TOKEN_CONFIG.decimals);
                      const encrypted = await encryptAmount(amount, CONTRACTS.CONF_TOKEN);
                      if (!encrypted || !encrypted.handles[0]) throw new Error('Encrypt failed');
                      await writeContractAsync({ address: CONTRACTS.CONF_TOKEN, abi: CONF_TOKEN_ABI, functionName: 'unwrap', args: [address, address, encrypted.handles[0], encrypted.inputProof as `0x${string}`] });
                      toast.success('Unwrap initiated (async via gateway)');
                      setUnwrapAmount(''); refetchBalances(); refetchCusdcpBalance();
                    } catch (err: any) { toast.error(err?.message || 'Unwrap failed'); } finally { setIsUnwrapping(false); }
                  }} disabled={!isConnected || isUnwrapping || isUnwrapWriting || !unwrapAmount || Number(unwrapAmount) <= 0 || !fheReady} loading={isUnwrapping || isUnwrapWriting}>
                    <ShieldOff className="h-4 w-4" /> Unwrap
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Onboard Employees */}
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
                      <Input label="Employee Wallet Address" value={employeeAddress} onChange={(e) => setEmployeeAddress(e.target.value)} placeholder="0x..." icon={<Hash className="h-4 w-4" />} />
                      <Input label={`Monthly Salary (${TOKEN_CONFIG.underlyingSymbol})`} value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="2500.00" hint="Amount in USDC (6 decimals). Will be encrypted before submitting." icon={<DollarSign className="h-4 w-4" />} />
                      <Button className="w-full" onClick={handleOnboard} disabled={!hasPayroll || isWriting || isEncrypting || !employeeAddress || !salary} loading={isEncrypting || isWriting}>
                        {isEncrypting ? 'Encrypting salary...' : 'Onboard Employee'}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div key="import" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[var(--color-primary-light)] transition-colors">
                        <FileSpreadsheet className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Drop a CSV or XLSX file</p>
                        <p className="text-xs text-[var(--color-text-tertiary)] mb-4">Required columns: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[var(--color-primary-dark)]">address</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[var(--color-primary-dark)]">salary</code></p>
                        <label>
                          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file && hasPayroll && !isWriting && !isEncrypting) void handleFileImport(file); }} />
                          <Button variant="secondary" size="sm" onClick={() => {}} className="pointer-events-none"><Upload className="h-4 w-4" /> Choose file</Button>
                        </label>
                      </div>
                      {isImporting && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-primary)]/5">
                          <svg className="animate-spin h-4 w-4 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          <span className="text-sm font-medium text-[var(--color-primary-dark)]">Encrypting &amp; batch onboarding {importCount} employee{importCount !== 1 ? 's' : ''}...</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>

            {/* Employee List + Run Payroll */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <Card variant="elevated" padding="lg">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Users className="h-5 w-5 text-[var(--color-primary)]" /> Employees
                    {localEmployees.length > 0 && <Badge variant="primary" size="sm">{localEmployees.length}</Badge>}
                  </h2>
                  <div className="flex items-center gap-2">
                    {hasPayroll && !isOperatorSet && (
                      <Button variant="secondary" size="sm" onClick={async () => { try { await approvePayrollOperator(); toast.success('Payroll operator approved!'); } catch (err: any) { toast.error(err?.message || 'Approval failed'); }}} disabled={isWriting} loading={isWriting}>
                        <CheckCircle2 className="h-4 w-4" /> Approve Payroll
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setShowPayrollConfirm(true)} disabled={!hasPayroll || !isOperatorSet || localEmployees.length === 0 || isWriting || isEncrypting} loading={isEncrypting && localEmployees.length > 0} title={!isOperatorSet ? 'Click "Approve Payroll" first' : ''}>
                      <Play className="h-4 w-4" /> Run Payroll
                    </Button>
                  </div>
                </div>

                {onchainEmployees.length === 0 && localEmployees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 mb-4"><Users className="h-8 w-8 text-gray-300" /></div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No employees yet</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">Add employees manually or import from a spreadsheet to get started.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-[var(--color-text-secondary)] mb-3">Enter the salary amount for each employee before running payroll. Click the lock icon to decrypt on-chain salary.</p>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="min-w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">#</th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Address</th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">On-chain Salary</th>
                              <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Pay Amount ({TOKEN_CONFIG.underlyingSymbol})</th>
                              <th className="px-4 py-3 text-right text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {localEmployees.map((e, i) => {
                              const addrLower = e.address.toLowerCase();
                              const hasHandle = !!salaryHandles[addrLower];
                              const isDecrypted = addrLower in decryptedSalaries;

                              return (
                                <tr key={`${e.address}-${i}`} className="hover:bg-[#f4eee6]/50 transition-colors">
                                  <td className="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">{i + 1}</td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">{formatAddress(e.address, 6)}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {isDecrypted ? (
                                      <span className="text-sm font-bold text-emerald-600">
                                        {formatAmount(decryptedSalaries[addrLower], TOKEN_CONFIG.decimals)} <span className="text-xs font-normal text-[var(--color-text-tertiary)]">{TOKEN_CONFIG.symbol}</span>
                                      </span>
                                    ) : hasHandle ? (
                                      <Button variant="ghost" size="sm" onClick={() => handleDecryptSalary(e.address)} disabled={isDecryptingSalary} loading={isDecryptingSalary}>
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
                                      <Button variant="ghost" size="sm" title="Edit salary" onClick={() => { setEditingEmployee(e.address); setEditSalaryValue(''); }}>
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
                    </div>
                  </>
                )}
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <Card variant="elevated" padding="md">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[var(--color-primary)]" /> Overview</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Wallet className="w-5 h-5 text-blue-600" /></div>
                    <div className="flex-1 min-w-0"><p className="text-xs text-[var(--color-text-tertiary)]">Wallet</p><p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{isConnected && address ? formatAddress(address, 6) : 'Not connected'}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasPayroll ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      {hasPayroll ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-xs text-[var(--color-text-tertiary)]">Contract</p><p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{hasPayroll && payrollAddress ? formatAddress(payrollAddress, 6) : 'Not deployed'}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-purple-600" /></div>
                    <div className="flex-1 min-w-0"><p className="text-xs text-[var(--color-text-tertiary)]">Employees</p><p className="text-sm font-bold text-[var(--color-text-primary)]">{onchainEmployees.length || localEmployees.length}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5 text-[var(--color-primary)]" /></div>
                    <div className="flex-1 min-w-0"><p className="text-xs text-[var(--color-text-tertiary)]">Currency</p><p className="text-sm font-bold text-[var(--color-text-primary)]">{TOKEN_CONFIG.symbol}</p></div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card variant="elevated" className="overflow-hidden">
                <div className="p-5 border-b border-[var(--color-border-light)]"><h3 className="text-sm font-bold text-[var(--color-text-primary)]">Quick Actions</h3></div>
                <div className="p-3">
                  {[{ to: '/activity', icon: BarChart3, title: 'Payment History' }, { to: '/employee', icon: Users, title: 'Employee Portal' }].map((action) => (
                    <Link key={action.to} to={action.to} className="block">
                      <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#f4eee6] transition-colors group">
                        <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-primary)] to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20 group-hover:scale-105 transition-transform"><action.icon className="w-5 h-5 text-white" /></div>
                        <span className="font-medium text-[var(--color-text-primary)] text-sm">{action.title}</span>
                        <ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-[var(--color-primary)] transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Privacy Info */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 border border-orange-100/50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent rounded-full blur-2xl" />
                <div className="relative p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[var(--color-primary)] to-amber-500 rounded-xl flex items-center justify-center shadow-lg"><Shield className="w-6 h-6 text-white" /></div>
                    <div>
                      <h3 className="font-bold text-[var(--color-text-primary)] mb-1">Payroll Privacy</h3>
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">All salary amounts are encrypted using FHE. Only you and the respective employee can decrypt each salary.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Edit Salary Modal */}
      <AnimatePresence>
        {editingEmployee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Edit Salary</h3>
                <button onClick={() => setEditingEmployee(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-5 w-5 text-[var(--color-text-tertiary)]" /></button>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">Update the encrypted salary for <span className="font-mono font-medium">{formatAddress(editingEmployee, 6)}</span>.</p>
              <Input label={`New Salary (${TOKEN_CONFIG.underlyingSymbol})`} type="number" placeholder="3000.00" step="0.01" min="0" value={editSalaryValue} onChange={(e) => setEditSalaryValue(e.target.value)} icon={<DollarSign className="h-4 w-4" />} />
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" className="flex-1" onClick={() => setEditingEmployee(null)}>Cancel</Button>
                <Button className="flex-1" onClick={handleEditSalary} disabled={!editSalaryValue || Number(editSalaryValue) <= 0 || isWriting || isEncrypting} loading={isWriting || isEncrypting}>
                  <Pencil className="h-4 w-4" /> Update Salary
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
                        <td className="px-4 py-2 text-sm font-mono text-[var(--color-text-primary)]">{formatAddress(e.address, 6)}</td>
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
                <Button className="flex-1" onClick={handleRunPayroll} disabled={isWriting || isEncrypting} loading={isWriting || isEncrypting}>
                  <Play className="h-4 w-4" /> Execute Payroll
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

export default EmployerDashboard;
