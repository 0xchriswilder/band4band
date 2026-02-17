import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useWriteContract } from 'wagmi';
import toast from 'react-hot-toast';
import {
  UserCircle,
  Wallet,
  Clock,
  Lock,
  Unlock,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  DollarSign,
  ArrowRight,
  ShieldOff,
  TrendingUp,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  FileText,
  Calendar,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { useFhevmDecrypt } from '../hooks/useFhevmDecrypt';
import { useFhevmEncrypt } from '../hooks/useFhevmEncrypt';
import { useEmployeePaymentHistory, useEmployeeProfile, useSubmitEmployeeInvoice } from '../hooks/usePayrollHistory';
import { useConfidentialBalance } from '../hooks/useConfidentialBalance';
import { useWrapToken } from '../hooks/useWrapToken';
import { useFhevm } from '../providers/useFhevmContext';
import { CONTRACTS, CONF_TOKEN_ABI, TOKEN_CONFIG } from '../lib/contracts';
import { formatAddress, formatAmount, parseAmount } from '../lib/utils';
import { ConnectWalletCTA } from '../components/ConnectWalletCTA';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function EmployeeDashboard() {
  const { address, isConnected } = useAccount();
  const { isReady: fheReady } = useFhevm();
  const { decryptHandle } = useFhevmDecrypt();
  const { encryptAmount } = useFhevmEncrypt();
  const { writeContractAsync, isPending: isUnwrapWriting } = useWriteContract();
  const { employee, isEmployee } = useEmployeeProfile();
  const { payments, total: paymentCount, isLoading, reload } = useEmployeePaymentHistory();
  const { submit: submitInvoice, isSubmitting: isSubmittingInvoice, error: invoiceError } = useSubmitEmployeeInvoice();

  const {
    hasBalance: hasCusdcpBalance,
    decryptedBalance: cusdcpBalance,
    isDecrypted: cusdcpDecrypted,
    isDecrypting: cusdcpDecrypting,
    fheReady: fheReadyForBalance,
    decrypt: decryptCusdcpBalance,
    refetch: refetchCusdcpBalance,
  } = useConfidentialBalance();

  const {
    usdcBalance,
    usdcBalanceFormatted,
    isWriting: isWrapping,
    needsApproval,
    wrapUsdc,
    refetch: refetchUsdc,
  } = useWrapToken();

  const [showBalance, setShowBalance] = useState(false);
  const [decryptedValues, setDecryptedValues] = useState<Record<string, bigint>>({});
  const [decryptingKey, setDecryptingKey] = useState<string | null>(null);
  const [wrapAmount, setWrapAmount] = useState('');
  const [unwrapAmount, setUnwrapAmount] = useState('');
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [invoiceName, setInvoiceName] = useState('');
  const [invoiceRole, setInvoiceRole] = useState('');
  const [invoiceMonth, setInvoiceMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const handleDecrypt = async (encrypted: string, key: string) => {
    if (decryptedValues[key] !== undefined) return;
    setDecryptingKey(key);
    try {
      const value = await decryptHandle(encrypted, CONTRACTS.CONF_TOKEN);
      if (value !== null) {
        setDecryptedValues((prev) => ({ ...prev, [key]: value }));
        toast.success('Amount decrypted');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Decrypt failed');
    } finally {
      setDecryptingKey(null);
    }
  };

  const handleUnwrap = async () => {
    if (!address || !unwrapAmount || Number(unwrapAmount) <= 0) return;
    setIsUnwrapping(true);
    try {
      const amount = parseAmount(unwrapAmount, TOKEN_CONFIG.decimals);
      const encrypted = await encryptAmount(amount, CONTRACTS.CONF_TOKEN);
      if (!encrypted || !encrypted.handles[0]) {
        throw new Error('Failed to encrypt unwrap amount');
      }

      await writeContractAsync({
        address: CONTRACTS.CONF_TOKEN,
        abi: CONF_TOKEN_ABI,
        functionName: 'unwrap',
        args: [address, address, encrypted.handles[0], encrypted.inputProof as `0x${string}`],
      });

      toast.success('Unwrap initiated (async via gateway)');
      setUnwrapAmount('');
      refetchCusdcpBalance();
      refetchUsdc();
    } catch (err: any) {
      toast.error(err?.message || 'Unwrap failed');
      console.error('[Unwrap] Failed:', err);
    } finally {
      setIsUnwrapping(false);
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

  if (!isConnected) {
    return (
      <ConnectWalletCTA
        embedded
        icon={UserCircle}
        badge="For Employees & Team Members"
        title="Your Salary,"
        titleAccent="Your Privacy"
        subtitle="View and decrypt your confidential salary payments, manage your wrapped tokens, and track your complete payment history — all secured by Fully Homomorphic Encryption."
        features={[
          {
            icon: Lock,
            title: 'Decrypt Payments',
            description: 'Only you can decrypt your salary amounts using your wallet signature. No one else can see them.',
          },
          {
            icon: Clock,
            title: 'Payment History',
            description: 'View your complete payment timeline with dates, transaction hashes, and encrypted amounts.',
          },
          {
            icon: RefreshCw,
            title: 'Wrap & Unwrap',
            description: 'Seamlessly convert between USDC and confidential cUSDCp tokens for private transactions.',
          },
          {
            icon: ShieldCheck,
            title: 'Verify On-Chain',
            description: 'Independently verify every payment on the blockchain. Provably correct, cryptographically private.',
          },
        ]}
        highlights={[
          { icon: Shield, label: 'FHE-encrypted' },
          { icon: Eye, label: 'Self-service decryption' },
          { icon: CheckCircle2, label: 'Verifiable' },
        ]}
      />
    );
  }

  return (
    <>
        {/* Page Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
              Employee Portal
            </h2>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">
              View your encrypted payments, decrypt amounts, and manage tokens.
            </p>
          </div>
          <div>
            {fheReady ? (
              <Badge variant="success" dot size="md">FHE ready</Badge>
            ) : (
              <Badge variant="warning" dot size="md">FHE initializing...</Badge>
            )}
          </div>
        </motion.div>

        {/* ─── Hero Balance Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
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
                    <p className="text-white/70 text-sm font-medium">Your Balance</p>
                    <p className="text-white font-bold">Encrypted {TOKEN_CONFIG.symbol}</p>
                  </div>
                </div>
                <button
                  onClick={handleRevealBalance}
                  disabled={cusdcpDecrypting || !hasCusdcpBalance}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/90 text-sm font-medium transition-all disabled:opacity-50 backdrop-blur-sm"
                >
                  {cusdcpDecrypting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Decrypting...
                    </>
                  ) : showBalance ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Reveal
                    </>
                  )}
                </button>
              </div>

              <div className="mb-6">
                <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                  {showBalance && cusdcpDecrypted && cusdcpBalance !== null ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-3"
                    >
                      {formatAmount(cusdcpBalance, TOKEN_CONFIG.decimals)}
                      <span className="text-2xl font-normal text-white/70">{TOKEN_CONFIG.symbol}</span>
                    </motion.span>
                  ) : (
                    <span className="tracking-wider">$&bull;&bull;&bull;&bull;&bull;&bull;</span>
                  )}
                </div>
                <p className="text-white/60 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Only you can decrypt this balance
                </p>
              </div>

              {/* Mini Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-white/60 text-xs mb-1">Payments</p>
                  <p className="text-white font-bold text-lg">{paymentCount}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-white/60 text-xs mb-1">{TOKEN_CONFIG.underlyingSymbol}</p>
                  <p className="text-white font-bold text-lg">
                    {Number(usdcBalanceFormatted).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-white/60 text-xs mb-1">Wallet</p>
                  <p className="text-white font-bold text-sm truncate">{address ? formatAddress(address, 4) : '---'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Monthly Invoice (only for onboarded employees) ─── */}
        {isEmployee && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                Monthly Invoice
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Submit your invoice for the month so your employer can see you are ready for payroll. Name and role are stored for their records; salary amount stays encrypted on-chain.
              </p>
              <div className="space-y-4 max-w-md">
                <Input
                  label="Full name"
                  value={invoiceName}
                  onChange={(e) => setInvoiceName(e.target.value)}
                  placeholder="Your name"
                />
                <Input
                  label="Job role / title"
                  value={invoiceRole}
                  onChange={(e) => setInvoiceRole(e.target.value)}
                  placeholder="e.g. Software Engineer"
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                    Month due
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
                    <input
                      type="month"
                      value={invoiceMonth}
                      onChange={(e) => setInvoiceMonth(e.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border-input)] bg-white pl-10 pr-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
                {invoiceError && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {invoiceError}
                  </p>
                )}
                <Button
                  className="w-full sm:w-auto"
                  onClick={async () => {
                    const ok = await submitInvoice({ name: invoiceName, role: invoiceRole, month_due: invoiceMonth });
                    if (ok) {
                      toast.success('Invoice submitted');
                      setInvoiceName('');
                      setInvoiceRole('');
                    } else {
                      toast.error(invoiceError || 'Submit failed');
                    }
                  }}
                  disabled={isSubmittingInvoice || !invoiceName.trim() || !invoiceRole.trim() || !invoiceMonth}
                  loading={isSubmittingInvoice}
                >
                  <FileText className="h-4 w-4" /> Submit Invoice
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── Token Actions Row ─── */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Wrap / Shield */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Card variant="elevated" padding="lg" className="h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Wrap / Shield
                </h2>
                <Badge variant="info" size="sm">
                  {TOKEN_CONFIG.underlyingSymbol} &rarr; {TOKEN_CONFIG.symbol}
                </Badge>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Convert {TOKEN_CONFIG.underlyingSymbol} into confidential {TOKEN_CONFIG.symbol} tokens.
              </p>

              <div className="grid gap-3 grid-cols-2 mb-4">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-0.5">
                    {TOKEN_CONFIG.underlyingSymbol}
                  </div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    {Number(usdcBalanceFormatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide mb-0.5">
                    {TOKEN_CONFIG.symbol}
                  </div>
                  <div className="text-lg font-bold text-emerald-700">
                    {cusdcpDecrypted && cusdcpBalance !== null
                      ? formatAmount(cusdcpBalance, TOKEN_CONFIG.decimals)
                      : hasCusdcpBalance ? 'Encrypted' : '0.00'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type="number" placeholder="0.00" step="0.01" min="0" value={wrapAmount} onChange={(e) => setWrapAmount(e.target.value)} />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-primary)] hover:underline" onClick={() => setWrapAmount(usdcBalanceFormatted)}>MAX</button>
                </div>
                <Button
                  size="md"
                  onClick={async () => {
                    if (!wrapAmount || Number(wrapAmount) <= 0) return;
                    try {
                      await wrapUsdc(wrapAmount);
                      toast.success('Tokens wrapped!');
                      setWrapAmount('');
                      refetchUsdc();
                      refetchCusdcpBalance();
                    } catch (err: any) {
                      toast.error(err?.message || 'Wrap failed');
                    }
                  }}
                  disabled={!isConnected || isWrapping || !wrapAmount || Number(wrapAmount) <= 0 || usdcBalance === 0n}
                  loading={isWrapping}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {wrapAmount && needsApproval(wrapAmount) ? 'Approve' : 'Wrap'}
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Unwrap / Unshield */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Card variant="elevated" padding="lg" className="h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <ShieldOff className="h-5 w-5 text-orange-500" />
                  Unwrap / Unshield
                </h2>
                <Badge variant="warning" size="sm">
                  {TOKEN_CONFIG.symbol} &rarr; {TOKEN_CONFIG.underlyingSymbol}
                </Badge>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Convert {TOKEN_CONFIG.symbol} back to {TOKEN_CONFIG.underlyingSymbol}.
                Async via Zama gateway.
              </p>

              <div className="grid gap-3 grid-cols-2 mb-4">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[10px] font-medium text-emerald-700 uppercase tracking-wide mb-0.5">
                    {TOKEN_CONFIG.symbol}
                  </div>
                  <div className="text-lg font-bold text-emerald-700">
                    {cusdcpDecrypted && cusdcpBalance !== null
                      ? formatAmount(cusdcpBalance, TOKEN_CONFIG.decimals)
                      : hasCusdcpBalance ? 'Encrypted' : '0.00'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-0.5">
                    {TOKEN_CONFIG.underlyingSymbol}
                  </div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    {Number(usdcBalanceFormatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type="number" placeholder="0.00" step="0.01" min="0" value={unwrapAmount} onChange={(e) => setUnwrapAmount(e.target.value)} />
                  {cusdcpDecrypted && cusdcpBalance !== null && cusdcpBalance > 0n && (
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-primary)] hover:underline" onClick={() => setUnwrapAmount(formatAmount(cusdcpBalance, TOKEN_CONFIG.decimals))}>MAX</button>
                  )}
                </div>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={handleUnwrap}
                  disabled={!isConnected || isUnwrapping || isUnwrapWriting || !unwrapAmount || Number(unwrapAmount) <= 0 || !fheReady}
                  loading={isUnwrapping || isUnwrapWriting}
                >
                  <ShieldOff className="h-4 w-4" />
                  Unwrap
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* ─── Payment History ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <Card variant="elevated" className="overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Payment History</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => reload()}
                  disabled={isLoading}
                  loading={isLoading}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full mx-auto mb-4"
                />
                <p className="text-[var(--color-text-secondary)] text-sm">Loading payments...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No payments yet</h3>
                <p className="text-[var(--color-text-secondary)] text-sm max-w-sm mx-auto">
                  Once your employer runs payroll, your encrypted payments will
                  appear here. You can then decrypt each one.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const key = `${p.tx_hash}-${p.employee}`;
                  const isDecryptedPayment = key in decryptedValues;
                  return (
                    <div key={key} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isDecryptedPayment ? 'bg-emerald-50' : 'bg-gray-100'
                        }`}>
                          {isDecryptedPayment ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Lock className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[var(--color-text-primary)]">Salary Payment</p>
                            {isDecryptedPayment && (
                              <Badge variant="success" size="sm">Decrypted</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)] mt-0.5">
                            <span>
                              {new Date(p.timestamp).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span>&middot;</span>
                            <span>From: {formatAddress(p.employer, 4)}</span>
                            <span>&middot;</span>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${p.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--color-primary)] hover:underline"
                            >
                              Tx
                            </a>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          {isDecryptedPayment ? (
                            <span className="text-lg font-bold text-emerald-600">
                              {formatAmount(decryptedValues[key], TOKEN_CONFIG.decimals)}
                              <span className="text-xs font-normal text-[var(--color-text-tertiary)] ml-1">{TOKEN_CONFIG.symbol}</span>
                            </span>
                          ) : p.encrypted ? (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={decryptingKey !== null || !fheReady}
                              loading={decryptingKey === key}
                              onClick={() => handleDecrypt(p.encrypted, key)}
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              {decryptingKey === key ? 'Decrypting...' : 'Decrypt'}
                            </Button>
                          ) : (
                            <Badge variant="default" size="sm">
                              <Lock className="h-3 w-3" /> Encrypted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* ─── Info Card ─── */}
        <Card variant="bordered" padding="md">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                How it works
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                <strong>Decrypt:</strong> Click &ldquo;Decrypt&rdquo; to reveal an encrypted payment amount.
                This generates a temporary keypair and asks for an EIP-712 signature to prove
                you&apos;re authorised. The Zama relayer returns the decrypted amount.
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                <strong>Unwrap:</strong> Convert your confidential {TOKEN_CONFIG.symbol} back to
                regular {TOKEN_CONFIG.underlyingSymbol}. The Zama gateway handles on-chain decryption
                and releases your tokens automatically (may take a few moments).
              </p>
            </div>
          </div>
        </Card>
    </>
  );
}

export default EmployeeDashboard;
