import React from 'react';

/** cUSDCP logo (USDC-style blue circle). */
export function CusdcpLogo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="16" cy="16" r="15" fill="#2775CA" />
      <circle cx="16" cy="16" r="12" fill="#2775CA" stroke="white" strokeWidth="2" />
      <text x="16" y="20" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="system-ui, sans-serif">cUSDCP</text>
    </svg>
  );
}
