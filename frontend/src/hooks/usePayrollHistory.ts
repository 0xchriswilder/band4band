import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase, type SalaryPaymentRow, type EmployeeRow } from '../lib/supabase';

/* ─── Employer: payment history ─── */

export function useEmployerPaymentHistory() {
  const { address } = useAccount();
  const [payments, setPayments] = useState<SalaryPaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

  const fetch = useCallback(
    async (p = page) => {
      if (!address) return;
      setIsLoading(true);
      try {
        const offset = (p - 1) * limit;
        const { data, count, error } = await supabase
          .from('salary_payments')
          .select('*', { count: 'exact' })
          .eq('employer', address.toLowerCase())
          .order('block_number', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('[Supabase] employer payment history error:', error.message);
          return;
        }
        setPayments(data ?? []);
        setTotal(count ?? 0);
      } catch (err) {
        console.error('[Supabase] employer payment history error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [address, page]
  );

  useEffect(() => {
    fetch(page);
  }, [fetch, page]);

  return {
    payments,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    setPage,
    isLoading,
    reload: () => fetch(page),
  };
}

/* ─── Employer: employee list ─── */

export function useEmployerEmployees() {
  const { address } = useAccount();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const { data, count, error } = await supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .eq('employer', address.toLowerCase())
        .eq('whitelisted', true)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('[Supabase] employer employees error:', error.message);
        return;
      }
      setEmployees(data ?? []);
      setTotal(count ?? 0);
    } catch (err) {
      console.error('[Supabase] employer employees error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { employees, total, isLoading, reload: fetch };
}

/* ─── Employee: their onboarding record ─── */

export function useEmployeeProfile() {
  const { address } = useAccount();
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('address', address.toLowerCase())
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('[Supabase] employee profile error:', error.message);
        }
        setEmployee(null);
        return;
      }
      setEmployee(data);
    } catch (err) {
      console.error('[Supabase] employee profile error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { employee, isEmployee: !!employee, isLoading, reload: fetch };
}

/* ─── Employee: their payment history ─── */

export function useEmployeePaymentHistory() {
  const { address } = useAccount();
  const [payments, setPayments] = useState<SalaryPaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

  const fetch = useCallback(
    async (p = page) => {
      if (!address) return;
      setIsLoading(true);
      try {
        const offset = (p - 1) * limit;
        const { data, count, error } = await supabase
          .from('salary_payments')
          .select('*', { count: 'exact' })
          .eq('employee', address.toLowerCase())
          .order('block_number', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('[Supabase] employee payment history error:', error.message);
          return;
        }
        setPayments(data ?? []);
        setTotal(count ?? 0);
      } catch (err) {
        console.error('[Supabase] employee payment history error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [address, page]
  );

  useEffect(() => {
    fetch(page);
  }, [fetch, page]);

  return {
    payments,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    setPage,
    isLoading,
    reload: () => fetch(page),
  };
}
