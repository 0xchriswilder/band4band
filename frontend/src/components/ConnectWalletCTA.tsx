import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowRight, ChevronRight, type LucideIcon } from 'lucide-react';
import { Header } from './layout/Header';
import { Footer } from './layout/Footer';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface ConnectWalletCTAProps {
  icon: LucideIcon;
  badge: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  features: Feature[];
  highlights?: { icon: LucideIcon; label: string }[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

export function ConnectWalletCTA({
  icon: Icon,
  badge,
  title,
  titleAccent,
  subtitle,
  features,
  highlights,
}: ConnectWalletCTAProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-light)]">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden flex-1 flex flex-col py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex-1 flex flex-col justify-center">
          {/* Top Section — Icon + Headline + CTA */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--color-primary)] mx-auto mb-6 shadow-xl shadow-[var(--color-primary)]/25">
                <Icon className="h-10 w-10 text-white" />
              </div>
            </motion.div>

            <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-sm font-bold text-[var(--color-primary)]">
                {badge}
              </div>
            </motion.div>

            <motion.h1
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--color-text-primary)] leading-[1.1]"
            >
              {title}{' '}
              <span className="text-[var(--color-primary)]">
                {titleAccent}
              </span>
            </motion.h1>

            <motion.p
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-5 text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl mx-auto"
            >
              {subtitle}
            </motion.p>

            <motion.div
              custom={4}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <ConnectButton.Custom>
                {({ openConnectModal, connectModalOpen }) => (
                  <button
                    onClick={openConnectModal}
                    disabled={connectModalOpen}
                    className="flex items-center justify-center gap-2.5 rounded-xl bg-[var(--color-primary)] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[var(--color-primary)]/25 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    Connect Wallet
                    <ArrowRight className="h-5 w-5" />
                  </button>
                )}
              </ConnectButton.Custom>

              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-5 py-3 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
              >
                Learn more
                <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {/* Highlights row */}
            {highlights && highlights.length > 0 && (
              <motion.div
                custom={5}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-text-tertiary)]"
              >
                {highlights.map((h) => (
                  <div key={h.label} className="flex items-center gap-2">
                    <h.icon className="h-4 w-4 text-[var(--color-primary)]" />
                    <span>{h.label}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Feature Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto w-full">
            {features.map((f, idx) => (
              <motion.div
                key={f.title}
                custom={idx + 5}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex flex-col gap-5 rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-bg-surface)] p-6 group hover:border-[var(--color-primary-light)] transition-all duration-300 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] mx-auto group-hover:bg-[var(--color-primary)] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[var(--color-primary)]/25 transition-all duration-300">
                  <f.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default ConnectWalletCTA;
