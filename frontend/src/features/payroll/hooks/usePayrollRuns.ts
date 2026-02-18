import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { PayrollRunRow } from '../../../lib/supabase';

export function usePayrollRuns(employerAddress: string | undefined) {
  const [runs, setRuns] = useState<PayrollRunRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRuns = useCallback(async () => {
    if (!employerAddress) {
      setRuns([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('employer', employerAddress.toLowerCase())
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) {
        setRuns([]);
        return;
      }
      setRuns((data as PayrollRunRow[]) ?? []);
    } catch {
      setRuns([]);
    } finally {
      setIsLoading(false);
    }
  }, [employerAddress]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return { runs, isLoading, reload: fetchRuns };
}
