/// <reference types="vite/client" />
import { parseAbi } from 'viem';

const env = import.meta.env;
export const CONTRACTS = {
  PAYROLL_FACTORY: (env.VITE_PAYROLL_FACTORY_ADDRESS ||
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
  CONF_TOKEN: (env.VITE_CONF_TOKEN_ADDRESS ||
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
  USDC: (env.VITE_USDC_ADDRESS ||
    '0x0000000000000000000000000000000000000000') as `0x${string}`,
} as const;

export const TOKEN_CONFIG = {
  symbol: 'cUSDCP',
  underlyingSymbol: 'USDC',
  decimals: 6,
} as const;

/* ── Factory ──────────────────────────────────────────── */
export const PAYROLL_FACTORY_ABI = parseAbi([
  'function registerEmployer() returns (address payrollAddress)',
  'function getPayroll(address employer) view returns (address)',
]);

/* ── Payroll ──────────────────────────────────────────── */
// NOTE: externalEuint64 compiles to bytes32 in the ABI
export const PAYROLL_ABI = parseAbi([
  'function employer() view returns (address)',
  'function onboardEmployee(address employee, bytes32 encryptedSalary, bytes inputProof, bytes signature)',
  'function batchOnboardEmployees(address[] employees, bytes32[] encryptedSalaries, bytes[] inputProofs, bytes[] signatures)',
  'function editEmployee(address employee, bytes32 newEncryptedSalary, bytes newInputProof, bytes newSignature)',
  'function removeEmployee(address employee)',
  'function paySalary(address employee, bytes32 salaryEncrypted, bytes inputProof)',
  'function batchPaySalaries(address[] employees, bytes32[] encryptedSalaries, bytes[] inputProofs)',
  'function getSalaryHistoryLength(address employee) view returns (uint256)',
  'event EmployeeOnboarded(address indexed employer,address indexed employee,bytes32 encryptedSalary,bytes inputProof,bytes signature)',
  'event SalaryPaid(address indexed employer,address indexed employee,uint256 index,bytes32 salary,uint256 timestamp,bytes32 paymentId,address payroll)',
]);

/* ── ERC-20 (USDC / MockUSDC) ────────────────────────── */
export const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);

/* ── Confidential Token (ERC-7984 wrapper) ────────────── */
export const CONF_TOKEN_ABI = parseAbi([
  'function wrap(address to, uint256 amount)',
  'function unwrap(address from, address to, bytes32 encryptedAmount, bytes inputProof)',
  'function unwrap(address from, address to, bytes32 amount)',
  'function confidentialBalanceOf(address account) view returns (bytes32)',
  'function setOperator(address operator, uint48 until)',
  'function isOperator(address account, address operator) view returns (bool)',
  'function underlying() view returns (address)',
  'function rate() view returns (uint256)',
]);


