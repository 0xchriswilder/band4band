import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Briefcase, Users, DollarSign, Upload } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAccount } from 'wagmi';
import { usePayrollEmployer } from '../hooks/usePayrollEmployer';
import { useEmployerProfile, useEmployerPaymentHistory } from '../hooks/usePayrollHistory';
import { supabase } from '../lib/supabase';
import { TOKEN_CONFIG } from '../lib/contracts';
import { toDirectImageUrl } from '../lib/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function CompanyProfilePage() {
  const { address, isConnected } = useAccount();
  const { hasPayroll, isLoadingPayroll, localEmployees } = usePayrollEmployer();
  const { profile, isLoading: profileLoading, reload } = useEmployerProfile(address ?? undefined);
  const { total: totalPayments } = useEmployerPaymentHistory();

  const [companyNameInput, setCompanyNameInput] = useState('');
  const [industryInput, setIndustryInput] = useState('');
  const [websiteInput, setWebsiteInput] = useState('');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreviewBlocked, setLogoPreviewBlocked] = useState(false);
  const LOGO_BUCKET = 'employer-logos';

  useEffect(() => {
    setLogoPreviewBlocked(false);
  }, [logoUrlInput]);

  useEffect(() => {
    if (profile) {
      setCompanyNameInput(profile.company_name ?? '');
      setIndustryInput(profile.industry ?? '');
      setWebsiteInput(profile.website ?? '');
      setLogoUrlInput(profile.logo_url ?? '');
      setLogoPreviewBlocked(false);
    } else if (!profileLoading && profile === null) {
      setCompanyNameInput('');
      setIndustryInput('');
      setWebsiteInput('');
      setLogoUrlInput('');
    }
  }, [profile, profileLoading]);

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  if (isLoadingPayroll) {
    return (
      <div className="max-w-xl mx-auto flex items-center justify-center py-16">
        <p className="text-[var(--color-text-secondary)]">Loading…</p>
      </div>
    );
  }

  // No payroll: show message and link instead of redirect so page stays visitable
  if (!hasPayroll) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/employer"
            className="p-2 rounded-lg hover:bg-[var(--color-bg-light)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
            aria-label="Back to Employer Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-[var(--color-primary)]" />
            Company profile
          </h1>
        </div>
        <Card variant="elevated" padding="lg">
          <p className="text-[var(--color-text-secondary)] mb-4">
            Register a payroll first to set your company profile.
          </p>
          <Link
            to="/employer"
            className="inline-flex items-center justify-center font-bold rounded-xl px-5 py-2.5 text-sm bg-orange-600 text-white shadow-lg hover:bg-orange-700 transition-colors"
          >
            Go to Employer Dashboard
          </Link>
        </Card>
      </div>
    );
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setIsUploadingLogo(true);
    e.target.value = '';
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${address.toLowerCase()}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) {
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
          toast.error('Logo storage not set up. Create a public bucket named "employer-logos" in Supabase Dashboard → Storage.');
        } else if (error.message?.toLowerCase().includes('row-level security') || error.message?.toLowerCase().includes('policy')) {
          toast.error('Storage policy: allow public upload/read on bucket "employer-logos" in Supabase Dashboard → Storage → Policies.');
        } else {
          toast.error(error.message);
        }
        return;
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const publicUrl = supabaseUrl
        ? `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${LOGO_BUCKET}/${path}`
        : supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
      setLogoUrlInput(publicUrl);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!address || !companyNameInput.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('employer_profiles')
        .upsert(
          {
            employer_address: address.toLowerCase(),
            company_name: companyNameInput.trim(),
            industry: industryInput.trim() || null,
            website: websiteInput.trim() || null,
            logo_url: logoUrlInput.trim() ? toDirectImageUrl(logoUrlInput.trim()) : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'employer_address' }
        );

      if (error) {
        toast.error(error.message);
        return;
      }
      await reload();
      toast.success('Company profile saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/employer"
            className="p-2 rounded-lg hover:bg-[var(--color-bg-light)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
            aria-label="Back to Employer Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Briefcase className="h-7 w-7 text-[var(--color-primary)]" />
              Company profile
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Set your company details. Company name is shown to your employees where your wallet address appears.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Company overview: employees total, cUSDCP payments sent */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">Company overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card variant="elevated" padding="md" className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{localEmployees.length}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Total employees</p>
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalPayments}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{TOKEN_CONFIG.symbol} payments sent</p>
            </div>
          </Card>
        </div>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <Card variant="elevated" padding="lg">
          {profileLoading ? (
            <p className="text-sm text-[var(--color-text-tertiary)] py-4">Loading…</p>
          ) : (
            <div className="space-y-4">
              <Input
                label="Company name"
                value={companyNameInput}
                onChange={(e) => setCompanyNameInput(e.target.value)}
                placeholder="e.g. Acme Inc."
              />
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Company logo
                </label>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-2">Upload an image (works everywhere) or paste a direct image URL. Imgur page links may be blocked by your browser.</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[var(--color-border-light)] hover:border-[var(--color-primary)]/40 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4 text-[var(--color-primary)]" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{isUploadingLogo ? 'Uploading…' : 'Upload image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                  </label>
                </div>
                <Input
                  value={logoUrlInput}
                  onChange={(e) => setLogoUrlInput(e.target.value)}
                  placeholder="Or paste direct image URL (e.g. https://...)"
                />
                {logoUrlInput.trim() && (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-tertiary)]">Preview:</span>
                    {logoPreviewBlocked ? (
                      <div className="h-10 w-10 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light)] flex items-center justify-center shrink-0" title="Preview blocked">
                        <Briefcase className="h-5 w-5 text-[var(--color-text-tertiary)]" />
                      </div>
                    ) : (
                      <img
                        src={toDirectImageUrl(logoUrlInput.trim())}
                        alt="Company logo"
                        className="h-10 w-10 rounded-lg object-cover border border-[var(--color-border-light)]"
                        crossOrigin="anonymous"
                        onError={() => setLogoPreviewBlocked(true)}
                      />
                    )}
                    {logoPreviewBlocked && (
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        Preview unavailable (cross-origin). Your logo is saved and will appear in the sidebar and payment history.
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Input
                label="Industry"
                value={industryInput}
                onChange={(e) => setIndustryInput(e.target.value)}
                placeholder="e.g. Technology, Finance"
              />
              <Input
                label="Website"
                value={websiteInput}
                onChange={(e) => setWebsiteInput(e.target.value)}
                placeholder="https://..."
              />
              <Button
                onClick={handleSave}
                disabled={!companyNameInput.trim() || isSaving}
                loading={isSaving}
              >
                Save
              </Button>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
