import React from 'react';

/** cUSDT logo (USDT-style green circle). */
export function CusdtLogo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="16" cy="16" r="15" fill="#26A17B" />
      <circle cx="16" cy="16" r="12" fill="#26A17B" stroke="white" strokeWidth="2" />
      <text x="16" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="system-ui, sans-serif">cUSDT</text>
    </svg>
  );
}
