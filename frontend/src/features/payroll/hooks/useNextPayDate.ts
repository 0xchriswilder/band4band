import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export interface NextPayDateResult {
  lastRunDate: Date | null;
  nextSuggestedDate: Date | null;
  isLoading: boolean;
}

/** Default period: monthly (add 1 month to last run). */
function addPeriod(d: Date, period: 'monthly' | 'biweekly' | 'weekly'): Date {
  const out = new Date(d);
  if (period === 'monthly') {
    out.setMonth(out.getMonth() + 1);
  } else if (period === 'biweekly') {
    out.setDate(out.getDate() + 14);
  } else {
    out.setDate(out.getDate() + 7);
  }
  return out;
}

export function useNextPayDate(employerAddress: string | undefined): NextPayDateResult {
  const [lastRunDate, setLastRunDate] = useState<Date | null>(null);
  const [nextSuggestedDate, setNextSuggestedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLastRun = useCallback(async () => {
    if (!employerAddress) {
      setLastRunDate(null);
      setNextSuggestedDate(null);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('timestamp')
        .eq('employer', employerAddress.toLowerCase())
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setLastRunDate(null);
        setNextSuggestedDate(null);
        return;
      }
      const ts = (data as { timestamp: string }).timestamp;
      const last = new Date(ts);
      setLastRunDate(last);
      const next = addPeriod(last, 'monthly');
      setNextSuggestedDate(next);
    } catch {
      setLastRunDate(null);
      setNextSuggestedDate(null);
    } finally {
      setIsLoading(false);
    }
  }, [employerAddress]);

  useEffect(() => {
    fetchLastRun();
  }, [fetchLastRun]);

  return { lastRunDate, nextSuggestedDate, isLoading };
}
