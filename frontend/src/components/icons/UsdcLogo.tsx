import React from 'react';

/** USDC / cUSDC logo (uses public usdc.svg). */
export function UsdcLogo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <img
      src="/usdc.svg"
      alt="USDC"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
