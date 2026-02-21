import React from 'react';

/**
 * Payroll execution animation: Employer → Encryption → FHE Contract → Employee.
 * Uses theme colors: --color-primary (orange), --color-bg-dark, --color-text-tertiary.
 */
export function PayrollExecutionAnimation() {
  return (
    <div className="payroll-execution-animation w-full max-w-full overflow-hidden rounded-2xl bg-[var(--color-bg-dark)] [color:var(--color-text-on-dark)]">
      <style>{`
        .payroll-execution-animation {
          --anim-primary: var(--color-primary);
          --anim-bg: var(--color-bg-dark);
          --anim-muted: var(--color-text-tertiary);
          --anim-light: #f8f7f5;
        }
        .payroll-execution-animation .mono {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .payroll-execution-animation svg {
          width: 100%;
          max-width: 100%;
          height: auto;
          display: block;
        }
        .payroll-execution-animation .spin-slow {
          transform-origin: 450px 300px;
          animation: pay-spin 10s linear infinite;
        }
        .payroll-execution-animation .spin-fast-rev {
          transform-origin: 450px 300px;
          animation: pay-spinRev 6s linear infinite;
        }
        @keyframes pay-spin { 100% { transform: rotate(360deg); } }
        @keyframes pay-spinRev { 100% { transform: rotate(-360deg); } }

        .payroll-execution-animation .cursor {
          animation: pay-cursorMove 8s linear infinite;
        }
        @keyframes pay-cursorMove {
          0%, 5% { opacity: 0; transform: translate(180px, 420px); }
          10%, 14% { opacity: 1; transform: translate(145px, 360px); }
          15% { transform: translate(145px, 360px) scale(0.85); }
          16%, 20% { opacity: 1; transform: translate(155px, 380px); }
          25%, 100% { opacity: 0; transform: translate(180px, 420px); }
        }

        .payroll-execution-animation .run-btn {
          animation: pay-buttonPulse 8s linear infinite;
        }
        @keyframes pay-buttonPulse {
          0%, 14.9% { fill: var(--anim-light); }
          15%, 25% { fill: var(--anim-primary); }
          25.1%, 100% { fill: var(--anim-light); }
        }

        .payroll-execution-animation .active-track {
          stroke-dasharray: 900;
          stroke-dashoffset: 900;
          animation: pay-trackFill 8s linear infinite;
        }
        @keyframes pay-trackFill {
          0%, 15% { stroke-dashoffset: 900; opacity: 1; }
          25%, 35% { stroke-dashoffset: 600; opacity: 1; }
          45%, 65% { stroke-dashoffset: 300; opacity: 1; }
          75%, 90% { stroke-dashoffset: 0; opacity: 1; }
          95%, 100% { stroke-dashoffset: 0; opacity: 0; }
        }

        .payroll-execution-animation .payload-container {
          animation: pay-movePayload 8s linear infinite;
        }
        @keyframes pay-movePayload {
          0%, 14.9% { transform: translate(150px, 300px); opacity: 0; }
          15%, 16% { transform: translate(150px, 300px); opacity: 1; }
          25%, 35% { transform: translate(450px, 300px); opacity: 1; }
          45%, 65% { transform: translate(750px, 300px); opacity: 1; }
          75%, 90% { transform: translate(1050px, 300px); opacity: 1; }
          95%, 100% { transform: translate(1050px, 300px); opacity: 0; }
        }

        .payroll-execution-animation .token-raw { animation: pay-toggleRaw 8s linear infinite; }
        .payroll-execution-animation .token-enc { animation: pay-toggleEnc 8s linear infinite; }
        .payroll-execution-animation .token-dec { animation: pay-toggleDec 8s linear infinite; }

        @keyframes pay-toggleRaw {
          0%, 24.9% { opacity: 1; transform: scale(1); }
          25%, 100% { opacity: 0; transform: scale(0.5); }
        }
        @keyframes pay-toggleEnc {
          0%, 24.9% { opacity: 0; transform: scale(0.5); }
          25%, 74.9% { opacity: 1; transform: scale(1); }
          75%, 100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes pay-toggleDec {
          0%, 74.9% { opacity: 0; transform: scale(0.5); }
          75%, 100% { opacity: 1; transform: scale(1); }
        }

        .payroll-execution-animation .shield-pulse { animation: pay-shieldPulse 8s linear infinite; }
        @keyframes pay-shieldPulse {
          0%, 24.9% { stroke: var(--anim-light); fill: var(--anim-bg); filter: none; }
          25%, 35% { stroke: var(--anim-primary); fill: #0f0d09; filter: url(#pay-glow); }
          35.1%, 100% { stroke: var(--anim-light); fill: var(--anim-bg); filter: none; }
        }

        .payroll-execution-animation .enc-burst-ring { animation: pay-encBurstRing 8s linear infinite; }
        .payroll-execution-animation .enc-burst-particles { animation: pay-encBurstParticles 8s linear infinite; }
        @keyframes pay-encBurstRing {
          0%, 24.9% { opacity: 0; transform: scale(0.5); transform-origin: 450px 300px; }
          25% { opacity: 1; transform: scale(1); transform-origin: 450px 300px; }
          30%, 100% { opacity: 0; transform: scale(2.5); transform-origin: 450px 300px; }
        }
        @keyframes pay-encBurstParticles {
          0%, 24.9% { opacity: 0; transform: scale(0.5); transform-origin: 450px 300px; }
          25% { opacity: 1; transform: scale(1.2); transform-origin: 450px 300px; }
          32%, 100% { opacity: 0; transform: scale(3.5); transform-origin: 450px 300px; }
        }

        .payroll-execution-animation .text-encrypting { animation: pay-textFade 8s linear infinite; }
        @keyframes pay-textFade {
          0%, 24.9% { opacity: 0; }
          25%, 35% { opacity: 1; }
          35.1%, 100% { opacity: 0; }
        }

        .payroll-execution-animation .contract-hex { animation: pay-contractPulse 8s linear infinite; }
        @keyframes pay-contractPulse {
          0%, 44.9% { stroke: var(--anim-muted); fill: var(--anim-bg); filter: none; }
          45%, 65% { stroke: var(--anim-primary); fill: #0f0d09; filter: url(#pay-glow); }
          65.1%, 100% { stroke: var(--anim-muted); fill: var(--anim-bg); filter: none; }
        }

        .payroll-execution-animation .observer-beam {
          transform-origin: 750px 130px;
          animation: pay-beamSweep 8s linear infinite;
        }
        @keyframes pay-beamSweep {
          0%, 48% { opacity: 0; transform: scaleY(0); }
          50%, 60% { opacity: 0.8; transform: scaleY(1); }
          62%, 100% { opacity: 0; transform: scaleY(0); }
        }

        .payroll-execution-animation .scramble-text { animation: pay-scrambleGlitch 8s linear infinite; }
        @keyframes pay-scrambleGlitch {
          0%, 48% { opacity: 0; }
          50%, 54%, 58% { opacity: 1; transform: translate(4px, -2px); }
          52%, 56%, 60% { opacity: 1; transform: translate(-4px, 2px); }
          62%, 100% { opacity: 0; }
        }

        .payroll-execution-animation .tick-mark { animation: pay-tickDraw 8s linear infinite; }
        @keyframes pay-tickDraw {
          0%, 55% { stroke-dashoffset: 50; opacity: 0; }
          58%, 65% { stroke-dashoffset: 0; opacity: 1; }
          66%, 100% { stroke-dashoffset: 0; opacity: 0; }
        }

        .payroll-execution-animation .text-verifying { animation: pay-textFadeContract 8s linear infinite; }
        @keyframes pay-textFadeContract {
          0%, 44.9% { opacity: 0; }
          45%, 65% { opacity: 1; }
          65.1%, 100% { opacity: 0; }
        }

        .payroll-execution-animation .emp-lock-top {
          transform-origin: 1050px 330px;
          animation: pay-empLockTop 8s linear infinite;
        }
        .payroll-execution-animation .emp-lock-base { animation: pay-empLockBase 8s linear infinite; }
        @keyframes pay-empLockTop {
          0%, 74.9% { transform: rotate(0deg); stroke: var(--anim-muted); }
          75%, 90% { transform: rotate(-35deg) translate(-3px, -2px); stroke: var(--anim-primary); }
          91%, 100% { transform: rotate(0deg); stroke: var(--anim-muted); }
        }
        @keyframes pay-empLockBase {
          0%, 74.9% { fill: var(--anim-muted); filter: none; }
          75%, 90% { fill: var(--anim-primary); filter: url(#pay-glow); }
          91%, 100% { fill: var(--anim-muted); filter: none; }
        }

        .payroll-execution-animation .emp-amount { animation: pay-empAmount 8s linear infinite; }
        @keyframes pay-empAmount {
          0%, 75% { opacity: 0; transform: translateY(10px); }
          77%, 90% { opacity: 1; transform: translateY(0); }
          92%, 100% { opacity: 0; transform: translateY(-10px); }
        }

        .payroll-execution-animation .text-secured { animation: pay-textFadeEmp 8s linear infinite; }
        @keyframes pay-textFadeEmp {
          0%, 75.9% { opacity: 0; }
          76%, 90% { opacity: 1; }
          91%, 100% { opacity: 0; }
        }
      `}</style>
      <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <pattern id="pay-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--anim-muted)" strokeWidth="0.5" opacity="0.1" />
          </pattern>
          <filter id="pay-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="pay-beamGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--anim-muted)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--anim-muted)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="var(--anim-bg)" />
        <rect width="100%" height="100%" fill="url(#pay-grid)" />

        <g id="tracks">
          <path d="M 150 285 L 1050 285" stroke="var(--anim-muted)" strokeWidth="1" opacity="0.2" />
          <path d="M 150 315 L 1050 315" stroke="var(--anim-muted)" strokeWidth="1" opacity="0.2" />
          <path d="M 150 300 L 1050 300" stroke="var(--anim-muted)" strokeWidth="2" strokeDasharray="6 6" opacity="0.4" />
          <path d="M 150 300 L 1050 300" stroke="var(--anim-primary)" strokeWidth="3" filter="url(#pay-glow)" className="active-track" />
        </g>

        <g id="node-employer">
          <rect x="50" y="140" width="200" height="260" rx="12" fill="var(--anim-bg)" stroke="var(--anim-muted)" strokeWidth="1.5" />
          <line x1="50" y1="180" x2="250" y2="180" stroke="var(--anim-muted)" strokeWidth="1.5" />
          <text x="150" y="166" fill="var(--anim-light)" fontSize="12" fontWeight="600" textAnchor="middle" letterSpacing="2">EMPLOYER</text>
          <circle cx="150" cy="220" r="16" fill="none" stroke="var(--anim-light)" strokeWidth="2" />
          <path d="M 120 270 Q 150 240 180 270" fill="none" stroke="var(--anim-light)" strokeWidth="2" strokeLinecap="round" />
          <text x="150" y="310" fill="var(--anim-light)" fontSize="20" fontWeight="700" textAnchor="middle" className="mono">5,000 USDC</text>
          <rect x="85" y="340" width="130" height="36" rx="6" fill="var(--anim-light)" className="run-btn" />
          <text x="150" y="363" fill="var(--anim-bg)" fontSize="12" fontWeight="700" textAnchor="middle">RUN PAYROLL</text>
        </g>

        <g id="node-encryption">
          <circle cx="450" cy="300" r="80" fill="none" stroke="var(--anim-muted)" strokeWidth="1" strokeDasharray="4 8" className="spin-slow" opacity="0.5" />
          <circle cx="450" cy="300" r="55" fill="none" stroke="var(--anim-muted)" strokeWidth="2" strokeDasharray="10 10" className="spin-fast-rev" />
          <path d="M 450 260 L 480 275 L 480 320 Q 450 350 450 355 Q 450 350 420 320 L 420 275 Z" fill="var(--anim-bg)" stroke="var(--anim-light)" strokeWidth="2" className="shield-pulse" />
          <circle cx="450" cy="305" r="8" fill="none" stroke="var(--anim-muted)" strokeWidth="2" />
          <text x="450" y="420" fill="var(--anim-muted)" fontSize="12" fontWeight="500" textAnchor="middle" letterSpacing="1">ENCRYPTION ENGINE</text>
          <text x="450" y="440" fill="var(--anim-primary)" fontSize="11" fontWeight="700" textAnchor="middle" letterSpacing="2" className="text-encrypting" filter="url(#pay-glow)">ENCRYPTING PAYLOAD...</text>
          <circle cx="450" cy="300" r="40" fill="none" stroke="var(--anim-primary)" strokeWidth="2" className="enc-burst-ring" />
          <g className="enc-burst-particles">
            <rect x="420" y="270" width="6" height="6" fill="var(--anim-primary)" />
            <rect x="474" y="270" width="6" height="6" fill="var(--anim-primary)" />
            <rect x="420" y="324" width="6" height="6" fill="var(--anim-primary)" />
            <rect x="474" y="324" width="6" height="6" fill="var(--anim-primary)" />
          </g>
        </g>

        <g id="node-contract">
          <polygon points="750,220 820,260 820,340 750,380 680,340 680,260" fill="var(--anim-bg)" stroke="var(--anim-muted)" strokeWidth="1.5" className="contract-hex" />
          <polygon points="750,240 795,265 795,335 750,360 705,335 705,265" fill="none" stroke="var(--anim-muted)" strokeWidth="1" opacity="0.3" />
          <circle cx="750" cy="300" r="35" fill="none" stroke="var(--anim-muted)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
          <text x="750" y="420" fill="var(--anim-muted)" fontSize="12" fontWeight="500" textAnchor="middle" letterSpacing="1">FHE SMART CONTRACT</text>
          <text x="750" y="440" fill="var(--anim-primary)" fontSize="11" fontWeight="700" textAnchor="middle" letterSpacing="2" className="text-verifying" filter="url(#pay-glow)">EXECUTING PRIVATELY...</text>
          <path d="M 732 300 L 744 312 L 768 288" fill="none" stroke="var(--anim-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="50" className="tick-mark" filter="url(#pay-glow)" />
        </g>

        <g id="observer">
          <polygon points="750,130 650,260 850,260" fill="url(#pay-beamGradient)" className="observer-beam" />
          <polygon points="750,90 775,115 750,140 725,115" fill="var(--anim-bg)" stroke="var(--anim-muted)" strokeWidth="2" />
          <circle cx="750" cy="115" r="5" fill="var(--anim-light)" />
          <text x="750" y="70" fill="var(--anim-muted)" fontSize="10" fontWeight="500" textAnchor="middle" letterSpacing="1" opacity="0.6">PUBLIC NETWORK</text>
          <g className="scramble-text mono">
            <text x="650" y="230" fill="var(--anim-muted)" fontSize="16" fontWeight="700">0x9A4F</text>
            <text x="790" y="240" fill="var(--anim-muted)" fontSize="14">enc(X)</text>
            <text x="660" y="290" fill="var(--anim-muted)" fontSize="18">***#@!</text>
            <text x="810" y="280" fill="var(--anim-muted)" fontSize="14">01101</text>
            <text x="720" y="210" fill="var(--anim-muted)" fontSize="12">[LOCKED]</text>
          </g>
        </g>

        <g id="node-employee">
          <rect x="950" y="140" width="200" height="260" rx="12" fill="var(--anim-bg)" stroke="var(--anim-muted)" strokeWidth="1.5" />
          <line x1="950" y1="180" x2="1150" y2="180" stroke="var(--anim-muted)" strokeWidth="1.5" />
          <text x="1050" y="166" fill="var(--anim-light)" fontSize="12" fontWeight="600" textAnchor="middle" letterSpacing="2">EMPLOYEE</text>
          <circle cx="1050" cy="220" r="16" fill="none" stroke="var(--anim-light)" strokeWidth="2" />
          <path d="M 1020 270 Q 1050 240 1080 270" fill="none" stroke="var(--anim-light)" strokeWidth="2" strokeLinecap="round" />
          <rect x="1038" y="330" width="24" height="18" rx="4" fill="var(--anim-muted)" className="emp-lock-base" />
          <path d="M 1043 330 V 322 A 7 7 0 0 1 1057 322 V 330" fill="none" stroke="var(--anim-muted)" strokeWidth="2.5" className="emp-lock-top" />
          <text x="1050" y="380" fill="var(--anim-primary)" fontSize="20" fontWeight="700" textAnchor="middle" className="mono emp-amount" filter="url(#pay-glow)">+5,000 USDC</text>
          <text x="1050" y="420" fill="var(--anim-primary)" fontSize="11" fontWeight="700" textAnchor="middle" letterSpacing="2" className="text-secured" filter="url(#pay-glow)">FUNDS SECURED</text>
        </g>

        <g className="payload-container">
          <g className="token-raw">
            <circle cx="0" cy="0" r="22" fill="var(--anim-light)" />
            <text x="0" y="6" fill="var(--anim-bg)" fontSize="18" fontWeight="700" textAnchor="middle" className="mono">$</text>
          </g>
          <g className="token-enc" filter="url(#pay-glow)">
            <rect x="-12" y="-12" width="10" height="10" rx="2" fill="var(--anim-primary)" />
            <rect x="2" y="-12" width="10" height="10" rx="2" fill="var(--anim-primary)" />
            <rect x="-12" y="2" width="10" height="10" rx="2" fill="var(--anim-primary)" />
            <rect x="2" y="2" width="10" height="10" rx="2" fill="var(--anim-primary)" />
          </g>
          <g className="token-dec" filter="url(#pay-glow)">
            <circle cx="0" cy="0" r="22" fill="var(--anim-primary)" />
            <text x="0" y="6" fill="var(--anim-bg)" fontSize="18" fontWeight="700" textAnchor="middle" className="mono">$</text>
          </g>
        </g>

        <g className="cursor">
          <path d="M0,0 L20,20 L11,22 L0,32 Z" fill="var(--anim-light)" stroke="var(--anim-bg)" strokeWidth="1.5" filter="drop-shadow(2px 4px 6px rgba(0,0,0,0.5))" />
        </g>
      </svg>
    </div>
  );
}

export default PayrollExecutionAnimation;
