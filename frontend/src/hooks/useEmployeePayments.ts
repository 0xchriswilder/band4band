import { useCallback, useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { CONTRACTS } from '../lib/contracts';

export interface EmployeePayment {
  employer: `0x${string}`;
  employee: `0x${string}`;
  index: bigint;
  salaryHandle: `0x${string}`;
  timestamp: bigint;
  paymentId: `0x${string}`;
  payroll: `0x${string}`;
}

export function useEmployeePayments(payrollAddressOverride?: `0x${string}`) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [payments, setPayments] = useState<EmployeePayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadPayments = useCallback(async () => {
    if (!publicClient || !address) return;

    const payrollAddress =
      payrollAddressOverride || (CONTRACTS.PAYROLL_FACTORY as `0x${string}`);

    // In a full implementation you may want a dedicated env var for
    // first deployment block. For now use block 0 as a simple default.
    const fromBlock = 0n;

    try {
      setIsLoading(true);
      setError(null);

      const logs = await publicClient.getLogs({
        address: payrollAddress,
        event: {
          type: 'event',
          name: 'SalaryPaid',
          inputs: [
            { indexed: true, name: 'employer', type: 'address' },
            { indexed: true, name: 'employee', type: 'address' },
            { indexed: false, name: 'index', type: 'uint256' },
            { indexed: false, name: 'salary', type: 'bytes' },
            { indexed: false, name: 'timestamp', type: 'uint256' },
            { indexed: false, name: 'paymentId', type: 'bytes32' },
            { indexed: false, name: 'payroll', type: 'address' },
          ],
        } as any,
        args: { employee: address },
        fromBlock,
        toBlock: 'latest',
      });

      const decoded = logs.map((log) => {
        const { employer, employee, index, salary, timestamp, paymentId, payroll } =
          (log as any).args;
        return {
          employer,
          employee,
          index,
          salaryHandle: salary as `0x${string}`,
          timestamp,
          paymentId,
          payroll,
        } as EmployeePayment;
      });

      setPayments(decoded.sort((a, b) => Number(b.timestamp - a.timestamp)));
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address, payrollAddressOverride]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  return {
    payments,
    isLoading,
    error,
    reload: loadPayments,
  };
}

export default useEmployeePayments;

