import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[var(--color-border-light)] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden">
                <img src="/payroll.png" alt="" className="h-8 w-8 object-contain" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
                Payroll Guard
              </span>
            </Link>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Confidential onchain payroll built on Zama's fhEVM with Fully Homomorphic Encryption.
            </p>
          </div>

          {/* Employer */}
          <div>
            <h3 className="font-semibold text-base text-[var(--color-text-primary)] mb-5">Employer</h3>
            <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <li>
                <Link to="/employer" className="hover:text-[var(--color-primary)] transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/employer" className="hover:text-[var(--color-primary)] transition-colors">
                  Onboard Employees
                </Link>
              </li>
              <li>
                <Link to="/activity" className="hover:text-[var(--color-primary)] transition-colors">
                  Payment History
                </Link>
              </li>
            </ul>
          </div>

          {/* Employee */}
          <div>
            <h3 className="font-semibold text-base text-[var(--color-text-primary)] mb-5">Employee</h3>
            <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <li>
                <Link to="/employee" className="hover:text-[var(--color-primary)] transition-colors">
                  Portal
                </Link>
              </li>
              <li>
                <Link to="/employee" className="hover:text-[var(--color-primary)] transition-colors">
                  Decrypt Payments
                </Link>
              </li>
              <li>
                <Link to="/employee" className="hover:text-[var(--color-primary)] transition-colors">
                  Wrap / Unwrap
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-base text-[var(--color-text-primary)] mb-5">Resources</h3>
            <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <li>
                <a
                  href="https://docs.zama.org/protocol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--color-primary)] transition-colors inline-flex items-center gap-1"
                >
                  About fhEVM
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://sepolia.etherscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--color-primary)] transition-colors inline-flex items-center gap-1"
                >
                  Block Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
              
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-[var(--color-border-light)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            &copy; {currentYear} Payroll Guard. Built on Zama FHE.
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse" />
            <span>Sepolia Testnet</span>
          </div>
        </div>
      </div>

      {/* Full-width wordmark — outside max-w-7xl so it uses full viewport and text is never cut off */}
      <div className="border-t border-[var(--color-border-light)]">
        <div
          className="bg-white py-12 sm:py-16 md:py-20 flex flex-col items-stretch justify-center gap-2 w-full min-w-0"
          style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
        >
          <div className="flex w-full items-center justify-center px-4 sm:px-6 lg:px-8 min-w-0 overflow-x-auto" aria-hidden>
            <span
              className="font-black tracking-tighter text-[var(--color-primary)] select-none leading-none text-center whitespace-nowrap min-w-0"
              style={{ fontSize: 'clamp(1.5rem, 8vw, 14rem)' }}
            >
              PAYROLL GUARD
            </span>
          </div>
          <span className="text-[var(--color-text-tertiary)] text-xs sm:text-sm uppercase tracking-[0.2em] mt-1 text-center">
            Confidential payroll onchain. Powered by Zama FHE.
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
