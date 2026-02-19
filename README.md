<img width="1317" height="609" alt="image" src="https://github.com/user-attachments/assets/4b0fc5b3-df72-4722-811a-083b7489f26f" />

# Confidential Payroll dApp

A functioning **confidential payroll dApp** where a company can pay employees on-chain while keeping individual salaries and transactions private using the **Zama Protocol** and **ERC-7984** confidential tokens.


<img width="1156" height="585" alt="image" src="https://github.com/user-attachments/assets/cc1c237c-1964-4dcf-831b-087d31c2dfcb" />

<img width="1380" height="639" alt="image" src="https://github.com/user-attachments/assets/119e82b0-6f9d-4d6e-9930-9b5bc7f53f9f" />
---

## Bounty alignment

### What the dApp demonstrates

- **Employer adds employees and sets encrypted salaries**  
  Employers onboard employees with FHE-encrypted salary amounts. Salaries are never stored or transmitted in plaintext on-chain.

- **Salaries remain confidential**  
  Only the employer and the respective employee can view a given salary. On-chain state is encrypted (`euint64`); decryption is performed off-chain via the Zama relayer with proper authorization (EIP-712 signatures).

- **Employer executes payroll confidentially**  
  The employer runs payroll via `batchPaySalaries()` (or single `paySalary()`). Amounts are encrypted before submission; confidential transfers move cUSDC (confidential USDC) from employer to employees without revealing amounts on-chain.

- **Employees verify and decrypt their own payment**  
  Employees see their payment history (transaction hashes, timestamps) and can click **Decrypt** to reveal their payment amount. Decryption is authorized by the employee’s wallet signature and performed by the Zama relayer.

- **Additional features for usability and real-world applicability**  
  - Company profile (name, logo, industry, website)  
  - Employee display names and emails (stored off-chain in Supabase)  
  - Payment frequency (monthly / bi-weekly / weekly)  
  - CSV/XLSX bulk import with **preview-before-onboard**  
  - **E-sign employment contracts (DocuSign):** employers connect their own DocuSign account and send agreements to employees; employees sign before onboarding — **bring your own DocuSign** (no shared sender; each company uses their account via OAuth).  
  - Transaction history (employer + employee views) with Payroll Volume and Payment Distribution charts  
  - Invoicing: employees submit invoices; employers mark them paid  
  - Export payment history to CSV  
  - Optional unwrap of cUSDC back to USDC  


<img width="1197" height="474" alt="image" src="https://github.com/user-attachments/assets/3c8a1922-8fad-40fb-bbcd-7c44f622af34" />
---

## Additional features (usability & real-world applicability)

All of the following are implemented and documented here for completeness.

| Feature | Description | Where to find it |
|--------|--------------|------------------|
| **Company profile** | Name, logo, industry, website. Stored in Supabase (`employer_profiles`); logo in storage bucket. | Employer dashboard: company card / settings; shown in invoices and header. |
| **Employee display names and emails** | Stored off-chain in Supabase; editable per employee. | Sidebar, employee table, profile modal; pre-filled when editing. |
| **Payment frequency** | Per employee: monthly / bi-weekly / weekly. Used for invoicing and display. | Employer dashboard: employee row and edit profile modal. |
| **CSV/XLSX bulk import** | Upload spreadsheet (address, salary, name, email, payment_frequency); **preview table** before confirming onboard. | Employer dashboard: “Import from spreadsheet” → choose file → preview → Onboard. |
| **Transaction history** | Employer and employee views of payments. **Payroll Volume** chart (e.g. by month) and **Payment Distribution** chart. | **Activity** page; filter by payroll / role. |
| **Invoicing** | Employees submit invoices (per month); employers see status and mark them paid. | Employee: Invoices page; Employer: dashboard invoice column + Invoices page. |
| **E-sign employment contracts (DocuSign)** | Employers connect DocuSign (OAuth), send employment agreements to employees; employees sign before onboarding. **Bring your own DocuSign** — each employer connects their own account (sandbox or production); no shared sender. | **Contracts** page: employer connects DocuSign, sends from employee list; employee sees "My contracts" and opens e-sign page to sign. E-signatures powered by DocuSign. |
| **Export payment history to CSV** | Download payment history as CSV. | Activity page (and employer/employee history views): “Export CSV” (or equivalent). |
| **Unwrap cUSDC → USDC** | Optional conversion of confidential balance back to plain USDC. | Employee dashboard: “Unwrap” section; enter amount and confirm. |

---

## E-sign: bring your own DocuSign

Employment contracts are sent and signed via **DocuSign**. The app does **not** use a single shared DocuSign account. Each employer connects **their own** DocuSign (sandbox for testing or production for go-live) via OAuth. Contract emails and branding come from the employer's account. Companies that already use DocuSign can connect their existing account and start sending contracts from the dApp. See **Contracts** in the app and `docs/E-SIGN-IMPLEMENTATION-PLAN.md` for implementation details.

---

## Roadmap (coming soon)

The app sidebar includes a **Coming soon** section with preview pages for planned features. These are visible to users and judges so the direction of the product is clear. None of the roadmap items below require smart contract changes for their first version (e-sign, time tracking, PTO, and tax estimates are off-chain or display-only).

| Sidebar item | Route | Description |
|--------------|--------|-------------|
| **Contracts (e-sign)** | `/roadmap/contracts` | E-sign employment contracts before onboarding (e.g. DocuSign sandbox or Inkless). Contracts signed off-chain; then employer onboard on-chain as today. |
| **Time tracking** | `/roadmap/time-tracking` | Timesheets and approval workflow (Supabase); optional link to payroll run. No contract change. |
| **Tax estimates** | `/roadmap/tax` | Display estimated withholdings; full tax filing would be a later phase. No contract change. |
| **Benefits & deductions** | `/roadmap/benefits` | Preview of benefits/deductions UX; full automation would need contract support for split payments. |
| **Bank payouts** | `/roadmap/bank-payouts` | Withdraw cUSDC/USDC to bank via partner off-ramp (third-party; no contract change). |

Each roadmap page shows a short description and a "Planned" bullet list. E-sign, time tracking, PTO, and tax estimate (display-only) are the easier no-contract additions; tax filing, benefits automation, and bank payouts depend on external services or future contract changes.

---

## Requirements (bounty checklist)

| Requirement | Status |
|------------|--------|
| Functioning dApp demo using Zama Protocol and ERC-7984 tokens | ✅ |
| Real-world payroll use case with FHE | ✅ |
| Smart contracts + frontend implementation | ✅ |
| Clear, well-structured project documentation | ✅ (this README + `ARCHITECTURE.md`) |
| 2-minute video demo pitching the project | 📹 (to be submitted) |

---

## Judging criteria (how this project addresses them)

- **Functionality**  
  End-to-end flow works: employer registers payroll, wraps USDC → cUSDC, sets operator, onboard employees with encrypted salaries, runs payroll (encrypted amounts), employees see payments and decrypt their own amounts. Batch onboard, edit salary, remove employee, and decrypt balance/payment are implemented and tested.

- **Code quality**  
  Solidity contracts use custom errors, modifiers, and NatSpec; Hardhat tests cover core flows. Frontend is TypeScript/React with structured hooks and shared config. Indexer and Supabase schema are documented.

- **UX / demo quality**  
  Separate Employer and Employee dashboards, onboarding wizard, import preview modal, transaction history with charts, decrypt-on-demand with clear states. Demo video will walk through employer and employee flows in under 2 minutes.

- **Real-world viability**  
  Per-employer payroll contracts, confidential token (wrap/unwrap), optional company profile and employee metadata, invoicing, and CSV export support real payroll and accounting workflows.

---

## Project architecture

### High-level diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CONFIDENTIAL PAYROLL dAPP                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   FRONTEND (React + Vite)                                                        │
│   • Employer: register payroll, wrap USDC, onboard, run payroll, invoices        │
│   • Employee: view payments, decrypt, submit invoices, unwrap cUSDC              │
│   • Activity: transaction history (employer + employee), charts, CSV export      │
│   • Company profile, employee names/emails (Supabase)                           │
│   • Encryption/decryption via @zama-fhe/relayer-sdk + wagmi/viem                │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│   INDEXER (Node + Ethers + Express)                                              │
│   • Listens to PayrollFactory + Payroll events (PayrollCreated, Employee*,       │
│     SalaryPaid, etc.)                                                            │
│   • Writes payrolls, employees, salary_payments, payroll_runs → Supabase        │
│   • Frontend reads from Supabase for history and payroll discovery              │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│   SUPABASE                                                                       │
│   • payrolls, employees, salary_payments, salary_updates, payroll_runs            │
│   • employer_profiles, employee_display_names, employee_invoices                 │
│   • Storage: employer logos (public bucket)                                      │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│   SMART CONTRACTS (Solidity, Hardhat, Sepolia)                                  │
│   • MockUSDC (test) / USDC → ConfidentialPayrollToken (ERC-7984 wrapper)         │
│   • PayrollFactory → deploys one Payroll per employer                           │
│   • Payroll: onboard, edit, remove, paySalary, batchPaySalaries (FHE + ACL)      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Repository layout

```
zama-confidential-payroll-dapp/
├── README.md                 # This file
├── ARCHITECTURE.md            # Detailed contract & data flow
├── contracts/                # Hardhat + Solidity
│   ├── contracts/
│   │   ├── PayrollFactory.sol
│   │   ├── Payroll.sol
│   │   ├── ConfidentialPayrollToken.sol
│   │   └── test/MockUSDC.sol
│   ├── scripts/deploy.ts
│   ├── test/ConfidentialPayroll.test.ts
│   └── hardhat.config.ts
├── frontend/                 # React + Vite + wagmi + relayer-sdk
│   ├── src/
│   │   ├── pages/            # EmployerDashboard, EmployeeDashboard, Activity, etc.
│   │   ├── hooks/             # usePayrollEmployer, useFhevmEncrypt, useFhevmDecrypt, usePayrollHistory
│   │   ├── lib/contracts.ts   # ABIs, addresses, TOKEN_CONFIG
│   │   └── providers/
│   └── package.json
├── indexer/                  # Event indexer → Supabase
│   ├── indexer.ts
│   ├── server.ts
│   ├── supabase.ts
│   └── abis/
├── supabase/
│   └── migrations/           # 001_create_tables.sql, employer_profiles, employee_display_names, etc.
└── test_employees.csv        # Sample CSV for bulk import (address, salary, name, email, payment_frequency)
```

---

## Smart contract architecture

### Deployment order

1. **MockUSDC** (or real USDC) – ERC-20, 6 decimals  
2. **ConfidentialPayrollToken** – ERC-7984 wrapper; wraps USDC 1:1 into confidential cUSDC (e.g. cUSDCP)  
3. **PayrollFactory** – holds confidential token address; deploys one **Payroll** per employer via `registerEmployer()`

### Contract roles

| Contract | Role |
|----------|------|
| **MockUSDC** | Plain ERC-20 for testing. Replace with real USDC on mainnet. |
| **ConfidentialPayrollToken** | ERC-7984 (OpenZeppelin + Zama). `wrap(recipient, amount)`, `confidentialTransferFrom`, `unwrap`. Balances and transfers are encrypted on-chain. |
| **PayrollFactory** | `registerEmployer()` deploys `Payroll(confidentialToken, msg.sender)` and stores `employerPayroll[employer]`. Emits `PayrollCreated`. |
| **Payroll** | One per employer. Holds `employer`, `confidentialToken`, `whitelisted[employee]`, and per-employee encrypted `salaryHistory`. Calls `FHE.fromExternal` for encrypted inputs and ACLs so only employer, employee, and token can use handles. |

### Payroll.sol – main actions

- **onboardEmployee(employee, encryptedSalary, inputProof, signature)**  
  Sets `whitelisted[employee] = true`, converts external ciphertext to `euint64`, sets ACL, emits `EmployeeOnboarded`.

- **batchOnboardEmployees(employees, encryptedSalaries, inputProofs, signatures)**  
  Same as above for multiple employees in one tx.

- **editEmployee(employee, newEncryptedSalary, newInputProof, newSignature)**  
  Appends new encrypted salary to `salaryHistory[employee]`, emits `EmployeeUpdated`.

- **removeEmployee(employee)**  
  Sets `whitelisted[employee] = false`, emits `EmployeeRemoved`.

- **paySalary(employee, salaryEncrypted, inputProof)**  
  Converts to `euint64`, sets ACL, calls `confidentialToken.confidentialTransferFrom(employer, employee, salary)`, appends to history, emits `SalaryPaid`.

- **batchPaySalaries(employees, encryptedSalaries, inputProofs)**  
  Same as `paySalary` for multiple employees in one tx.

Encryption context for onboarding and pay uses the **Payroll** contract address; the employer is the signer/owner of the encrypted value. Only the employer and the corresponding employee (via Zama relayer + EIP-712) can decrypt.

---

## Data flow (summary)

| Step | Who | Contract / System | Action |
|------|-----|-------------------|--------|
| Register | Employer | PayrollFactory | `registerEmployer()` → new Payroll |
| Wrap | Employer | ConfidentialPayrollToken | `wrap()` USDC → cUSDC |
| Set operator | Employer | ConfidentialPayrollToken | `setOperator(payroll)` so Payroll can move employer’s cUSDC |
| Onboard | Employer | Payroll | `onboardEmployee()` or `batchOnboardEmployees()` with encrypted salary |
| Pay | Employer | Payroll | `paySalary()` or `batchPaySalaries()` → confidentialTransferFrom |
| Decrypt | Employee | Zama relayer (SDK) | `userDecrypt` with employee signature → see amount |
| Unwrap | Employee | ConfidentialPayrollToken | `unwrap()` cUSDC → USDC (optional) |

Indexer subscribes to Factory + Payroll events and fills Supabase (`payrolls`, `employees`, `salary_payments`, etc.); frontend uses this for history and discovery.

---

## Tech stack

- **Contracts:** Solidity ^0.8.27, Hardhat, @fhevm/solidity, @openzeppelin/confidential-contracts (ERC-7984), Zama Ethereum config  
- **Frontend:** React 19, Vite, TypeScript, wagmi, viem, RainbowKit, @zama-fhe/relayer-sdk, Supabase, Tailwind CSS, Recharts, Framer Motion  
- **Backend / DB:** Supabase (Postgres + Storage + RLS)  
- **Indexer:** Node, ethers.js, Express (optional API), Supabase client  
- **Network:** Sepolia (configurable via env)

---

## Getting started

### Prerequisites

- Node.js >= 20  
- npm >= 7  
- Supabase project (for frontend + indexer)  
- Sepolia RPC and (for deploy) funded deployer wallet  

### 1. Contracts

```bash
cd contracts
npm install
cp .env.example .env   # set RPC, private key, etc.
npm run compile
npm test
# Deploy (e.g. Sepolia):
npm run deploy:sepolia
```

Set in `.env`: `RPC_URL` or `ALCHEMY_RPC_URL`, `PRIVATE_KEY`, and after deploy: `PAYROLL_FACTORY_ADDRESS`, `CONF_TOKEN_ADDRESS`, `USDC_ADDRESS`.

### 2. Supabase

- Create a project at [supabase.com](https://supabase.com).  
- Run all migrations under `supabase/migrations/` (Table Editor or `supabase db push` if using CLI).  
- Create the `employer-logos` storage bucket (public) and policies as in `010_storage_employer_logos.sql`.  
- Copy project URL and anon key (and service role key for the indexer).

### 3. Indexer

```bash
cd indexer
npm install
cp .env.example .env
# Set: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RPC_URL, PAYROLL_FACTORY_ADDRESS
npm run dev
```

Indexer polls for new blocks and writes events to Supabase.

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set: VITE_PAYROLL_FACTORY_ADDRESS, VITE_CONF_TOKEN_ADDRESS, VITE_USDC_ADDRESS,
#      VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SEPOLIA_RPC_URL or similar
npm run dev
```

Open the URL shown (e.g. http://localhost:5173). Connect a Sepolia wallet and use Employer or Employee flows.

### Environment variables (summary)

- **Contracts:** `RPC_URL`, `PRIVATE_KEY`; after deploy: factory, token, USDC addresses.  
- **Indexer:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RPC_URL`, `PAYROLL_FACTORY_ADDRESS`.  
- **Frontend:** `VITE_PAYROLL_FACTORY_ADDRESS`, `VITE_CONF_TOKEN_ADDRESS`, `VITE_USDC_ADDRESS`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and RPC for the chain.

---

## 2-minute video demo

A 2-minute video will be submitted to pitch the project, showing:

1. **Employer flow:** Connect wallet → Register payroll → Wrap USDC → Set operator → Onboard employees (manual + CSV preview) → Run payroll.  
2. **Confidentiality:** Transaction on explorer shows encrypted data; only employer and employee can decrypt.  
3. **Employee flow:** Connect as employee → View payment history → Decrypt payment → (optional) Unwrap cUSDC.  
4. **Extra features:** Company profile (name, logo, industry, website), employee names/emails, payment frequency, CSV/XLSX import with preview, transaction history with Payroll Volume and Payment Distribution charts, invoicing, CSV export, unwrap cUSDC → USDC.

---

## Documentation

- **README.md** (this file) – Overview, bounty alignment, architecture summary, setup.  
- **ARCHITECTURE.md** – Detailed contract behavior, factory→payroll link, USDC→cUSDC wrapping, onboarding/pay flows, employee decryption, events, and encryption context.

---

## License

See repository license (e.g. BSD-3-Clause for contract dependencies).
