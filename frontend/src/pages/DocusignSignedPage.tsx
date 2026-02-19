import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { getIndexerUrl } from '../lib/indexerApi';

export function DocusignSignedPage() {
  const [searchParams] = useSearchParams();
  const envelopeId = searchParams.get('envelope_id');

  useEffect(() => {
    if (!envelopeId) return;
    const base = getIndexerUrl();
    fetch(`${base}/api/docusign/mark-signed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelope_id: envelopeId }),
    }).catch(() => {});
  }, [envelopeId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[var(--color-bg)] px-4">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Contract signed</h1>
      <p className="text-sm text-[var(--color-text-secondary)] text-center max-w-sm">
        You’ve completed the signature. Your employer will see the updated status and can proceed with onboarding when ready.
      </p>
      <Link
        to="/employee"
        className="text-[var(--color-primary)] font-medium hover:underline"
      >
        Back to Employee Portal
      </Link>
    </div>
  );
}

export default DocusignSignedPage;
