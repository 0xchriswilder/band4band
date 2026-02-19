import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileSignature,
  Clock,
  Calculator,
  Package,
  Landmark,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

const roadmapFeatures: Record<
  string,
  { title: string; description: string; bullets: string[]; icon: React.ComponentType<{ className?: string }> }
> = {
  contracts: {
    title: 'E-sign employment contracts',
    description:
      'Send employment or contractor agreements for e-signature before onboarding. Integrates with e-sign APIs (e.g. DocuSign sandbox or Inkless); no smart contract changes required.',
    bullets: [
      'Create and send contracts from Employer Dashboard',
      'Employee signs electronically; status stored in Supabase',
      'On-chain onboarding stays as-is — sign first, then onboard',
    ],
    icon: FileSignature,
  },
  'time-tracking': {
    title: 'Time tracking & timesheets',
    description:
      'Employees submit hours; employers review and approve. Timesheets stored off-chain (Supabase) and can be used to inform payroll without changing the Payroll contract.',
    bullets: [
      'Submit hours per period (weekly/bi-weekly/monthly)',
      'Employer approval workflow',
      'Optional link to pay amount for next payroll run',
    ],
    icon: Clock,
  },
  tax: {
    title: 'Tax estimates & withholding',
    description:
      'Display estimated tax withholding for transparency. This is a preview: actual tax filing and deposits would require separate infrastructure and possibly contract changes.',
    bullets: [
      'Show estimated withholdings (federal/state) as reference',
      'No contract change — display-only or off-chain calculation',
      'Full tax filing would be a later phase',
    ],
    icon: Calculator,
  },
  benefits: {
    title: 'Benefits & deductions',
    description:
      'Support for benefits (health, 401(k), etc.) and pre/post-tax deductions. Full implementation would require contract changes to support multiple payouts or deduction logic.',
    bullets: [
      'Enrollment and deduction display (off-chain)',
      'Contract would need to support split payments for full automation',
      'Preview of planned UX and data model',
    ],
    icon: Package,
  },
  'bank-payouts': {
    title: 'Bank payouts (withdraw to bank)',
    description:
      'Future: allow employees or employers to withdraw cUSDC/USDC to a bank account via a partner off-ramp. This app is currently crypto-native (wallet-only payments).',
    bullets: [
      'Partner integration (e.g. off-ramp provider)',
      'No smart contract change — third-party service',
      'Positioned as optional for users who want fiat exit',
    ],
    icon: Landmark,
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function RoadmapPreviewPage() {
  const { feature } = useParams<{ feature: string }>();
  const config = feature ? roadmapFeatures[feature] : null;

  if (!config) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <Card variant="elevated" padding="lg">
          <p className="text-[var(--color-text-secondary)]">Unknown roadmap feature. Use the sidebar to open a preview.</p>
        </Card>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Link
        to="/employer"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col gap-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{config.title}</h1>
              <Badge variant="primary" size="sm">
                <Sparkles className="h-3 w-3" /> Coming soon
              </Badge>
            </div>
          </div>
        </div>
        <Card variant="elevated" padding="lg" className="border border-[var(--color-border-light)]">
          <p className="text-[var(--color-text-secondary)] mb-6">{config.description}</p>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Planned</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-[var(--color-text-secondary)]">
            {config.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        </Card>
      </motion.div>
    </div>
  );
}

export default RoadmapPreviewPage;
