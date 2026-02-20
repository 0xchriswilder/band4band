import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FileSignature, ExternalLink, Loader2, Send, Link2, Link2Off, CheckCircle2, Mail, ArrowLeft, Info, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/Avatar';
import { getIndexerUrl } from '../lib/indexerApi';
import { usePayrollEmployer } from '../hooks/usePayrollEmployer';
import { useEmployerEmployeeNames } from '../hooks/usePayrollHistory';
import { formatAddress } from '../lib/utils';

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

const INDEXER = getIndexerUrl();

type ContractRow = {
  id: string;
  payroll_address: string;
  employee_address: string;
  employee_email: string;
  employer_address: string;
  envelope_id: string;
  status: string;
  signed_at: string | null;
  created_at: string;
};

type InAppContractRow = {
  id: string;
  employer_address: string;
  payroll_address: string;
  employee_address: string | null;
  contract_type: string;
  status: 'draft' | 'assigned' | 'signed';
  signed_at: string | null;
  created_at: string;
  form_data?: { contract_name?: string };
};

export function ContractsPage() {
  const { address, isConnected } = useAccount();
  const { hasPayroll, localEmployees, payrollAddress, refetchEmployees, isLoadingPayroll } = usePayrollEmployer();
  const { names: employeeNames, emails: employeeEmails, avatars: employeeAvatars } = useEmployerEmployeeNames();

  const [docusignConnected, setDocusignConnected] = useState(false);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [inAppContracts, setInAppContracts] = useState<InAppContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInApp, setLoadingInApp] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  /** Employer = has a payroll (once loaded). While payroll is still loading, treat as employer so we don't flash employee-only view. */
  const isEmployer = !!address && (hasPayroll || isLoadingPayroll);
  /** Connected but no payroll and not loading — neither employer nor employee in the system yet; show message for both. */
  const isNeither = !!address && !isLoadingPayroll && !hasPayroll;
  const employerAddr = (address ?? '').toLowerCase();
  const employeeAddr = (address ?? '').toLowerCase();

  /** Fetch contracts by role: use employee list until we know they have a payroll. Avoids employees seeing empty list while payroll is loading. */
  const contractListBy = hasPayroll ? 'employer' : 'employee';
  const contractListAddr = hasPayroll ? employerAddr : employeeAddr;
  /** Display "Sent" vs "My" contracts by actual payroll status so list and title match the fetched data. */
  const showAsEmployer = hasPayroll;

  const fetchContracts = React.useCallback(() => {
    if (!address) return;
    setLoading(true);
    fetch(`${INDEXER}/api/docusign/contracts?by=${contractListBy}&address=${encodeURIComponent(contractListAddr)}`)
      .then((r) => r.json())
      .then((data) => {
        setContracts(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [address, contractListBy, contractListAddr]);

  const fetchInAppContracts = React.useCallback(() => {
    if (!address) return;
    setLoadingInApp(true);
    fetch(`${INDEXER}/api/in-app-contracts?by=${contractListBy}&address=${encodeURIComponent(contractListAddr)}`)
      .then((r) => r.json())
      .then((data) => {
        setInAppContracts(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => setInAppContracts([]))
      .finally(() => setLoadingInApp(false));
  }, [address, contractListBy, contractListAddr]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  useEffect(() => {
    fetchInAppContracts();
  }, [fetchInAppContracts]);

  // Refetch when user returns to this tab (e.g. after signing in another tab) so list stays up to date
  useEffect(() => {
    const onFocus = () => {
      if (address) {
        fetchContracts();
        fetchInAppContracts();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [address, fetchContracts, fetchInAppContracts]);

  useEffect(() => {
    if (!isEmployer || !address) return;
    fetch(`${INDEXER}/api/docusign/status?employer_address=${encodeURIComponent(employerAddr)}`)
      .then((r) => r.json())
      .then((data) => setDocusignConnected(!!data.connected))
      .catch(() => setDocusignConnected(false));
  }, [isEmployer, address, employerAddr]);

  // Refetch employees when opening Contracts so the send list is up to date
  useEffect(() => {
    if (isEmployer && refetchEmployees) void refetchEmployees();
  }, [isEmployer, refetchEmployees]);

  const startConnect = () => {
    const redirectUri = `${window.location.origin}/docusign/callback`;
    fetch(`${INDEXER}/api/docusign/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(employerAddr)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.url) window.location.href = data.url;
        else toast.error(data.error || 'Could not get auth URL');
      })
      .catch(() => toast.error('Indexer unreachable. Is it running on ' + INDEXER + '?'));
  };

  const disconnectDocuSign = async () => {
    if (!employerAddr || disconnecting) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`${INDEXER}/api/docusign/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_address: employerAddr }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to disconnect DocuSign');
        return;
      }
      setDocusignConnected(false);
      toast.success('DocuSign disconnected');
    } catch {
      toast.error('Could not reach server');
    } finally {
      setDisconnecting(false);
    }
  };

  const sendContract = async (emp: { address: string }, email: string, name: string) => {
    if (!address || !payrollAddress) return;
    setSending(emp.address);
    const returnUrl = `${window.location.origin}/docusign/signed`;
    try {
      const res = await fetch(`${INDEXER}/api/docusign/create-envelope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employer_address: employerAddr,
          employee_email: email || undefined,
          employee_address: emp.address.toLowerCase(),
          employee_name: name || undefined,
          payroll_address: payrollAddress.toLowerCase(),
          return_url: returnUrl,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success('Contract sent');
      setContracts((prev) => [
        {
          id: data.envelopeId,
          payroll_address: payrollAddress,
          employee_address: emp.address.toLowerCase(),
          employee_email: email || '',
          employer_address: employerAddr,
          envelope_id: data.envelopeId,
          status: 'sent',
          signed_at: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      if (data.signingUrl) window.open(data.signingUrl, '_blank');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send contract');
    } finally {
      setSending(null);
    }
  };

  const openSign = async (c: ContractRow) => {
    const returnUrl = `${window.location.origin}/docusign/signed`;
    try {
      const res = await fetch(`${INDEXER}/api/docusign/recipient-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envelope_id: c.envelope_id,
          employee_address: employeeAddr,
          return_url: returnUrl,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || 'Could not open signing');
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card variant="elevated" padding="lg" className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-4">
            <FileSignature className="h-8 w-8 text-[var(--color-primary)]" />
          </div>
          <p className="text-[var(--color-text-secondary)]">Connect your wallet to view and manage contracts.</p>
          <Link to="/" className="inline-flex items-center gap-2 mt-4 text-[var(--color-primary)] font-semibold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <Link
        to={isNeither ? '/' : showAsEmployer ? '/employer' : '/employee'}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      {/* Hero header */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/15 via-[var(--color-primary)]/8 to-transparent border border-[var(--color-primary)]/20 p-6 mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/90 shadow-md flex items-center justify-center shrink-0 border border-[var(--color-primary)]/20">
              <FileSignature className="h-7 w-7 text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
                Contracts <span className="text-[var(--color-primary)]">e-sign</span>
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-lg">
                {showAsEmployer
                  ? 'Send employment agreements via DocuSign or create and assign contracts directly in the app.'
                  : isNeither
                    ? 'Send or sign employment agreements with DocuSign. Get started as a company or wait for your employer to send you a contract.'
                    : 'View and sign contracts sent by your employer. Open the e-sign page to complete your signature.'}
              </p>
              {/* DocuSign connected badge — always visible at top when connected */}
              {showAsEmployer && docusignConnected && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-800">DocuSign connected</span>
                </div>
              )}
            </div>
          </div>
          {isEmployer && (
            <Link to="/contracts/create" className="shrink-0">
              <Button size="lg" className="w-full sm:w-auto text-base font-semibold px-6">
                <FileText className="h-5 w-5" /> Create contract
              </Button>
            </Link>
          )}
        </div>
      </motion.div>

      {/* About the contract — clarify generic vs your own DocuSign templates + in-app creation */}
      <motion.div variants={fadeUp} className="mb-4">
        <Card variant="bordered" padding="md" className="border-[var(--color-primary)]/20 bg-[var(--color-bg-light)]/50">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
            <div className="text-sm space-y-3">
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">About the contract content</h3>
                <p className="text-[var(--color-text-secondary)] leading-relaxed mb-2">
                  By default the app can send a standard Employment Agreement for demo. To use your own contract, set up a template in DocuSign (see below) — then the employee sees and signs the document you chose.
                </p>
                <p className="text-[var(--color-text-secondary)] leading-relaxed">
                  <strong>Using your own contracts:</strong> If you have contracts or templates in DocuSign (e.g. in your DocuSign dashboard), set up a <strong>template</strong> in DocuSign (sandbox or production): add your document, add a signer role for the employee, and save. The app can send that template so employees see and sign <em>your</em> document.
                </p>
              </div>
              {isEmployer && (
                <p className="text-[var(--color-text-secondary)] leading-relaxed pt-2 border-t border-[var(--color-border-light)]">
                  <strong>In-app contracts:</strong> You can also create and assign contracts directly in this app (no DocuSign). Click <strong>Create contract</strong> to add terms and assign to an employee; they will see it under <strong>My contracts</strong> and can view and sign in-app.
                </p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* When connected but neither employer nor employee — address both companies and employees */}
      {isNeither && (
        <motion.div variants={fadeUp} className="mb-6">
          <Card variant="elevated" padding="lg" className="border border-[var(--color-border-light)]">
            <h2 className="font-bold text-[var(--color-text-primary)] mb-4">Get started</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light)]/30 p-5">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Setting up as a company?</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mb-4 leading-relaxed">
                  Create a payroll first from the Employer Dashboard. After that, connect your official DocuSign account here to send employment contracts to your employees — they sign before you onboard them on-chain.
                </p>
                <Link to="/employer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline">
                  Create payroll &rarr;
                </Link>
              </div>
              <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light)]/30 p-5">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Here as an employee?</h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Contracts sent by your employer will appear in &quot;My contracts&quot; below. You can open the e-sign page to complete your signature when you receive one.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
        {/* Employer: DocuSign + Create contract in one row so Send/Sent grids sit higher */}
        {isEmployer && (
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="elevated" padding="lg" className="overflow-hidden border border-[var(--color-border-light)]">
              {!docusignConnected ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <Link2 className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--color-text-primary)]">Connect DocuSign</h2>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                        One-time connection to send and track contracts. Use your DocuSign sandbox account.
                      </p>
                    </div>
                  </div>
                  <Button onClick={startConnect} size="sm" className="shrink-0">
                    <Link2 className="h-4 w-4" /> Connect DocuSign
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-800">DocuSign connected</p>
                      <p className="text-xs text-emerald-700/90">You can send contracts to your team below.</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={disconnectDocuSign}
                    disabled={disconnecting}
                    className="shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                    title="Disconnect DocuSign"
                  >
                    {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
                    {' '}Disconnect
                  </Button>
                </div>
              )}
            </Card>
            <Card variant="elevated" padding="lg" className="overflow-hidden border border-[var(--color-border-light)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[var(--color-text-primary)]">Create contract (no DocuSign)</h2>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                      Create and assign a contract in the app. Employee can view and sign in-app.
                      {!hasPayroll && !isLoadingPayroll && ' Create a payroll first to assign to employees.'}
                    </p>
                  </div>
                </div>
                <Link to="/contracts/create" className="shrink-0">
                  <Button size="md" className="font-semibold">
                    <FileText className="h-4 w-4" /> Create contract
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Contracts: Send + Sent grids — moved up to fill space */}
        <div className={showAsEmployer && docusignConnected ? 'grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch' : ''}>
        {showAsEmployer && docusignConnected && (
          <div className="min-w-0 flex flex-col">
            <Card variant="elevated" padding="lg" className="overflow-hidden border border-[var(--color-border-light)] p-0 flex-1 flex flex-col">
              <div className="bg-gradient-to-r from-[var(--color-primary)]/8 to-transparent border-b border-[var(--color-border-light)] px-6 py-4">
                <h2 className="font-bold text-[var(--color-text-primary)]">Send contract</h2>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Choose an employee to send an employment agreement for e-signature.</p>
              </div>
              {isLoadingPayroll ? (
                <div className="px-6 py-8 flex items-center justify-center gap-3 text-[var(--color-text-tertiary)]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading your employees…</span>
                </div>
              ) : localEmployees.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-[var(--color-text-secondary)] mb-2">No employees yet.</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] max-w-sm mx-auto mb-4">
                    Onboard employees from the Employer Dashboard first. Once they appear in your team list there, they will show here so you can send them a contract.
                  </p>
                  <Link
                    to="/employer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Go to Employer Dashboard
                  </Link>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-[var(--color-border-light)]">
                    {localEmployees.map((e) => {
                      const addrLower = e.address.toLowerCase();
                      const name = employeeNames[addrLower] || '';
                      const email = employeeEmails[addrLower] || '';
                      const displayName = name || formatAddress(e.address, 8);
                      const avatarUrl = employeeAvatars?.[addrLower];
                      return (
                        <li key={e.address} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[var(--color-bg-light)]/50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={avatarUrl}
                              fallbackText={displayName}
                              className="w-10 h-10 rounded-xl"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--color-text-primary)] truncate">{displayName}</p>
                              <p className="text-xs text-[var(--color-text-tertiary)] font-mono">{formatAddress(e.address, 6)}</p>
                              {email && (
                                <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 mt-0.5">
                                  <Mail className="h-3 w-3" /> {email}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => sendContract(e, email, name)}
                            disabled={!!sending}
                            loading={sending === e.address}
                            className="shrink-0"
                          >
                            <Send className="h-3.5 w-3.5" /> Send contract
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="px-6 py-3 text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-light)]/50 border-t border-[var(--color-border-light)]">
                    Add employee email in their profile for DocuSign delivery and signing.
                  </p>
                </>
              )}
            </Card>
          </div>
        )}
            <motion.div variants={fadeUp} className="min-w-0 flex flex-col">
          <Card variant="elevated" padding="lg" className="overflow-hidden border border-[var(--color-border-light)] p-0 flex-1 flex flex-col min-h-0">
            <div className="bg-gradient-to-r from-[var(--color-primary)]/8 to-transparent border-b border-[var(--color-border-light)] px-6 py-4">
              <h2 className="font-bold text-[var(--color-text-primary)]">
                {showAsEmployer ? 'Sent contracts' : 'My contracts'}
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                {showAsEmployer ? 'Contracts you’ve sent for e-signature.' : isNeither
                    ? 'Contracts you send (as employer) or receive (as employee) will appear here.'
                    : 'Agreements sent by your employer — open to sign.'}
              </p>
            </div>
            <div className="p-6">
              {loading || loadingInApp ? (
                <div className="flex items-center justify-center gap-2 py-8 text-[var(--color-text-tertiary)]">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
              ) : contracts.length === 0 && inAppContracts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-light)] flex items-center justify-center mb-4">
                    <FileSignature className="h-8 w-8 text-[var(--color-text-tertiary)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">No contracts yet</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    {showAsEmployer
                    ? 'Send a contract via DocuSign above or create one in-app.'
                    : isNeither
                      ? 'Create a payroll and send contracts as an employer, or wait for your employer to send you one as an employee.'
                      : 'Your employer will send you a contract when ready.'}
                  </p>
                </div>
              ) : showAsEmployer ? (
                <ul className="space-y-3">
                  {contracts.map((c) => {
                    const empAddr = c.employee_address.toLowerCase();
                    const empName = employeeNames?.[empAddr] || formatAddress(c.employee_address, 8);
                    return (
                      <li
                        key={`docusign-${c.id}`}
                        className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[var(--color-bg-light)]/50 border border-[var(--color-border-light)]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={employeeAvatars?.[empAddr]}
                            fallbackText={empName}
                            className="w-9 h-9 rounded-lg"
                          />
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)] font-mono text-sm">{formatAddress(c.employee_address, 8)}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="default" size="sm">DocuSign</Badge>
                              <Badge variant={c.signed_at ? 'success' : 'default'} size="sm">
                                {c.signed_at ? 'Signed' : c.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {inAppContracts.map((c) => {
                    const empAddr = c.employee_address?.toLowerCase();
                    const empName = empAddr ? (employeeNames?.[empAddr] || formatAddress(c.employee_address!, 8)) : 'Unassigned';
                    const title = c.form_data?.contract_name || 'In-app contract';
                    return (
                      <li
                        key={`inapp-${c.id}`}
                        className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[var(--color-bg-light)]/50 border border-[var(--color-border-light)]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={empAddr ? employeeAvatars?.[empAddr] : undefined}
                            fallbackText={empName}
                            className="w-9 h-9 rounded-lg"
                          />
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)] text-sm">{title}</p>
                            <p className="text-xs text-[var(--color-text-tertiary)] font-mono">
                              {c.employee_address ? formatAddress(c.employee_address, 8) : 'Draft — not assigned'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="default" size="sm">In-app</Badge>
                              <Badge variant={c.status === 'signed' ? 'success' : 'default'} size="sm">
                                {c.status === 'draft' ? 'Draft' : c.status === 'assigned' ? 'Pending' : 'Signed'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Link to={`/contracts/view/${c.id}`}>
                          <Button size="sm" variant="ghost">View</Button>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="space-y-4">
                  {contracts.map((c) => (
                    <div
                      key={`docusign-${c.id}`}
                      className="rounded-xl border-2 border-[var(--color-border-light)] bg-gradient-to-br from-white to-[var(--color-bg-light)]/30 p-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                          <FileSignature className="h-6 w-6 text-[var(--color-primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[var(--color-text-primary)] text-lg">Employment Agreement</h3>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                            This document is for signature as part of confidential payroll onboarding. Please sign below to complete.
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-4">
                            <Badge variant="default" size="sm">DocuSign</Badge>
                            <Badge variant={c.status === 'signed' ? 'success' : 'default'} size="sm">
                              {c.status === 'signed' ? 'Signed' : c.status}
                            </Badge>
                            {c.employee_email && (
                              <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {c.employee_email}
                              </span>
                            )}
                          </div>
                        </div>
                        {c.status === 'sent' && (
                          <Button size="sm" variant="primary" onClick={() => openSign(c)} className="shrink-0">
                            <ExternalLink className="h-4 w-4" /> Open e-sign page
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {inAppContracts.map((c) => {
                    const title = c.form_data?.contract_name || 'In-app contract';
                    return (
                      <div
                        key={`inapp-${c.id}`}
                        className="rounded-xl border-2 border-[var(--color-border-light)] bg-gradient-to-br from-white to-[var(--color-bg-light)]/30 p-5 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                            <FileSignature className="h-6 w-6 text-[var(--color-primary)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[var(--color-text-primary)] text-lg">{title}</h3>
                            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                              Contract created by your employer. View and sign in-app.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                              <Badge variant="default" size="sm">In-app</Badge>
                              <Badge variant={c.status === 'signed' ? 'success' : 'default'} size="sm">
                                {c.status === 'signed' ? 'Signed' : 'Pending'}
                              </Badge>
                            </div>
                          </div>
                          <Link to={`/contracts/view/${c.id}`}>
                            <Button size="sm" variant={c.status === 'signed' ? 'secondary' : 'primary'} className="shrink-0">
                              <ExternalLink className="h-4 w-4" /> {c.status === 'signed' ? 'View contract' : 'View & sign'}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
        </div>
      </motion.div>

      {/* Powered by DocuSign */}
      <motion.div variants={fadeUp} className="mt-8 pt-6 border-t border-[var(--color-border-light)] flex flex-col items-center gap-2">
        <p className="text-xs text-[var(--color-text-tertiary)]">E-signatures powered by</p>
        <a
          href="https://www.docusign.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:opacity-80 transition-opacity"
          aria-label="DocuSign"
        >
          <img src="/docs.svg" alt="DocuSign" className="h-6 object-contain" />
          <span className="text-sm font-semibold">DocuSign</span>
        </a>
      </motion.div>
    </div>
  );
}

export default ContractsPage;
