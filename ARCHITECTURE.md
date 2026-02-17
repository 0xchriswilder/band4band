# Confidential Payroll Architecture

This document explains how the full system works: the factory, payroll contracts, USDC wrapping, encrypted transfers, and employee decryption.

---

## 1. Contract Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ORDER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  1. MockUSDC (or real USDC)                                              │
│  2. ConfidentialPayrollToken (wraps USDC → cUSDC)                       │
│  3. PayrollFactory (holds cUSDC address, deploys Payroll per employer)   │
└─────────────────────────────────────────────────────────────────────────┘
```

| Contract | Role |
|----------|------|
| **MockUSDC** | Plain ERC-20 with 6 decimals. Test-only; use real USDC on mainnet. |
| **ConfidentialPayrollToken** | ERC-7984 wrapper. Wraps USDC 1:1 into confidential cUSDC. |
| **PayrollFactory** | One per deployment. Deploys a dedicated **Payroll** for each employer. |
| **Payroll** | One per employer. Manages employees, encrypted salaries, and confidential transfers. |

---

## 2. Factory → Payroll Link

### What the Factory Does

- **Holds** the address of the confidential token (cUSDC).
- **Deploys** a new `Payroll` contract when an employer calls `registerEmployer()`.
- **Maps** `employer address → Payroll address` in `employerPayroll`.
- **Tracks** all employers in `allEmployers`.

### Registration Flow

```
Employer (wallet)  →  registerEmployer()  →  PayrollFactory
                                                    │
                                                    ├─ new Payroll(confidentialToken, employer)
                                                    ├─ employerPayroll[employer] = payrollAddress
                                                    └─ emit PayrollCreated(employer, payroll)
```

Each employer gets **one** Payroll contract. That contract:

- Is tied to the employer (`msg.sender` at registration).
- Uses the shared cUSDC token.
- Manages only that employer’s employees and payroll.

### Getting Your Payroll

```solidity
address payroll = factory.getPayroll(employerAddress);
```

---

## 3. USDC → cUSDC (Wrapping)

### How Wrapping Works

1. Employer approves the wrapper to spend USDC:
   ```solidity
   usdc.approve(confidentialTokenAddress, amount);
   ```

2. Employer wraps USDC into cUSDC:
   ```solidity
   confidentialToken.wrap(employerAddress, amount);
   ```

3. The wrapper:
   - Pulls USDC from the employer.
   - Mints an encrypted cUSDC balance for the employer.
   - The balance is stored as `euint64` (encrypted) onchain.

### Client-Side (Relayer SDK)

The Zama Relayer SDK is used for:

- **Encryption** when creating encrypted inputs (e.g. for onboarding, payroll).
- **Decryption** when the employee wants to see their balance or payment.

Wrapping itself is a plain `wrap(recipient, amount)` call; the wrapper handles the encrypted balance internally.

---

## 4. Employee Registration (Onboarding)

### Single Onboarding

1. Employer enters employee address and salary (e.g. 2500 USDC).
2. Frontend uses Relayer SDK:
   - `createEncryptedInput(payrollContractAddress, employerAddress)`
   - `add64(amount)` (amount in 6-decimal units, e.g. 2500e6)
   - `encrypt()` → `{ handles, inputProof }`
3. Employer calls:
   ```solidity
   payroll.onboardEmployee(employeeAddress, encryptedHandle, inputProof, "0x");
   ```
4. Payroll contract:
   - Checks `msg.sender == employer`.
   - Converts external ciphertext to `euint64` via `FHE.fromExternal`.
   - Sets ACL so Payroll, employer, employee, and cUSDC can use the handle.
   - Sets `whitelisted[employee] = true`.
   - Emits `EmployeeOnboarded`.

### Batch Onboarding (CSV/XLSX)

Same flow, but in one transaction:

```solidity
payroll.batchOnboardEmployees(
  [addr1, addr2, ...],
  [encrypted1, encrypted2, ...],
  [proof1, proof2, ...],
  ["0x", "0x", ...]
);
```

Each salary is encrypted separately; all are submitted in a single tx.

---

## 5. Sending Confidential cUSDC to Employees

### Prerequisites

1. Employer has wrapped USDC into cUSDC.
2. Employer has set the Payroll contract as operator on cUSDC:
   ```solidity
   confidentialToken.setOperator(payrollAddress, expiryTimestamp);
   ```
3. Employees are onboarded (whitelisted).

### Pay Flow

1. Employer triggers “Run payroll” in the UI.
2. For each employee, frontend:
   - Encrypts salary with `createEncryptedInput(payrollAddress, employerAddress)`.
   - Produces `{ handles, inputProof }`.
3. Employer calls:
   ```solidity
   payroll.batchPaySalaries(
     [employee1, employee2, ...],
     [encrypted1, encrypted2, ...],
     [proof1, proof2, ...]
   );
   ```
4. Payroll contract, for each employee:
   - Converts external ciphertext to `euint64`.
   - Sets ACL for employer, cUSDC, and employee.
   - Calls `confidentialToken.confidentialTransferFrom(employer, employee, salary)`.
   - Emits `SalaryPaid` with the encrypted salary handle.

### What Happens Onchain

- Employer’s cUSDC balance decreases (encrypted).
- Employee’s cUSDC balance increases (encrypted).
- Amounts stay encrypted; only employer and employee can decrypt.

---

## 6. Employee Decryption (userDecrypt)

### How Employees See Their Amount

1. Employee connects wallet and opens the Employee dashboard.
2. Dashboard loads `SalaryPaid` events for that employee from the Payroll contract.
3. Each event includes a `salary` field: an encrypted handle (bytes).
4. Employee clicks “Decrypt” for a payment.
5. Frontend uses Relayer SDK `userDecrypt`:
   - Generates a temporary keypair.
   - Builds EIP-712 message for decryption permission.
   - Employee signs with their wallet.
   - Sends request to Zama relayer with handle, contract, and signature.
   - Relayer returns the decrypted amount.
6. UI shows the amount in USDC (e.g. 2500.00).

### Unwrapping cUSDC → USDC (Optional)

Employees can also unwrap cUSDC back to USDC:

```solidity
confidentialToken.unwrap(employeeAddress, amount);
```

This requires the employee to have a decrypted view of their balance (or to specify an amount they know). Unwrapping is done on the ConfidentialPayrollToken contract, not in the payroll flow.

---

## 7. End-to-End Flow Diagram

```
EMPLOYER SIDE
─────────────
1. Connect wallet (Sepolia)
2. Register: factory.registerEmployer()  →  get Payroll address
3. Wrap USDC: usdc.approve() + confidentialToken.wrap()
4. Set operator: confidentialToken.setOperator(payrollAddress, expiry)
5. Onboard: payroll.onboardEmployee(addr, encryptedSalary, proof, "0x")
   └─ Or batch: payroll.batchOnboardEmployees(...)
6. Run payroll: payroll.batchPaySalaries(employees, encryptedSalaries, proofs)

EMPLOYEE SIDE
─────────────
1. Connect wallet
2. View payment history (SalaryPaid events from Payroll)
3. Click Decrypt → sign EIP-712 → userDecrypt → see amount
4. (Optional) Unwrap cUSDC to USDC
```

---

## 8. Data Flow Summary

| Step | Who | Contract | Action |
|------|-----|----------|--------|
| Register | Employer | PayrollFactory | `registerEmployer()` → new Payroll |
| Wrap | Employer | ConfidentialPayrollToken | `wrap()` USDC → cUSDC |
| Set operator | Employer | ConfidentialPayrollToken | `setOperator(payroll)` |
| Onboard | Employer | Payroll | `onboardEmployee()` or `batchOnboardEmployees()` |
| Pay | Employer | Payroll | `paySalary()` or `batchPaySalaries()` |
| Transfer | Payroll | ConfidentialPayrollToken | `confidentialTransferFrom()` |
| Decrypt | Employee | (Relayer SDK) | `userDecrypt()` off-chain |
| Unwrap | Employee | ConfidentialPayrollToken | `unwrap()` cUSDC → USDC |

---

## 9. Encryption Context

When creating encrypted inputs, the **contract address** must match the contract that will use the ciphertext:

- **Onboarding / Pay** → use **Payroll** contract address (it calls `FHE.fromExternal`).
- **Direct wrap** → use **ConfidentialPayrollToken** address.

The **user address** is the signer/owner of the encrypted value (typically the employer for payroll operations).

---

## 10. Events for Indexing

| Event | Contract | Use |
|-------|----------|-----|
| `PayrollCreated` | PayrollFactory | Index employer → payroll |
| `EmployeeOnboarded` | Payroll | Track onboarded employees |
| `EmployeeUpdated` | Payroll | Salary changes |
| `EmployeeRemoved` | Payroll | Removed employees |
| `SalaryPaid` | Payroll | Payment history; includes encrypted handle for decryption |

Employees discover their payments by querying `SalaryPaid` on the Payroll contract(s) they belong to, filtered by `employee == theirAddress`.
