import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { SalaryPaymentRow } from '../../../lib/supabase';

export function useEmployeeYtd(
  employeeAddress: string | undefined,
  year?: number
) {
  const y = year ?? new Date().getFullYear();
  const [paymentsInYear, setPaymentsInYear] = useState<SalaryPaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchYtd = useCallback(async () => {
    if (!employeeAddress) {
      setPaymentsInYear([]);
      return;
    }
    setIsLoading(true);
    try {
      const start = new Date(y, 0, 1).toISOString();
      const end = new Date(y, 11, 31, 23, 59, 59, 999).toISOString();
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('employee', employeeAddress.toLowerCase())
        .gte('timestamp', start)
        .lte('timestamp', end)
        .order('block_number', { ascending: false });

      if (error) {
        setPaymentsInYear([]);
        return;
      }
      setPaymentsInYear((data as SalaryPaymentRow[]) ?? []);
    } catch {
      setPaymentsInYear([]);
    } finally {
      setIsLoading(false);
    }
  }, [employeeAddress, y]);

  useEffect(() => {
    fetchYtd();
  }, [fetchYtd]);

  return { paymentsInYear, isLoading, reload: fetchYtd };
}
