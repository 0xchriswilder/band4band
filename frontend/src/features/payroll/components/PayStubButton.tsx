import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Download } from 'lucide-react';
import type { SalaryPaymentRow } from '../../../lib/supabase';
import { buildPayStubBlob, downloadPayStub } from '../utils/payStub';

interface PayStubButtonProps {
  payment: SalaryPaymentRow;
  decryptedAmount?: bigint;
  employerName: string | null;
  tokenSymbol: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
}

export function PayStubButton({
  payment,
  decryptedAmount,
  employerName,
  tokenSymbol,
  variant = 'ghost',
  size = 'sm',
  className,
}: PayStubButtonProps) {
  const handleDownload = () => {
    const blob = buildPayStubBlob(
      payment,
      decryptedAmount ?? null,
      employerName,
      tokenSymbol
    );
    const filename = `pay-stub-${payment.tx_hash.slice(0, 10)}.txt`;
    downloadPayStub(blob, filename);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleDownload}
      title="Download pay stub (proof of payment)"
    >
      <Download className="h-3.5 w-3.5" />
      Pay stub
    </Button>
  );
}
