import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { useFhevm } from '../../providers/useFhevmContext';

export function Header() {
  const location = useLocation();
  const { isReady, isLoading } = useFhevm();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/employer', label: 'Employer' },
    { to: '/employee', label: 'Employee' },
    { to: '/activity', label: 'Activity' },
  ];

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

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isActive
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-primary)] hover:text-[var(--color-primary)]'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
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

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-[#f4eee6] text-[var(--color-text-primary)]"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-[var(--color-border-light)] bg-white px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-primary)] hover:bg-[#f4eee6]'
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2">
            {isLoading ? (
              <Badge variant="warning" dot size="sm">FHE loading</Badge>
            ) : isReady ? (
              <Badge variant="success" dot size="sm">FHE ready</Badge>
            ) : (
              <Badge variant="default" size="sm">FHE offline</Badge>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export default Header;
