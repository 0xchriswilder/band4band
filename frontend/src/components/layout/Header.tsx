import React from 'react';
import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useFhevm } from '../../providers/useFhevmContext';

export function Header() {
  const { isReady, isLoading } = useFhevm();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border-light)] bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/25 group-hover:shadow-lg group-hover:shadow-[var(--color-primary)]/30 transition-all">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Payroll Guard
            </span>
          </Link>

          {/* Right side — no top nav; use sidebar for navigation */}
          <div className="flex items-center gap-3">
            {/* FHE status */}
            <div className="hidden sm:block">
              {isLoading ? (
                <Badge variant="warning" dot size="sm">FHE loading</Badge>
              ) : isReady ? (
                <Badge variant="success" dot size="sm">FHE ready</Badge>
              ) : (
                <Badge variant="default" size="sm">FHE offline</Badge>
              )}
            </div>

            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
