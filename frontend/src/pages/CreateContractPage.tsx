import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  DollarSign,
  Clock,
  Flag,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Info,
  Upload,
  X,
  FileText,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getIndexerUrl } from '../lib/indexerApi';
import { usePayrollEmployer } from '../hooks/usePayrollEmployer';
import { useEmployerEmployeeNames } from '../hooks/usePayrollHistory';
import { formatAddress } from '../lib/utils';

const INDEXER = getIndexerUrl();

export type ContractType = 'fixed_rate' | 'pay_as_you_go' | 'milestone';

export interface CreateContractFormData {
  contract_name: string;
  tax_residence: string;
  role: string;
  seniority: string;
  scope_of_work: string;
  currency: string;
  payment_rate: string;
  payment_frequency: string;
  start_date: string;
  end_date: string;
  notice_period_days: string;
  special_clause: string;
  attachment_url?: string;
  attachment_name?: string;
}

const defaultFormData: CreateContractFormData = {
  contract_name: '',
  tax_residence: '',
  role: '',
  seniority: '',
  scope_of_work: '',
  currency: 'USD',
  payment_rate: '',
  payment_frequency: 'monthly',
  start_date: '',
  end_date: '',
  notice_period_days: '',
  special_clause: '',
  attachment_url: '',
  attachment_name: '',
};

const CONTRACT_TYPES: { id: ContractType; title: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'fixed_rate',
    title: 'Fixed rate',
    description: 'For contracts that have a fixed rate each payment cycle.',
    icon: <DollarSign className="h-6 w-6" />,
  },
  {
    id: 'pay_as_you_go',
    title: 'Pay as you go',
    description: 'For contracts that require time sheets or work submissions each payment cycle.',
    icon: <Clock className="h-6 w-6" />,
  },
  {
    id: 'milestone',
    title: 'Milestone',
    description: "For contracts with milestones that get paid each time they're completed.",
    icon: <Flag className="h-6 w-6" />,
  },
];

const STEPS = [
  { id: 1, title: 'Contract type' },
  { id: 2, title: 'Contractor details' },
  { id: 3, title: 'Payment and dates' },
  { id: 4, title: 'Optional' },
  { id: 5, title: 'Review and create' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'GHS', 'NGN'];
const PAYMENT_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

const TAX_RESIDENCES = ['United States', 'United Kingdom', 'Ghana', 'Nigeria', 'Germany', 'France', 'Other'];

export function CreateContractPage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const { hasPayroll, payrollAddress, localEmployees, isLoadingPayroll } = usePayrollEmployer();
  const { names: employeeNames } = useEmployerEmployeeNames();

  const [step, setStep] = useState(1);
  const [contractType, setContractType] = useState<ContractType | null>(null);
  const [formData, setFormData] = useState<CreateContractFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const employerAddr = (address ?? '').toLowerCase();
  const isEmployer = !!address && (hasPayroll || isLoadingPayroll);

  const updateForm = (updates: Partial<CreateContractFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canProceedFromStep1 = !!contractType;
  const canProceedFromStep2 = !!formData.contract_name.trim() && !!formData.tax_residence;
  const canProceedFromStep3 =
    !!formData.currency && !!formData.payment_rate.trim() && !!formData.start_date && !!formData.notice_period_days.trim();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error('Allowed formats: PDF, JPG, PNG');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Max file size: 10MB');
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.includes(',') ? result.split(',')[1]! : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${INDEXER}/api/in-app-contracts/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, filename: file.name, contentType: file.type }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      updateForm({ attachment_url: data.url, attachment_name: file.name });
      toast.success('File attached');
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCreate = async () => {
    if (!employerAddr || !payrollAddress || !contractType) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${INDEXER}/api/in-app-contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employer_address: employerAddr,
          payroll_address: payrollAddress.toLowerCase(),
          contract_type: contractType,
          form_data: formData,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setCreatedId(data.id);
      toast.success('Contract created');
      setStep(5);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (employeeAddress: string) => {
    if (!createdId) return;
    setAssigningTo(employeeAddress);
    try {
      const res = await fetch(`${INDEXER}/api/in-app-contracts/${createdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employer_address: employerAddr,
          employee_address: employeeAddress,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success('Contract assigned to employee');
      navigate('/contracts');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign');
    } finally {
      setAssigningTo(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card variant="elevated" padding="lg" className="text-center">
          <p className="text-[var(--color-text-secondary)]">Connect your wallet to create a contract.</p>
          <Link to="/" className="inline-flex items-center gap-2 mt-4 text-[var(--color-primary)] font-semibold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </Card>
      </div>
    );
  }

  if (!isEmployer) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card variant="elevated" padding="lg" className="text-center">
          <p className="text-[var(--color-text-secondary)]">Only employers with a payroll can create contracts here.</p>
          <Link to="/contracts" className="inline-flex items-center gap-2 mt-4 text-[var(--color-primary)] font-semibold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Contracts
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <Link
        to="/contracts"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Contracts
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
          Create a contract
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Create a contract for an individual contractor. It&apos;s easy, fast and confidential.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {/* Step 1: Contract type */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Choose your contracting agreement</h2>
                <div className="grid gap-4">
                  {CONTRACT_TYPES.map((t) => (
                    <Card
                      key={t.id}
                      variant="bordered"
                      padding="md"
                      className={`cursor-pointer transition-all border-2 ${
                        contractType === t.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border-light)] hover:border-[var(--color-primary)]/50'
                      }`}
                      onClick={() => setContractType(t.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                          {t.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[var(--color-text-primary)]">{t.title}</h3>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{t.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[var(--color-text-tertiary)] shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={() => setStep(2)} disabled={!canProceedFromStep1}>
                    Next: Contractor details
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Contractor details */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Contractor personal details</h2>
                <div className="space-y-4">
                  <Input
                    label="Contract name *"
                    value={formData.contract_name}
                    onChange={(e) => updateForm({ contract_name: e.target.value })}
                    placeholder="e.g. John Doe - Employment"
                  />
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
                      Contractor&apos;s tax residence *
                    </label>
                    <select
                      value={formData.tax_residence}
                      onChange={(e) => updateForm({ tax_residence: e.target.value })}
                      className="w-full rounded-xl border border-[var(--color-border-input)] bg-white px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    >
                      <option value="">Select country</option>
                      {TAX_RESIDENCES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Role (optional)"
                    value={formData.role}
                    onChange={(e) => updateForm({ role: e.target.value })}
                    placeholder="e.g. Account Executive"
                  />
                  <Input
                    label="Seniority level (optional)"
                    value={formData.seniority}
                    onChange={(e) => updateForm({ seniority: e.target.value })}
                    placeholder="e.g. Senior"
                  />
                  <Input
                    label="Scope of work (optional)"
                    value={formData.scope_of_work}
                    onChange={(e) => updateForm({ scope_of_work: e.target.value })}
                    placeholder="Brief description of responsibilities"
                  />
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!canProceedFromStep2}>
                    Next: Payment and dates
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Payment and dates */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Payment rate</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Define how much the contractor will be paid.</p>
                <div className="flex gap-4 flex-wrap">
                  <div className="w-24">
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => updateForm({ currency: e.target.value })}
                      className="w-full rounded-xl border border-[var(--color-border-input)] bg-white px-3 py-2.5 text-sm"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <Input
                      label="Payment rate *"
                      type="text"
                      inputMode="decimal"
                      value={formData.payment_rate}
                      onChange={(e) => updateForm({ payment_rate: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
                    Payment frequency *
                  </label>
                  <select
                    value={formData.payment_frequency}
                    onChange={(e) => updateForm({ payment_frequency: e.target.value })}
                    className="w-full rounded-xl border border-[var(--color-border-input)] bg-white px-4 py-2.5 text-sm"
                  >
                    {PAYMENT_FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <h2 className="text-lg font-bold text-[var(--color-text-primary)] pt-2">Dates</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Select the worker&apos;s start and end date if the contract is for a set period.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Start date (YYYY-MM-DD) *"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => updateForm({ start_date: e.target.value })}
                  />
                  <Input
                    label="End date (optional)"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => updateForm({ end_date: e.target.value })}
                  />
                </div>
                <Input
                  label="Notice period (days) *"
                  type="number"
                  min={0}
                  value={formData.notice_period_days}
                  onChange={(e) => updateForm({ notice_period_days: e.target.value })}
                  placeholder="e.g. 10"
                />
                {formData.notice_period_days && (
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    Either party may end this contract by giving {formData.notice_period_days} days of notice, after which the contract will be ended.
                  </p>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="secondary" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(4)} disabled={!canProceedFromStep3}>
                    Next: Optional
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Optional */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Special Clause</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Add a special clause on the contract to outline terms of a special scenario.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
                    Special clause (optional)
                  </label>
                  <textarea
                    value={formData.special_clause}
                    onChange={(e) => updateForm({ special_clause: e.target.value })}
                    placeholder="Optional terms..."
                    rows={4}
                    maxLength={10000}
                    className="w-full rounded-xl border border-[var(--color-border-input)] bg-white px-4 py-2.5 text-sm placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1 text-right">
                    {formData.special_clause.length}/10000
                  </p>
                </div>

                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Additional documents</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Attach any document you want to include with the contract (e.g. agreement PDF). Max 10MB. PDF, JPG, PNG.
                </p>
                <div className="border-2 border-dashed border-[var(--color-primary)]/30 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="contract-attachment"
                  />
                  <label
                    htmlFor="contract-attachment"
                    className="cursor-pointer flex flex-col items-center gap-2 text-[var(--color-primary)] hover:opacity-80"
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <Upload className="h-8 w-8" />
                    )}
                    <span className="text-sm font-medium">
                      {uploading ? 'Uploading…' : 'Click or drag file to upload'}
                    </span>
                  </label>
                  {formData.attachment_url && formData.attachment_name && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)]">
                      <FileText className="h-4 w-4" />
                      <span>{formData.attachment_name}</span>
                      <button
                        type="button"
                        onClick={() => updateForm({ attachment_url: '', attachment_name: '' })}
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-error)]"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="secondary" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(5)}>
                    Next: Review and create
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Review and create */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Review and create</h2>
                {!createdId ? (
                  <>
                    <Card variant="bordered" padding="md" className="space-y-3 text-sm">
                      <p><strong>Contract type:</strong> {CONTRACT_TYPES.find((t) => t.id === contractType)?.title ?? contractType}</p>
                      <p><strong>Contract name:</strong> {formData.contract_name || '—'}</p>
                      <p><strong>Tax residence:</strong> {formData.tax_residence || '—'}</p>
                      {formData.role && <p><strong>Role:</strong> {formData.role}</p>}
                      <p><strong>Payment:</strong> {formData.currency} {formData.payment_rate} / {formData.payment_frequency}</p>
                      <p><strong>Start date:</strong> {formData.start_date || '—'}</p>
                      {formData.end_date && <p><strong>End date:</strong> {formData.end_date}</p>}
                      <p><strong>Notice period:</strong> {formData.notice_period_days} days</p>
                      {formData.special_clause && (
                        <p><strong>Special clause:</strong> <span className="text-[var(--color-text-secondary)]">{formData.special_clause.slice(0, 100)}{formData.special_clause.length > 100 ? '…' : ''}</span></p>
                      )}
                      {formData.attachment_name && (
                        <p><strong>Attachment:</strong> {formData.attachment_name}</p>
                      )}
                    </Card>
                    <div className="flex justify-between pt-4">
                      <Button variant="secondary" onClick={() => setStep(4)} disabled={submitting}>
                        Back
                      </Button>
                      <Button onClick={handleCreate} loading={submitting} disabled={submitting}>
                        Create contract
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-800">Contract created</p>
                        <p className="text-sm text-emerald-700">You can assign it to an employee below or go back to Contracts.</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">Assign to employee (optional)</h3>
                      {isLoadingPayroll ? (
                        <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] py-4">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading employees…
                        </div>
                      ) : localEmployees.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-secondary)]">No employees on your payroll yet. Assign later from the Contracts page.</p>
                      ) : (
                        <ul className="space-y-2">
                          {localEmployees.map((e) => {
                            const addr = e.address.toLowerCase();
                            const name = employeeNames[addr] || formatAddress(e.address, 8);
                            return (
                              <li
                                key={e.address}
                                className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-[var(--color-bg-light)]/50 border border-[var(--color-border-light)]"
                              >
                                <span className="font-medium text-[var(--color-text-primary)]">{name}</span>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleAssign(e.address)}
                                  disabled={!!assigningTo}
                                  loading={assigningTo === e.address}
                                >
                                  Assign
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div className="pt-4">
                      <Button variant="ghost" onClick={() => navigate('/contracts')}>
                        Back to Contracts
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress sidebar */}
        <div className="lg:col-span-1">
          <Card variant="bordered" padding="md" className="sticky top-4">
            <h3 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-4">
              Steps
            </h3>
            <ol className="space-y-3">
              {STEPS.map((s) => (
                <li
                  key={s.id}
                  className={`flex items-center gap-2 text-sm ${
                    step === s.id ? 'font-semibold text-[var(--color-primary)]' : step > s.id ? 'text-[var(--color-success)]' : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  {step > s.id ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-[var(--color-bg-light)] shrink-0">
                      {s.id}
                    </span>
                  )}
                  {s.id === 1 && step > 1 ? 'Contract type' : s.title}
                </li>
              ))}
            </ol>
            <div className="mt-6 pt-4 border-t border-[var(--color-border-light)]">
              <div className="flex items-start gap-2 text-xs text-[var(--color-text-tertiary)]">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Created contracts appear on the Contracts page. Assign to an employee so they can view and sign in-app.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CreateContractPage;
