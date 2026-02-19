import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Users,
  Zap,
  ArrowRight,
  Eye,
  EyeOff,
  FileSpreadsheet,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Globe,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const features = [
  {
    icon: Lock,
    title: 'Encrypted Salaries',
    description:
      'Salaries are encrypted using FHE before being stored on-chain. Only the employer and the respective employee can decrypt.',
  },
  {
    icon: Zap,
    title: 'One-Click Payroll',
    description:
      'Execute batch confidential transfers in a single transaction. All payouts stay private while provably correct.',
  },
  {
    icon: Eye,
    title: 'Employee Verification',
    description:
      'Employees can independently verify and decrypt their own payments using their wallet signature.',
  },
  {
    icon: FileSpreadsheet,
    title: 'CSV / XLSX Import',
    description:
      'Bulk-import employees and salaries from spreadsheets. Onboard entire teams in seconds.',
  },
  {
    icon: Users,
    title: 'Per-Employer Contracts',
    description:
      'Each employer gets a dedicated Payroll contract via the factory pattern, ensuring data isolation.',
  },
  {
    icon: EyeOff,
    title: 'Truly Confidential',
    description:
      'Powered by Zama fhEVM and ERC-7984 confidential tokens. No one else can see salary amounts on-chain.',
  },
];

const stats = [
  { label: 'Encryption Standard', value: 'FHE' },
  { label: 'Token Standard', value: 'ERC-7984' },
  { label: 'Batch Payments', value: 'Yes' },
  { label: 'Audit Trail', value: 'On-chain' },
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-bg-light)]">
      <Header />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left content */}
            <div className="flex flex-col gap-8">
              <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-bg-light)] border border-[var(--color-border-light)] px-3 py-1 text-sm font-bold text-[var(--color-primary)]">
                  <img src="/payroll.png" alt="" className="h-5 w-5 object-contain" />
                  Powered by Zama FHE Technology
                </div>
              </motion.div>

              <motion.h1
                custom={1}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="text-5xl font-black leading-[1.1] tracking-tight text-[var(--color-text-primary)] sm:text-6xl"
              >
                Confidential Payroll,{' '}
                <br className="hidden sm:block" />
                <span className="text-[var(--color-primary)]">Powered by Privacy.</span>
              </motion.h1>

              <motion.p
                custom={2}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]"
              >
                Pay your team on-chain while keeping every salary private.
                Encrypted salaries, verifiable payments, and full
                confidentiality using Zama fhEVM and ERC-7984 tokens.
              </motion.p>

              <motion.div
                custom={3}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="flex flex-wrap gap-4"
              >
                <button
                  onClick={() => navigate('/employer')}
                  className="flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[var(--color-primary)]/25 hover:bg-orange-600 active:scale-[0.98] transition-all"
                >
                  Launch dApp
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/employee')}
                  className="flex min-w-[160px] items-center justify-center gap-2 rounded-xl border-2 border-[var(--color-border-light)] bg-transparent px-6 py-4 text-base font-bold text-[var(--color-text-primary)] hover:bg-[#f4eee6] active:scale-[0.98] transition-all"
                >
                  Employee Portal
                  <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>

              <motion.div
                custom={4}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="flex items-center gap-6 text-sm text-[var(--color-text-tertiary)]"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[var(--color-primary)]" />
                  <span>FHE-encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[var(--color-primary)]" />
                  <span>ERC-7984 tokens</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[var(--color-primary)]" />
                  <span>Sepolia testnet</span>
                </div>
              </motion.div>
            </div>

            {/* Right side — landing image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-[var(--color-primary)]/20 to-transparent blur-2xl" />
              <div className="relative rounded-2xl border border-[var(--color-border-light)] bg-white overflow-hidden shadow-2xl">
                <img
                  src="/landing.png"
                  alt="Confidential payroll — connect, register, onboard, run payroll"
                  className="w-full h-auto object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              End-to-End Encrypted Payroll
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-text-secondary)]">
              Everything you need to run a privacy-preserving payroll system on
              Ethereum using fully homomorphic encryption.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, idx) => (
              <motion.div
                key={f.title}
                custom={idx}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex flex-col gap-6 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-surface)] p-8 group hover:border-[var(--color-primary-light)] transition-all duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[var(--color-primary)]/25 transition-all duration-300">
                  <f.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-[var(--color-text-secondary)]">
                    {f.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── E-sign contracts (DocuSign) ─── */}
      <section className="py-24 bg-[var(--color-bg-light)] border-t border-[var(--color-border-light)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <img src="/docs.svg" alt="" className="h-16 w-16 object-contain" />
              <span className="text-sm font-bold uppercase tracking-widest text-[var(--color-primary)]">E-signatures</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Employment contracts, signed before onboarding
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-text-secondary)]">
              Employers connect DocuSign once, then send employment agreements to their team. Employees sign electronically — one flow, fully compliant. No shared account: bring your own DocuSign.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl border-2 border-[var(--color-border-light)] bg-white p-8 shadow-lg hover:border-[var(--color-primary)]/30 hover:shadow-xl transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[var(--color-primary)]/10 to-transparent rounded-bl-full" />
              <div className="relative flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200/80">
                  <img src="/docss.png" alt="DocuSign" className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Connect & send in one click</h3>
                  <p className="mt-3 text-[var(--color-text-secondary)] leading-relaxed">
                    As an employer, connect your DocuSign account From the Contracts page, pick an employee and send an employment agreement — they receive the signing link by email and sign before you onboard them on-chain.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                      One-time DocuSign connection per employer
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                      Send from your team list; track sent and signed
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative overflow-hidden rounded-2xl border-2 border-[var(--color-border-light)] bg-white p-8 shadow-lg hover:border-[var(--color-primary)]/30 hover:shadow-xl transition-all duration-300"
            >
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-tr-full" />
              <div className="relative flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/80">
                  <Users className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Bring your own DocuSign</h3>
                  <p className="mt-3 text-[var(--color-text-secondary)] leading-relaxed">
                    We don’t use a single shared DocuSign account. Every employer connects <strong>their own</strong> DocuSign via OAuth — so contract emails and branding come from your account. Perfect for companies that already use DocuSign: connect your existing account and start sending contracts from the dApp.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                      Your account, your branding, your audit trail
                    </li>
                    <li className="flex items-center gap-2">
                     
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          <p className="mt-8 text-center text-sm text-[var(--color-text-tertiary)] flex items-center justify-center gap-2 flex-wrap">
            <img src="/docss.png" alt="" className="h-5 w-5 object-contain opacity-80" />
            E-signatures powered by DocuSign
          </p>
        </div>
      </section>

      {/* ─── Comparison: Traditional vs Confidential Payroll ─── */}
      <section className="py-24 bg-[var(--color-bg-light)] border-t border-[var(--color-border-light)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Traditional Payroll vs Confidential Payroll
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-text-secondary)]">
              See how on-chain confidential payroll compares to existing solutions like Deel, Rippling, and others.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border border-[var(--color-border-light)] rounded-2xl overflow-hidden bg-white shadow-sm">
              <thead>
                <tr className="bg-[var(--color-bg-light)] border-b border-[var(--color-border-light)]">
                  <th className="px-6 py-4 text-left text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Capability
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Deel / Rippling / Gusto
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider bg-[var(--color-primary)]/5">
                    Confidential Payroll (Ours)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {[
                  {
                    capability: 'Salary amounts visible',
                    traditional: 'Platform & employer see all amounts',
                    ours: 'Encrypted on-chain; only employee can decrypt',
                  },
                  {
                    capability: 'On-chain verification',
                    traditional: 'Usually off-chain or opaque',
                    ours: 'Fully on-chain, verifiable, private',
                  },
                  {
                    capability: 'Who can see what you pay',
                    traditional: 'Provider, admins, sometimes auditors',
                    ours: 'Only you and the employee (FHE)',
                  },
                  {
                    capability: 'Censorship resistance',
                    traditional: 'Tied to provider; can freeze accounts',
                    ours: 'Self-custody; wallet and contract control',
                  },
                  {
                    capability: 'Audit trail',
                    traditional: 'Internal logs, exportable reports',
                    ours: 'Public blockchain; amounts stay encrypted',
                  },
                  {
                    capability: 'Batch payments',
                    traditional: 'Yes (ACH, wire, etc.)',
                    ours: 'Yes — one tx for full payroll (ERC-7984)',
                  },
                ].map((row) => (
                  <tr key={row.capability} className="hover:bg-[var(--color-bg-light)]/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[var(--color-text-primary)]">
                      {row.capability}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] text-center">
                      {row.traditional}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-primary)] text-center bg-[var(--color-primary)]/5 font-medium">
                      {row.ours}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-sm text-[var(--color-text-tertiary)]">
            Built on Zama fhEVM and ERC-7984 confidential tokens. No third party can see salary data.
          </p>
        </div>
      </section>

      {/* ─── Privacy Showcase (Dark CTA Section) ─── */}
      <section className="py-24 bg-[var(--color-bg-light)] overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-[var(--color-bg-dark)] p-8 lg:p-16">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[var(--color-primary)]/20 to-transparent" />

            <div className="relative z-10 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
              {/* Left text */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex flex-col gap-6"
              >
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Salary Data That Stays Private
                </h2>
                <p className="text-lg text-zinc-400 leading-relaxed">
                  Unlike traditional on-chain payroll, our system encrypts every salary amount
                  using Fully Homomorphic Encryption. The smart contract processes payments
                  without ever revealing the actual figures.
                </p>
                <ul className="space-y-3">
                  {[
                    'Encrypted salary storage on-chain',
                    'Employee-only decryption via wallet signature',
                    'Verifiable payments without data exposure',
                    'ERC-7984 operator pattern for delegation',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                      <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-4 text-xs text-zinc-500 uppercase tracking-widest mt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                    Sepolia Active
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                    FHE Enabled
                  </span>
                </div>
              </motion.div>

              {/* Right — encrypted balance mockup */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                <div className="rounded-2xl border border-zinc-700 bg-zinc-800/50 p-6 backdrop-blur-sm shadow-xl">
                  <div className="flex items-center gap-3 mb-6 border-b border-zinc-700 pb-4">
                    <div className="w-12 h-12 flex items-center justify-center">
                      <img src="/payroll.png" alt="" className="w-12 h-12 object-contain" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm font-medium">Confidential Balance</p>
                      <p className="text-white font-bold">Encrypted cUSDCp</p>
                    </div>
                  </div>
                  <div className="text-5xl font-black text-white mb-2 tracking-wider">
                    $&bull;&bull;&bull;&bull;&bull;&bull;
                  </div>
                  <p className="text-zinc-500 text-sm mb-6">
                    Only you can decrypt this balance
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-700/50 rounded-xl p-3 border border-zinc-600">
                      <p className="text-zinc-500 text-xs mb-0.5">Last Payment</p>
                      <p className="text-white font-bold text-sm">$&bull;&bull;&bull;&bull;</p>
                    </div>
                    <div className="bg-zinc-700/50 rounded-xl p-3 border border-zinc-600">
                      <p className="text-zinc-500 text-xs mb-0.5">Pay Cycle</p>
                      <p className="text-white font-bold text-sm">Monthly</p>
                    </div>
                    <div className="bg-[var(--color-primary)]/10 rounded-xl p-3 border border-[var(--color-primary)]/30">
                      <p className="text-zinc-500 text-xs mb-0.5">Status</p>
                      <p className="text-white font-bold text-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                        Active
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-16 border-t border-[var(--color-border-light)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, idx) => (
              <div key={stat.label} className="text-center">
                <div className={`text-3xl font-black ${idx === 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--color-text-secondary)] uppercase font-bold tracking-wider mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative rounded-3xl bg-[var(--color-bg-dark)] overflow-hidden">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/3 w-64 h-64 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl" />
              </div>
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 px-8 py-12 lg:px-14 lg:py-16">
                <div className="max-w-xl">
                  <h3 className="text-2xl font-black text-white lg:text-3xl">
                    Ready to run confidential payroll?
                  </h3>
                  <p className="mt-3 text-zinc-400 text-base leading-relaxed">
                    Connect your wallet, deploy a payroll contract, and start
                    paying your team with full on-chain privacy in under 5 minutes.
                  </p>
                </div>
                <div className="flex gap-4 flex-shrink-0">
                  <button
                    onClick={() => navigate('/employer')}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-8 py-4 font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[var(--color-primary)]/25"
                  >
                    <Wallet className="h-5 w-5" />
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Landing;
