# Confidential Payroll dApp

A functioning **confidential payroll dApp** where a company can pay employees on-chain while keeping individual salaries and transactions private using the **Zama Protocol** and **ERC-7984** confidential tokens.

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
  - Transaction history (employer + employee views) with Payroll Volume and Payment Distribution charts  
  - Invoicing: employees submit invoices; employers mark them paid  
  - Export payment history to CSV  
  - Optional unwrap of cUSDC back to USDC  

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
4. **Extra features:** Company profile, transaction history charts, CSV export, invoicing.

---

## Documentation

- **README.md** (this file) – Overview, bounty alignment, architecture summary, setup.  
- **ARCHITECTURE.md** – Detailed contract behavior, factory→payroll link, USDC→cUSDC wrapping, onboarding/pay flows, employee decryption, events, and encryption context.

---

## License

See repository license (e.g. BSD-3-Clause for contract dependencies).
