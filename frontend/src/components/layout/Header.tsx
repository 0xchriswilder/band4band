import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { HelpCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { HowItWorksModal } from '../HowItWorksModal';
import { useFhevm } from '../../providers/useFhevmContext';

export function Header() {
  const { isReady, isLoading } = useFhevm();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border-light)] bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
              <img src="/payroll.png" alt="" className="h-10 w-10 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Payroll Guard
            </span>
          </Link>

          {/* Right side — How it works + FHE + Connect */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHowItWorksOpen(true)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-light)] transition-colors"
              aria-label="How it works"
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">How it works</span>
            </button>
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
      <HowItWorksModal open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </header>
  );
}

export default Header;
