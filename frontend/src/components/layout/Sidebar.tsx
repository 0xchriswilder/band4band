import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import {
  Shield,
  Home,
  Building2,
  UserCircle,
  BarChart3,
  FileText,
  X,
  Wallet,
  LogOut,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { useFhevm } from '../../providers/useFhevmContext';
import { formatAddress } from '../../lib/utils';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/employer', label: 'Employer Dashboard', icon: Building2 },
  { to: '/employer/invoices', label: 'Invoices', icon: FileText },
  { to: '/employee', label: 'Employee Portal', icon: UserCircle },
  { to: '/activity', label: 'Transaction History', icon: BarChart3 },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { isReady, isLoading } = useFhevm();
  const closeMobile = onMobileClose;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'w-72 bg-white border-r border-[var(--color-primary)]/10 flex flex-col fixed h-full z-50 transition-transform duration-200 ease-out',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 flex flex-col gap-8 h-full overflow-y-auto">
          {/* Mobile close / menu - shown in main area via AppLayout, not here */}
          <div className="flex items-center justify-between md:justify-start">
            <Link to="/" className="flex items-center gap-3" onClick={closeMobile}>
              <div className="bg-[var(--color-primary)] rounded-lg p-2 text-white shadow-md shadow-[var(--color-primary)]/25">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-[var(--color-text-primary)] text-lg font-bold leading-none">
                  Confidential
                </h1>
                <p className="text-[var(--color-primary)] text-xs font-semibold uppercase tracking-wider">
                  Payroll dApp
                </p>
              </div>
            </Link>
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-[var(--color-primary)]/5 text-[var(--color-text-primary)]"
              onClick={closeMobile}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* FHE status */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Badge variant="warning" dot size="sm">FHE loading</Badge>
            ) : isReady ? (
              <Badge variant="success" dot size="sm">FHE ready</Badge>
            ) : (
              <Badge variant="default" size="sm">FHE offline</Badge>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 grow">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeMobile}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                    isActive
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'hover:bg-[var(--color-primary)]/5 text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]'
                    )}
                  />
                  <span className={cn('text-sm', isActive ? 'font-semibold' : 'font-medium')}>
                    {label}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom: Connect / Wallet */}
          <div className="mt-auto flex flex-col gap-4">
            {!isConnected ? (
              <div className="flex justify-center [&_.rainbow-kit_button]:!rounded-xl [&_.rainbow-kit_button]:!font-bold [&_.rainbow-kit_button]:!py-3 [&_.rainbow-kit_button]:!shadow-lg [&_.rainbow-kit_button]:!shadow-[var(--color-primary)]/20">
                <ConnectButton.Custom>
                  {({ openConnectModal, mounted }) => {
                    if (!mounted) return null;
                    return (
                      <button
                        type="button"
                        onClick={openConnectModal}
                        className="w-full bg-[var(--color-primary)] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 hover:bg-[var(--color-primary-hover)] transition-all"
                      >
                        <Wallet className="h-4 w-4" />
                        Connect Wallet
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 p-2.5 bg-[var(--color-bg-light)] rounded-xl border border-[var(--color-primary)]/10">
                  <div className="h-10 w-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                    <Wallet className="h-5 w-5 text-[var(--color-primary)]" />
                  </div>
                  <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                    <p className="text-xs font-bold truncate text-[var(--color-text-primary)]">
                      {address ? formatAddress(address, 6) : '—'}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-secondary)] uppercase font-bold">
                      Connected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--color-border-light)] bg-white hover:bg-gray-50 text-[var(--color-text-secondary)] hover:text-red-600 transition-colors text-sm font-medium"
                  title="Disconnect wallet"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
