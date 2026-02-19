import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const steps = [
  { step: '01', title: 'Connect Wallet', desc: 'Link your company wallet on Sepolia testnet.' },
  { step: '02', title: 'Register Payroll', desc: 'Deploy your dedicated confidential payroll contract.' },
  { step: '03', title: 'Onboard Employees', desc: 'Add employees manually or import from CSV/XLSX.' },
  { step: '04', title: 'Run Payroll', desc: 'Execute encrypted batch payments in one click.' },
];

export function HowItWorksModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (open) {
      const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ isolation: 'isolate' }}
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--color-border-light)] bg-white p-8 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-it-works-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="how-it-works-title" className="text-lg font-bold text-[var(--color-text-primary)]">
            How it works
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-light)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-200 hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
        <div className="space-y-5">
          {steps.map((s) => (
            <div key={s.step} className="flex gap-4 items-start">
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-amber-500 text-white text-xs font-bold shadow-lg shadow-[var(--color-primary)]/20">
                {s.step}
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{s.title}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default HowItWorksModal;
