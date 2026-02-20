import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import { ArrowLeft, FileSignature, Loader2, CheckCircle2, ExternalLink, Paperclip } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getIndexerUrl } from '../lib/indexerApi';
import type { ContractType } from './CreateContractPage';
import type { CreateContractFormData } from './CreateContractPage';

const INDEXER = getIndexerUrl();

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  fixed_rate: 'Fixed rate',
  pay_as_you_go: 'Pay as you go',
  milestone: 'Milestone',
};

type InAppContract = {
  id: string;
  employer_address: string;
  payroll_address: string;
  employee_address: string | null;
  contract_type: ContractType;
  status: 'draft' | 'assigned' | 'signed';
  signed_at: string | null;
  created_at: string;
  form_data: CreateContractFormData;
};

export function ViewContractPage() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected } = useAccount();
  const [contract, setContract] = useState<InAppContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  const addr = (address ?? '').toLowerCase();
  const isEmployee = !!contract?.employee_address && contract.employee_address === addr;
  const isEmployer = !!contract?.employer_address && contract.employer_address === addr;
  const canSign = isEmployee && contract.status === 'assigned';

  useEffect(() => {
    if (!id || !address) {
      setLoading(false);
      return;
    }
    fetch(`${INDEXER}/api/in-app-contracts/${id}?address=${encodeURIComponent(addr)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          setContract(null);
          return;
        }
        setContract(data);
      })
      .catch(() => {
        toast.error('Failed to load contract');
        setContract(null);
      })
      .finally(() => setLoading(false));
  }, [id, address, addr]);

  const handleSign = async () => {
    if (!id || !address) return;
    setSigning(true);
    try {
      const res = await fetch(`${INDEXER}/api/in-app-contracts/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_address: address.toLowerCase() }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setContract((prev) =>
        prev ? { ...prev, status: 'signed' as const, signed_at: new Date().toISOString() } : null
      );
      toast.success('You have signed this contract');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to sign');
    } finally {
      setSigning(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card variant="elevated" padding="lg" className="text-center">
          <p className="text-[var(--color-text-secondary)]">Connect your wallet to view this contract.</p>
          <Link to="/contracts" className="inline-flex items-center gap-2 mt-4 text-[var(--color-primary)] font-semibold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Contracts
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 flex items-center justify-center gap-3 text-[var(--color-text-tertiary)]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading contract…</span>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card variant="elevated" padding="lg" className="text-center">
          <p className="text-[var(--color-text-secondary)]">Contract not found or you don’t have access to it.</p>
          <Link to="/contracts" className="inline-flex items-center gap-2 mt-4 text-[var(--color-primary)] font-semibold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Contracts
          </Link>
        </Card>
      </div>
    );
  }

  const fd = contract.form_data || ({} as CreateContractFormData);
  const createdDate = new Date(contract.created_at).toLocaleDateString(undefined, { dateStyle: 'long' });

  return (
    <div className="min-h-screen bg-[#e8e6e3] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/contracts"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Contracts
        </Link>

        {/* Paper-like document container: wide, centered, shadow */}
        <article
          className="mx-auto w-full max-w-4xl bg-white rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] border border-[var(--color-border-light)] overflow-hidden"
          style={{ maxWidth: '56rem' }}
        >
          {/* Letterhead-style header */}
          <header className="px-10 sm:px-14 pt-10 sm:pt-12 pb-8 border-b border-[var(--color-border-light)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {fd.contract_name || 'Employment contract'}
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {CONTRACT_TYPE_LABELS[contract.contract_type]} · Effective {createdDate}
                </p>
              </div>
              {contract.status === 'signed' && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-800">Signed</span>
                </div>
              )}
            </div>
          </header>

          {/* Document body: generous padding, readable line length */}
          <div className="px-10 sm:px-14 py-8 sm:py-10 space-y-10 text-[var(--color-text-primary)]">
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4 pb-1 border-b border-[var(--color-border-light)]">
                Contractor details
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Contract name</dt>
                  <dd className="mt-0.5 text-base leading-relaxed">{fd.contract_name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Tax residence</dt>
                  <dd className="mt-0.5 text-base leading-relaxed">{fd.tax_residence || '—'}</dd>
                </div>
                {fd.role && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Role</dt>
                    <dd className="mt-0.5 text-base leading-relaxed">{fd.role}</dd>
                  </div>
                )}
                {fd.seniority && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Seniority</dt>
                    <dd className="mt-0.5 text-base leading-relaxed">{fd.seniority}</dd>
                  </div>
                )}
                {fd.scope_of_work && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Scope of work</dt>
                    <dd className="mt-0.5 text-base leading-relaxed">{fd.scope_of_work}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4 pb-1 border-b border-[var(--color-border-light)]">
                Payment and dates
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Payment</dt>
                  <dd className="mt-0.5 text-base leading-relaxed">
                    {fd.currency} {fd.payment_rate || '—'} per {fd.payment_frequency || 'month'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Start date</dt>
                  <dd className="mt-0.5 text-base leading-relaxed">{fd.start_date || '—'}</dd>
                </div>
                {fd.end_date && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">End date</dt>
                    <dd className="mt-0.5 text-base leading-relaxed">{fd.end_date}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Notice period</dt>
                  <dd className="mt-0.5 text-base leading-relaxed">
                    {fd.notice_period_days ? `${fd.notice_period_days} days` : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            {fd.special_clause && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4 pb-1 border-b border-[var(--color-border-light)]">
                  Special clause
                </h2>
                <p className="text-base leading-relaxed whitespace-pre-wrap text-[var(--color-text-primary)]">{fd.special_clause}</p>
              </section>
            )}

            {(fd as { attachment_url?: string; attachment_name?: string }).attachment_url && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4 pb-1 border-b border-[var(--color-border-light)]">
                  Additional document
                </h2>
                <a
                  href={(fd as { attachment_url?: string }).attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-base font-medium text-[var(--color-primary)] hover:underline"
                >
                  <Paperclip className="h-4 w-4" />
                  {(fd as { attachment_name?: string }).attachment_name || 'View attachment'}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </section>
            )}
          </div>

          {/* Document footer */}
          <footer className="px-10 sm:px-14 py-4 border-t border-[var(--color-border-light)] bg-[#fafaf9] text-xs text-[var(--color-text-tertiary)]">
            Confidential · Contract created {createdDate}
          </footer>
        </article>

        {canSign && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-sm text-[var(--color-text-secondary)] text-center">
              By signing, you agree to the terms of this contract.
            </p>
            <Button size="lg" onClick={handleSign} loading={signing} disabled={signing}>
              <FileSignature className="h-5 w-5" /> I agree — Sign contract
            </Button>
          </div>
        )}

        {contract.status === 'signed' && isEmployee && (
          <div className="mt-8 flex items-center justify-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">You have signed this contract.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewContractPage;
