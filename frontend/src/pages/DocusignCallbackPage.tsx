import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getIndexerUrl } from '../lib/indexerApi';

export function DocusignCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'exchanging' | 'ok' | 'error'>('exchanging');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || !state) {
      setStatus('error');
      setErrorMsg('Missing code or state from DocuSign');
      return;
    }
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const base = getIndexerUrl();
    fetch(`${base}/api/docusign/exchange-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri, state }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus('error');
          setErrorMsg(data.error);
          return;
        }
        setStatus('ok');
        setTimeout(() => navigate('/contracts', { replace: true }), 1500);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.message || 'Exchange failed');
      });
  }, [searchParams, navigate]);

  if (status === 'exchanging') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p className="text-[var(--color-text-secondary)]">Connecting DocuSign…</p>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--color-bg)] px-4">
        <p className="text-red-600">{errorMsg}</p>
        <button
          type="button"
          onClick={() => navigate('/contracts', { replace: true })}
          className="text-[var(--color-primary)] font-medium hover:underline"
        >
          Back to Contracts
        </button>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <p className="text-[var(--color-text-secondary)]">DocuSign connected. Redirecting…</p>
    </div>
  );
}

export default DocusignCallbackPage;
