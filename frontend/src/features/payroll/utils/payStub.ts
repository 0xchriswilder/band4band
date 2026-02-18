import type { SalaryPaymentRow } from '../../../lib/supabase';
import { formatAmount } from '../../../lib/utils';
import { TOKEN_CONFIG } from '../../../lib/contracts';

const EXPLORER_TX = 'https://sepolia.etherscan.io/tx';

export function buildPayStubBlob(
  payment: SalaryPaymentRow,
  decryptedAmount: bigint | null,
  employerName: string | null,
  tokenSymbol: string
): Blob {
  const date = new Date(payment.timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const amountStr =
    decryptedAmount !== null
      ? `${formatAmount(decryptedAmount, TOKEN_CONFIG.decimals)} ${tokenSymbol}`
      : 'Encrypted — decrypt in app to see amount';
  const txLink = `${EXPLORER_TX}/${payment.tx_hash}`;

  const lines = [
    'PAY STUB / PAYMENT PROOF',
    '─────────────────────────',
    `Date:        ${date}`,
    `Employer:    ${employerName ?? payment.employer}`,
    `Employee:    ${payment.employee}`,
    `Amount:      ${amountStr}`,
    `Tx hash:     ${payment.tx_hash}`,
    `Tx link:     ${txLink}`,
  ];

  return new Blob([lines.join('\n')], { type: 'text/plain' });
}

export function downloadPayStub(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
