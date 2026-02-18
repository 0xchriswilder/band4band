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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white overflow-hidden">
                <img src="/payroll.png" alt="" className="h-6 w-6 object-contain" />
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
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--color-primary)] transition-colors inline-flex items-center gap-1"
                >
                  GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
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
    </footer>
  );
}

export default Footer;
