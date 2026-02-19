import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FileSignature, ExternalLink, Loader2, Send, Link2, CheckCircle2, Mail, UserCircle, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
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

export function ContractsPage() {
  const { address, isConnected } = useAccount();
  const { hasPayroll, localEmployees, payrollAddress, refetchEmployees, isLoadingPayroll } = usePayrollEmployer();
  const { names: employeeNames, emails: employeeEmails } = useEmployerEmployeeNames();

  const [docusignConnected, setDocusignConnected] = useState(false);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  /** Employer = has a payroll (once loaded). While payroll is still loading, treat as employer so we don't flash employee-only view. */
  const isEmployer = !!address && (hasPayroll || isLoadingPayroll);
  const employerAddr = (address ?? '').toLowerCase();
  const employeeAddr = (address ?? '').toLowerCase();

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    const by = isEmployer ? 'employer' : 'employee';
    const addr = isEmployer ? employerAddr : employeeAddr;
    fetch(`${INDEXER}/api/docusign/contracts?by=${by}&address=${encodeURIComponent(addr)}`)
      .then((r) => r.json())
      .then((data) => {
        setContracts(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [address, isEmployer, employerAddr, employeeAddr]);

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
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Link
        to={isEmployer ? '/employer' : '/employee'}
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
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/90 shadow-md flex items-center justify-center shrink-0 border border-[var(--color-primary)]/20">
            <FileSignature className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
              Contracts <span className="text-[var(--color-primary)]">e-sign</span>
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-lg">
              {isEmployer
                ? 'Send employment agreements via DocuSign. Employees sign before onboarding — one flow, fully compliant.'
                : 'View and sign contracts sent by your employer. Open the e-sign page to complete your signature.'}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        {/* Employer: DocuSign connection */}
        {isEmployer && (
          <motion.div variants={fadeUp}>
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
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800">DocuSign connected</p>
                    <p className="text-xs text-emerald-700/90">You can send contracts to your team below.</p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Employer: Send contract — only when we know they have a payroll and DocuSign is connected. Plain div so list is always visible (no opacity animation). */}
        {isEmployer && hasPayroll && docusignConnected && (
          <div>
            <Card variant="elevated" padding="lg" className="overflow-hidden border border-[var(--color-border-light)] p-0">
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
                      const initial = (displayName[0] || '?').toUpperCase();
                      return (
                        <li key={e.address} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[var(--color-bg-light)]/50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 flex items-center justify-center shrink-0 text-sm font-bold text-[var(--color-primary)]">
                              {initial}
                            </div>
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

        {/* Sent contracts / My contracts */}
        <motion.div variants={fadeUp}>
          <Card variant="elevated" padding="lg" className="overflow-hidden border border-[var(--color-border-light)] p-0">
            <div className="bg-gradient-to-r from-[var(--color-primary)]/8 to-transparent border-b border-[var(--color-border-light)] px-6 py-4">
              <h2 className="font-bold text-[var(--color-text-primary)]">
                {isEmployer ? 'Sent contracts' : 'My contracts'}
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                {isEmployer ? 'Contracts you’ve sent for e-signature.' : 'Agreements sent by your employer — open to sign.'}
              </p>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-[var(--color-text-tertiary)]">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
              ) : contracts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-light)] flex items-center justify-center mb-4">
                    <FileSignature className="h-8 w-8 text-[var(--color-text-tertiary)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">No contracts yet</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    {isEmployer ? 'Send a contract using the section above.' : 'Your employer will send you a contract when ready.'}
                  </p>
                </div>
              ) : isEmployer ? (
                <ul className="space-y-3">
                  {contracts.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[var(--color-bg-light)]/50 border border-[var(--color-border-light)]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                          <UserCircle className="h-4 w-4 text-[var(--color-primary)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)] font-mono text-sm">{formatAddress(c.employee_address, 8)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant={c.signed_at ? 'success' : 'default'} size="sm">
                              {c.signed_at ? 'Signed' : c.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-4">
                  {contracts.map((c) => (
                    <div
                      key={c.id}
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
                </div>
              )}
            </div>
          </Card>
        </motion.div>
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
