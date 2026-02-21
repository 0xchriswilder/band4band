import React from 'react';

/**
 * Encrypted Payroll Payment Flow animation: Employer → Smart Contract → Employee.
 * Uses codebase theme: --color-primary (orange), --color-bg-dark, --color-success, etc.
 */
export function PayrollExecutionAnimation() {
  return (
    <div className="payroll-execution-animation w-full max-w-full overflow-hidden rounded-2xl bg-[var(--color-bg-dark)] [color:var(--color-text-on-dark)]">
      <style>{`
        .payroll-execution-animation {
          --anim-primary: var(--color-primary);
          --anim-primary-light: var(--color-primary-light);
          --anim-primary-dark: var(--color-primary-dark);
          --anim-bg: var(--color-bg-dark);
          --anim-surface: #0f0d09;
          --anim-surface-2: #2a1e12;
          --anim-muted: var(--color-text-tertiary);
          --anim-muted-2: #8a6435;
          --anim-success: var(--color-success);
          --anim-error: var(--color-error);
          --anim-light: #f8f7f5;
        }
        .payroll-execution-animation svg {
          width: 100%;
          max-width: 100%;
          height: auto;
          display: block;
        }

        @keyframes pay-payload1-move {
          0%, 10% { transform: translate(250px, 300px) scale(0); opacity: 0; }
          12%, 15% { transform: translate(250px, 300px) scale(1); opacity: 1; }
          30% { transform: translate(490px, 300px) scale(1); opacity: 1; }
          32%, 100% { transform: translate(490px, 300px) scale(0); opacity: 0; }
        }
        .payroll-execution-animation .payload1 {
          animation: pay-payload1-move 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes pay-shield-pulse {
          0%, 28% { stroke: var(--anim-muted); filter: drop-shadow(0 0 5px rgba(255,140,0,0.2)); fill: var(--anim-surface-2); }
          32%, 55% { stroke: var(--anim-primary); filter: drop-shadow(0 0 20px rgba(255,140,0,0.5)); fill: var(--anim-surface); }
          58%, 100% { stroke: var(--anim-muted); filter: drop-shadow(0 0 5px rgba(255,140,0,0.2)); fill: var(--anim-surface-2); }
        }
        .payroll-execution-animation .center-shield { animation: pay-shield-pulse 8s infinite; }

        @keyframes pay-shackle-close {
          0%, 28% { transform: translateY(-8px); stroke: var(--anim-muted); }
          32%, 55% { transform: translateY(0px); stroke: var(--anim-primary); }
          58%, 100% { transform: translateY(-8px); stroke: var(--anim-muted); }
        }
        .payroll-execution-animation .center-lock-shackle { animation: pay-shackle-close 8s infinite; }

        @keyframes pay-process-nodes {
          0%, 30% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          35%, 50% { opacity: 1; transform: scale(1) rotate(45deg); }
          55%, 100% { opacity: 0; transform: scale(1.5) rotate(90deg); }
        }
        .payroll-execution-animation .processing-nodes {
          animation: pay-process-nodes 8s infinite;
          transform-origin: 600px 300px;
        }

        @keyframes pay-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .payroll-execution-animation .spin-slow { transform-origin: 600px 300px; animation: pay-spin 18s linear infinite; }
        .payroll-execution-animation .spin-reverse { transform-origin: 600px 300px; animation: pay-spin 12s linear infinite reverse; }

        @keyframes pay-payload2-move {
          0%, 53% { transform: translate(710px, 300px) scale(0); opacity: 0; }
          55%, 58% { transform: translate(710px, 300px) scale(1); opacity: 1; }
          75% { transform: translate(950px, 300px) scale(1); opacity: 1; }
          77%, 100% { transform: translate(950px, 300px) scale(0); opacity: 0; }
        }
        .payroll-execution-animation .payload2 {
          animation: pay-payload2-move 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes pay-snooper-beam {
          0%, 61% { stroke-dashoffset: 140; opacity: 0; }
          64% { stroke-dashoffset: 0; opacity: 0.8; stroke: var(--anim-error); }
          65%, 68% { stroke-dashoffset: 0; opacity: 1; stroke: var(--anim-error); filter: drop-shadow(0 0 5px rgba(239,68,68,0.8)); }
          70%, 100% { stroke-dashoffset: -140; opacity: 0; }
        }
        .payroll-execution-animation .snooper-beam { stroke-dasharray: 140; animation: pay-snooper-beam 8s infinite; }

        @keyframes pay-snooper-eye-glow {
          0%, 61% { stroke: var(--anim-muted-2); filter: none; }
          64%, 68% { stroke: var(--anim-error); filter: drop-shadow(0 0 5px var(--anim-error)); }
          70%, 100% { stroke: var(--anim-muted-2); filter: none; }
        }
        .payroll-execution-animation .snooper-eye { animation: pay-snooper-eye-glow 8s infinite; }

        @keyframes pay-access-denied {
          0%, 64% { transform: scale(0.5); opacity: 0; }
          65% { transform: scale(1.1); opacity: 1; }
          66%, 68% { transform: scale(1); opacity: 1; }
          70%, 100% { transform: scale(1.5); opacity: 0; }
        }
        .payroll-execution-animation .access-denied-wrapper { transform: translate(830px, 300px); }
        .payroll-execution-animation .access-denied { animation: pay-access-denied 8s infinite; transform-origin: 0 0; }

        @keyframes pay-decrypted-coin {
          0%, 75% { transform: translate(960px, 290px) scale(0); opacity: 0; }
          78%, 80% { transform: translate(960px, 230px) scale(1.2); opacity: 1; }
          82%, 90% { transform: translate(960px, 230px) scale(1); opacity: 1; filter: drop-shadow(0 0 15px rgba(255, 140, 0, 0.6)); }
          95%, 100% { transform: translate(960px, 220px) scale(0); opacity: 0; }
        }
        .payroll-execution-animation .decrypted-payload { animation: pay-decrypted-coin 8s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite; }

        @keyframes pay-phone-screen-glow {
          0%, 75% { fill: var(--anim-surface); }
          78%, 90% { fill: var(--anim-success); filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.4)); }
          95%, 100% { fill: var(--anim-surface); }
        }
        .payroll-execution-animation .phone-screen { animation: pay-phone-screen-glow 8s infinite; }

        @keyframes pay-phone-checkmark {
          0%, 78% { stroke-dasharray: 24; stroke-dashoffset: 24; opacity: 0; }
          80%, 90% { stroke-dashoffset: 0; opacity: 1; }
          95%, 100% { stroke-dashoffset: 24; opacity: 0; }
        }
        .payroll-execution-animation .phone-checkmark { animation: pay-phone-checkmark 8s infinite; }

        @keyframes pay-phone-lock {
          0%, 75% { transform: translateY(0); }
          78%, 90% { transform: translateY(-4px); }
          95%, 100% { transform: translateY(0); }
        }
        .payroll-execution-animation .phone-lock-shackle { animation: pay-phone-lock 8s infinite; }

        @keyframes pay-approve-btn {
          0%, 5% { fill: var(--anim-muted-2); }
          8%, 12% { fill: var(--anim-success); filter: drop-shadow(0 0 8px rgba(16,185,129,0.8)); }
          15%, 100% { fill: var(--anim-muted-2); filter: none; }
        }
        .payroll-execution-animation .approve-btn { animation: pay-approve-btn 8s infinite; }

        @keyframes pay-screen-content {
          0%, 5% { opacity: 0.5; width: 10px; }
          8%, 12% { opacity: 1; width: 25px; }
          15%, 100% { opacity: 0.5; width: 10px; }
        }
        .payroll-execution-animation .screen-content { animation: pay-screen-content 8s infinite; }

        @keyframes pay-flow-right { to { stroke-dashoffset: -20; } }
        .payroll-execution-animation .flow-line { animation: pay-flow-right 1s linear infinite; }
      `}</style>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Confidential Payroll Payment Flow"
      >
        <defs>
          <radialGradient id="pay-bg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--anim-surface-2)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--anim-bg)" stopOpacity="1" />
          </radialGradient>
          <filter id="pay-glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="pay-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="pay-glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <pattern id="pay-dot-grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="var(--anim-surface-2)" opacity="0.6" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#pay-bg-glow)" />
        <rect width="100%" height="100%" fill="url(#pay-dot-grid)" />

        {/* Clear Data Path (Left) */}
        <path d="M 280 300 L 480 300" stroke="var(--anim-surface-2)" strokeWidth="12" strokeLinecap="round" />
        <path d="M 280 300 L 480 300" stroke="var(--anim-surface)" strokeWidth="8" strokeLinecap="round" />
        <path d="M 280 300 L 480 300" stroke="var(--anim-primary)" strokeWidth="2" strokeDasharray="10 10" className="flow-line" />

        {/* Encrypted Data Path (Right) */}
        <path d="M 720 300 L 920 300" stroke="var(--anim-surface-2)" strokeWidth="12" strokeLinecap="round" />
        <path d="M 720 300 L 920 300" stroke="var(--anim-surface)" strokeWidth="8" strokeLinecap="round" />
        <path d="M 720 300 L 920 300" stroke="var(--anim-primary)" strokeWidth="2" strokeDasharray="10 10" className="flow-line" />

        {/* 1. Employer Node (Left) */}
        <g transform="translate(200, 300)">
          <circle cx="0" cy="0" r="80" fill="var(--anim-surface)" stroke="var(--anim-surface-2)" strokeWidth="4" />
          <circle cx="0" cy="0" r="70" fill="none" stroke="var(--anim-muted-2)" strokeWidth="1" strokeDasharray="4 6" />
          <circle cx="-25" cy="-15" r="16" fill="var(--anim-muted-2)" />
          <path d="M -50 35 C -50 -5, 0 -5, 0 35 Z" fill="var(--anim-muted-2)" />
          <line x1="-55" y1="35" x2="55" y2="35" stroke="var(--anim-muted-2)" strokeWidth="4" strokeLinecap="round" />
          <rect x="5" y="30" width="40" height="5" rx="2" fill="var(--anim-muted)" />
          <path d="M 10 30 L 22 -10 L 48 -10 L 45 30 Z" fill="var(--anim-muted)" />
          <rect x="25" y="-45" width="45" height="28" rx="4" fill="var(--anim-surface-2)" stroke="var(--anim-muted-2)" strokeWidth="1.5" />
          <rect x="30" y="-38" width="10" height="4" rx="2" fill="var(--anim-primary)" className="screen-content" />
          <rect x="30" y="-30" width="15" height="4" rx="2" fill="var(--anim-muted-2)" />
          <rect x="30" y="-22" width="35" height="8" rx="3" className="approve-btn" />
        </g>
        <text x="200" y="420" fontSize="14" fontWeight="600" fill="var(--anim-muted)" letterSpacing="2" textAnchor="middle">EMPLOYER</text>
        <text x="200" y="440" fontSize="12" fontWeight="400" fill="var(--anim-muted-2)" textAnchor="middle">Initiates Payroll</text>

        {/* 2. Smart Contract / Encryption Hub (Center) */}
        <g transform="translate(600, 300)">
          <circle cx="0" cy="0" r="90" fill="var(--anim-primary)" opacity="0.05" filter="url(#pay-glow-cyan)" />
          <polygon points="0,-120 103.9,-60 103.9,60 0,120 -103.9,60 -103.9,-60" fill="var(--anim-surface)" stroke="var(--anim-surface-2)" strokeWidth="4" />
          <polygon className="spin-slow" points="0,-140 121.2,-70 121.2,70 0,140 -121.2,70 -121.2,-70" fill="none" stroke="var(--anim-primary-light)" strokeWidth="1" strokeDasharray="10 20" opacity="0.4" />
          <polygon className="spin-reverse" points="0,-100 86.6,-50 86.6,50 0,100 -86.6,50 -86.6,-50" fill="none" stroke="var(--anim-primary)" strokeWidth="2" strokeDasharray="15 15" opacity="0.6" />
          <path d="M 0 -50 L 45 -25 V 25 C 45 60 20 85 0 95 C -20 85 -45 60 -45 25 V -25 Z" className="center-shield" strokeWidth="3" />
          <g transform="translate(0, 15)">
            <rect x="-18" y="-5" width="36" height="26" rx="4" fill="var(--anim-surface)" stroke="var(--anim-muted-2)" strokeWidth="2" />
            <path d="M -10 -5 V -16 A 10 10 0 0 1 10 -16 V -5" fill="none" strokeWidth="3" className="center-lock-shackle" stroke="var(--anim-muted)" />
            <circle cx="0" cy="8" r="3.5" fill="var(--anim-muted)" />
            <line x1="0" y1="11" x2="0" y2="16" stroke="var(--anim-muted)" strokeWidth="2" />
          </g>
          <g className="processing-nodes">
            <circle cx="-25" cy="-25" r="3" fill="var(--anim-primary-light)" filter="url(#pay-glow-cyan)" />
            <circle cx="25" cy="-15" r="4" fill="var(--anim-primary)" />
            <circle cx="-15" cy="40" r="2.5" fill="var(--anim-primary-light)" />
            <circle cx="30" cy="25" r="2" fill="var(--anim-primary)" />
            <text x="0" y="-20" fontFamily="monospace" fontSize="10" fill="var(--anim-primary)" textAnchor="middle" fontWeight="bold">***</text>
          </g>
        </g>
        <rect x="500" y="115" width="200" height="30" rx="15" fill="var(--anim-surface-2)" stroke="var(--anim-primary)" strokeWidth="1.5" />
        <text x="600" y="135" fontSize="12" fontWeight="600" fill="var(--anim-primary-light)" letterSpacing="1.5" textAnchor="middle">ENCRYPTED PAYROLL</text>
        <text x="600" y="455" fontSize="12" fontWeight="400" fill="var(--anim-muted-2)" textAnchor="middle">Smart Contract Execution</text>

        {/* 3. Employee Node (Right) */}
        <g transform="translate(1000, 300)">
          <circle cx="0" cy="0" r="80" fill="var(--anim-surface)" stroke="var(--anim-surface-2)" strokeWidth="4" />
          <circle cx="0" cy="0" r="70" fill="none" stroke="var(--anim-muted-2)" strokeWidth="1" strokeDasharray="4 6" />
          <circle cx="20" cy="-20" r="16" fill="var(--anim-muted-2)" />
          <path d="M -5 35 C -5 -5, 45 -5, 45 35 Z" fill="var(--anim-muted-2)" />
          <path d="M 25 50 C 0 30, -20 30, -35 15" fill="none" stroke="var(--anim-muted-2)" strokeWidth="10" strokeLinecap="round" />
          <rect x="-50" y="-15" width="30" height="50" rx="5" fill="var(--anim-surface-2)" stroke="var(--anim-muted)" strokeWidth="2" />
          <rect x="-47" y="-12" width="24" height="44" rx="3" className="phone-screen" />
          <g transform="translate(-35, 10)">
            <path d="M -5 -2 V -6 A 5 5 0 0 1 5 -6 V -2" fill="none" stroke="var(--anim-muted)" strokeWidth="1.5" className="phone-lock-shackle" />
            <rect x="-6" y="-2" width="12" height="10" rx="2" fill="var(--anim-muted)" />
            <path d="M -8 18 L -3 23 L 6 12" fill="none" stroke="var(--anim-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="phone-checkmark" strokeDasharray="24" strokeDashoffset="24" />
          </g>
        </g>
        <text x="1000" y="420" fontSize="14" fontWeight="600" fill="var(--anim-muted)" letterSpacing="2" textAnchor="middle">EMPLOYEE</text>
        <text x="1000" y="440" fontSize="12" fontWeight="400" fill="var(--anim-muted-2)" textAnchor="middle">Receives Funds Securely</text>

        {/* 4. Snooper / Public Ledger */}
        <g transform="translate(830, 480)">
          <path d="M 0 -15 L 0 -170" fill="none" strokeWidth="2" strokeDasharray="8 8" className="snooper-beam" stroke="var(--anim-error)" />
          <path d="M -22 0 Q 0 -18 22 0 Q 0 18 -22 0 Z" fill="var(--anim-surface)" strokeWidth="2" className="snooper-eye" />
          <circle cx="0" cy="0" r="7" fill="var(--anim-surface-2)" stroke="var(--anim-muted)" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="2" fill="var(--anim-primary)" />
          <text x="0" y="35" fontSize="11" fontWeight="600" fill="var(--anim-muted)" letterSpacing="1" textAnchor="middle">PUBLIC LEDGER</text>
          <text x="0" y="50" fontSize="10" fontWeight="400" fill="var(--anim-muted-2)" textAnchor="middle">Cannot see transaction data</text>
        </g>

        {/* Payload 1: Clear Payment Token */}
        <g className="payload1">
          <circle cx="0" cy="0" r="16" fill="var(--anim-primary)" filter="url(#pay-glow-amber)" />
          <circle cx="0" cy="0" r="12" fill="var(--anim-primary-dark)" stroke="var(--anim-primary-light)" strokeWidth="1" />
          <text x="0" y="5" fontFamily="monospace" fontSize="14" fill="var(--anim-light)" textAnchor="middle" fontWeight="bold">$</text>
        </g>

        {/* Payload 2: Encrypted Data Packet */}
        <g className="payload2">
          <rect x="-16" y="-16" width="32" height="32" rx="6" fill="var(--anim-surface-2)" stroke="var(--anim-primary)" strokeWidth="2" filter="url(#pay-glow-cyan)" />
          <path d="M -8 -6 L -2 -6 M 2 -6 L 8 -6 M -8 0 L 0 0 M 4 0 L 8 0 M -8 6 L 2 6 M 6 6 L 8 6" stroke="var(--anim-primary)" strokeWidth="2" strokeLinecap="round" />
          <rect x="8" y="8" width="10" height="8" rx="2" fill="var(--anim-primary)" />
          <path d="M 10 8 V 5 A 3 3 0 0 1 16 5 V 8" fill="none" stroke="var(--anim-primary)" strokeWidth="2" />
        </g>

        {/* Decrypted Result at Employee */}
        <g className="decrypted-payload">
          <circle cx="0" cy="0" r="20" fill="var(--anim-primary)" filter="url(#pay-glow-amber)" />
          <circle cx="0" cy="0" r="15" fill="var(--anim-primary-dark)" stroke="var(--anim-primary-light)" strokeWidth="1.5" />
          <text x="0" y="6" fontFamily="monospace" fontSize="18" fill="var(--anim-light)" textAnchor="middle" fontWeight="bold">$</text>
          <rect x="-30" y="25" width="60" height="16" rx="8" fill="var(--anim-success)" />
          <text x="0" y="36" fontSize="10" fontWeight="bold" fill="var(--anim-light)" textAnchor="middle">+ SALARY</text>
        </g>

        {/* Access Denied Popup */}
        <g className="access-denied-wrapper">
          <g className="access-denied">
            <circle cx="0" cy="0" r="24" fill="var(--anim-error)" opacity="0.15" />
            <circle cx="0" cy="0" r="16" fill="var(--anim-surface)" stroke="var(--anim-error)" strokeWidth="2" filter="url(#pay-glow-red)" />
            <path d="M -10 0 Q 0 -8 10 0 Q 0 8 -10 0 Z" fill="none" stroke="var(--anim-error)" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="3" fill="var(--anim-error)" />
            <line x1="-12" y1="-10" x2="12" y2="10" stroke="var(--anim-error)" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="-35" y="-35" width="70" height="16" rx="4" fill="var(--color-error-bg)" stroke="var(--anim-error)" strokeWidth="1" />
            <text x="0" y="-24" fontSize="9" fontWeight="bold" fill="var(--anim-error)" textAnchor="middle" letterSpacing="1">ZERO-KNOWLEDGE</text>
          </g>
        </g>
      </svg>
    </div>
  );
}

export default PayrollExecutionAnimation;
