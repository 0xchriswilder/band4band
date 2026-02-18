import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { CONTRACTS, PAYROLL_FACTORY_ABI, PAYROLL_ABI, CONF_TOKEN_ABI } from '../lib/contracts';
import { useFhevmEncrypt } from './useFhevmEncrypt';
import { parseAmount } from '../lib/utils';
import { supabase } from '../lib/supabase';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const SEPOLIA_RPC =
  import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

/** Standalone viem client — works regardless of wagmi state */
const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC, { retryCount: 3, timeout: 10_000 }),
});

export interface EmployeeForm {
  address: string;
  salary: string; // human-readable, e.g. "2500.00"
}

export function usePayrollEmployer() {
  const { address: employer, isConnected } = useAccount();
  const wagmiPublicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const { encryptAmount, isEncrypting } = useFhevmEncrypt();

  const [payrollAddress, setPayrollAddress] = useState<`0x${string}` | null>(null);
  const [localEmployees, setLocalEmployees] = useState<EmployeeForm[]>([]);
  const [onchainEmployees, setOnchainEmployees] = useState<`0x${string}`[]>([]);
  /** Start true so consumers (e.g. Company profile) don't redirect before first fetch */
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(true);
  const [isOperatorSet, setIsOperatorSet] = useState(false);

  /** Direct on-chain read using standalone viem client */
  const fetchPayrollAddress = useCallback(async (employerAddr?: `0x${string}`) => {
    const target = employerAddr ?? employer;
    if (!target) {
      setPayrollAddress(null);
      return;
    }

    setIsLoadingPayroll(true);
    try {
      const addr = await sepoliaClient.readContract({
        address: CONTRACTS.PAYROLL_FACTORY,
        abi: PAYROLL_FACTORY_ABI,
        functionName: 'getPayroll',
        args: [target],
      });
      const result = addr as `0x${string}`;
      setPayrollAddress(result && result !== ZERO_ADDRESS ? result : null);
    } catch {
      setPayrollAddress(null);
    } finally {
      setIsLoadingPayroll(false);
    }
  }, [employer]);

  // Auto-fetch when wallet connects or employer changes
  useEffect(() => {
    if (isConnected && employer) {
      void fetchPayrollAddress(employer);
    } else {
      setPayrollAddress(null);
      setIsLoadingPayroll(false);
    }
  }, [isConnected, employer, fetchPayrollAddress]);

  const hasPayroll = !!payrollAddress;

  /** Check if the Payroll contract is an operator on the confidential token */
  const checkOperator = useCallback(async () => {
    if (!employer || !payrollAddress) {
      setIsOperatorSet(false);
      return;
    }
    try {
      const result = await sepoliaClient.readContract({
        address: CONTRACTS.CONF_TOKEN,
        abi: CONF_TOKEN_ABI,
        functionName: 'isOperator',
        args: [employer, payrollAddress],
      });
      setIsOperatorSet(!!result);
    } catch {
      setIsOperatorSet(false);
    }
  }, [employer, payrollAddress]);

  useEffect(() => {
    if (hasPayroll) {
      void checkOperator();
    }
  }, [hasPayroll, checkOperator]);

  /** Fetch employees from Supabase (indexer is source of truth) */
  const fetchEmployees = useCallback(async () => {
    if (!employer) return;
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('address')
        .eq('employer', employer.toLowerCase())
        .eq('whitelisted', true);

      if (error) return;
      const list = (data ?? []).map((row: { address: string }) => ({
        address: row.address,
        salary: '0',
      }));
      setLocalEmployees(list);
      setOnchainEmployees(list.map((e) => e.address as `0x${string}`));
    } catch {
      setLocalEmployees([]);
      setOnchainEmployees([]);
    }
  }, [employer]);

  useEffect(() => {
    if (isConnected && employer) {
      void fetchEmployees();
    } else {
      setLocalEmployees([]);
      setOnchainEmployees([]);
    }
  }, [isConnected, employer, fetchEmployees]);

  /** Set the Payroll contract as operator on cUSDCP (needed for confidentialTransferFrom) */
  const approvePayrollOperator = useCallback(async () => {
    if (!employer || !isConnected || !payrollAddress) return null;
    const farFuture = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
    const hash = await writeContractAsync({
      address: CONTRACTS.CONF_TOKEN,
      abi: CONF_TOKEN_ABI,
      functionName: 'setOperator',
      args: [payrollAddress, farFuture],
    });
    const client = wagmiPublicClient ?? sepoliaClient;
    await client.waitForTransactionReceipt({ hash });
    setIsOperatorSet(true);
    return hash;
  }, [employer, isConnected, payrollAddress, writeContractAsync, wagmiPublicClient]);

  const registerEmployer = useCallback(async () => {
    if (!employer || !isConnected) return null;

    const hash = await writeContractAsync({
      address: CONTRACTS.PAYROLL_FACTORY,
      abi: PAYROLL_FACTORY_ABI,
      functionName: 'registerEmployer',
      args: [],
    });

    // Wait for receipt using wagmi client if available, otherwise standalone
    const client = wagmiPublicClient ?? sepoliaClient;
    await client.waitForTransactionReceipt({ hash });

    // Re-read directly after confirmed tx
    await fetchPayrollAddress(employer);
    return hash;
  }, [employer, isConnected, writeContractAsync, wagmiPublicClient, fetchPayrollAddress]);

  const onboardEmployee = useCallback(
    async (employee: string, salaryHuman: string) => {
      if (!employer || !isConnected || !payrollAddress) return null;

      const salary = parseAmount(salaryHuman, 6);
      const encrypted = await encryptAmount(salary, payrollAddress);
      if (!encrypted || !encrypted.handles[0]) {
        throw new Error('Failed to encrypt salary');
      }

      const hash = await writeContractAsync({
        address: payrollAddress,
        abi: PAYROLL_ABI,
        functionName: 'onboardEmployee',
        args: [employee as `0x${string}`, encrypted.handles[0], encrypted.inputProof as `0x${string}`, '0x'],
      });

      const client = wagmiPublicClient ?? sepoliaClient;
      await client.waitForTransactionReceipt({ hash });

      setLocalEmployees((prev) => [...prev, { address: employee, salary: salaryHuman }]);
      return hash;
    },
    [employer, isConnected, payrollAddress, encryptAmount, writeContractAsync, wagmiPublicClient]
  );

  const batchOnboardEmployees = useCallback(
    async (employees: Array<{ address: string; salary: string }>) => {
      if (!employer || !isConnected || !payrollAddress || employees.length === 0) return null;

      const addresses = employees.map((e) => e.address);
      const encryptedSalaries: `0x${string}`[] = [];
      const proofs: `0x${string}`[] = [];
      const signatures: `0x${string}`[] = [];

      for (const e of employees) {
        const salary = parseAmount(e.salary, 6);
        const encrypted = await encryptAmount(salary, payrollAddress);
        if (!encrypted || !encrypted.handles[0]) {
          throw new Error('Failed to encrypt salary');
        }
        encryptedSalaries.push(encrypted.handles[0]);
        proofs.push(encrypted.inputProof);
        signatures.push('0x');
      }

      const hash = await writeContractAsync({
        address: payrollAddress,
        abi: PAYROLL_ABI,
        functionName: 'batchOnboardEmployees',
        args: [addresses as `0x${string}`[], encryptedSalaries, proofs, signatures],
      });

      const client = wagmiPublicClient ?? sepoliaClient;
      await client.waitForTransactionReceipt({ hash });

      setLocalEmployees((prev) => [...prev, ...employees]);
      return hash;
    },
    [employer, isConnected, payrollAddress, encryptAmount, writeContractAsync, wagmiPublicClient]
  );

  /** Edit an employee's salary (update on-chain) */
  const editEmployeeSalary = useCallback(
    async (employee: string, newSalaryHuman: string) => {
      if (!employer || !isConnected || !payrollAddress) return null;

      const salary = parseAmount(newSalaryHuman, 6);
      const encrypted = await encryptAmount(salary, payrollAddress);
      if (!encrypted || !encrypted.handles[0]) {
        throw new Error('Failed to encrypt new salary');
      }

      const hash = await writeContractAsync({
        address: payrollAddress,
        abi: PAYROLL_ABI,
        functionName: 'editEmployee',
        args: [employee as `0x${string}`, encrypted.handles[0], encrypted.inputProof as `0x${string}`, '0x'],
      });

      const client = wagmiPublicClient ?? sepoliaClient;
      await client.waitForTransactionReceipt({ hash });
      return hash;
    },
    [employer, isConnected, payrollAddress, encryptAmount, writeContractAsync, wagmiPublicClient]
  );

  /** Remove an employee from the whitelist */
  const removeEmployeeFromPayroll = useCallback(
    async (employee: string) => {
      if (!employer || !isConnected || !payrollAddress) return null;

      const hash = await writeContractAsync({
        address: payrollAddress,
        abi: PAYROLL_ABI,
        functionName: 'removeEmployee',
        args: [employee as `0x${string}`],
      });

      const client = wagmiPublicClient ?? sepoliaClient;
      await client.waitForTransactionReceipt({ hash });

      setLocalEmployees((prev) => prev.filter((e) => e.address.toLowerCase() !== employee.toLowerCase()));
      setOnchainEmployees((prev) => prev.filter((a) => a.toLowerCase() !== employee.toLowerCase()));
      return hash;
    },
    [employer, isConnected, payrollAddress, writeContractAsync, wagmiPublicClient]
  );

  /** Fetch salary handles from SalaryPaid events (for employer decrypt) */
  const fetchSalaryHandles = useCallback(async (): Promise<Record<string, string>> => {
    if (!payrollAddress) return {};
    try {
      const logs = await sepoliaClient.getLogs({
        address: payrollAddress,
        event: {
          type: 'event',
          name: 'SalaryPaid',
          inputs: [
            { indexed: true, name: 'employer', type: 'address' },
            { indexed: true, name: 'employee', type: 'address' },
            { indexed: false, name: 'index', type: 'uint256' },
            { indexed: false, name: 'salary', type: 'bytes32' },
            { indexed: false, name: 'timestamp', type: 'uint256' },
            { indexed: false, name: 'paymentId', type: 'bytes32' },
            { indexed: false, name: 'payroll', type: 'address' },
          ],
        },
        fromBlock: 0n,
        toBlock: 'latest',
      });

      const handleMap: Record<string, string> = {};
      for (const log of logs) {
        const args = (log as any).args;
        if (args?.employee && args?.salary) {
          handleMap[args.employee.toLowerCase()] = args.salary;
        }
      }
      return handleMap;
    } catch {
      return {};
    }
  }, [payrollAddress]);

  const payAllSalaries = useCallback(async (employeesOverride?: EmployeeForm[]) => {
    const list = employeesOverride ?? localEmployees;
    if (!employer || !isConnected || !payrollAddress || list.length === 0) return null;

    // Filter out employees with no salary set
    const payable = list.filter((e) => e.salary && Number(e.salary) > 0);
    if (payable.length === 0) {
      throw new Error('No employees have salary amounts set');
    }

    const addresses = payable.map((e) => e.address);
    const encryptedSalaries: `0x${string}`[] = [];
    const proofs: `0x${string}`[] = [];

    for (const e of payable) {
      const salary = parseAmount(e.salary, 6);
      const encrypted = await encryptAmount(salary, payrollAddress);
      if (!encrypted || !encrypted.handles[0]) {
        throw new Error('Failed to encrypt salary');
      }
      encryptedSalaries.push(encrypted.handles[0]);
      proofs.push(encrypted.inputProof);
    }

    const hash = await writeContractAsync({
      address: payrollAddress,
      abi: PAYROLL_ABI,
      functionName: 'batchPaySalaries',
      args: [addresses as `0x${string}`[], encryptedSalaries, proofs],
    });

    const client = wagmiPublicClient ?? sepoliaClient;
    await client.waitForTransactionReceipt({ hash });

    return hash;
  }, [employer, isConnected, payrollAddress, localEmployees, encryptAmount, writeContractAsync, wagmiPublicClient]);

  /** Pay a single employee using the given amount (USDC string, e.g. "2500.00"). */
  const payOneSalary = useCallback(
    async (employeeAddress: string, amountUsdc: string): Promise<`0x${string}` | null> => {
      if (!employer || !isConnected || !payrollAddress) return null;
      const amount = (amountUsdc || '').trim();
      if (!amount || Number(amount) <= 0) {
        throw new Error('Enter a valid pay amount for this employee');
      }
      const parsed = parseAmount(amount, 6);
      const encrypted = await encryptAmount(parsed, payrollAddress);
      if (!encrypted?.handles?.[0]) {
        throw new Error('Failed to encrypt salary');
      }
      const hash = await writeContractAsync({
        address: payrollAddress,
        abi: PAYROLL_ABI,
        functionName: 'paySalary',
        args: [employeeAddress as `0x${string}`, encrypted.handles[0], encrypted.inputProof],
      });
      const client = wagmiPublicClient ?? sepoliaClient;
      await client.waitForTransactionReceipt({ hash });
      return hash;
    },
    [employer, isConnected, payrollAddress, encryptAmount, writeContractAsync, wagmiPublicClient]
  );

  return {
    employer,
    payrollAddress,
    hasPayroll,
    isOperatorSet,
    isWriting: isPending,
    isEncrypting,
    isLoadingPayroll,
    localEmployees,
    onchainEmployees,
    registerEmployer,
    approvePayrollOperator,
    onboardEmployee,
    batchOnboardEmployees,
    editEmployeeSalary,
    removeEmployeeFromPayroll,
    payAllSalaries,
    payOneSalary,
    fetchSalaryHandles,
    refetchPayroll: fetchPayrollAddress,
    refetchEmployees: fetchEmployees,
  };
}

export default usePayrollEmployer;
