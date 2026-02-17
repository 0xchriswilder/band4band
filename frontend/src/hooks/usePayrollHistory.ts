import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase, type SalaryPaymentRow, type EmployeeRow, type EmployeeInvoiceRow, type EmployeeInvoiceData, type EmployeeDisplayNameRow } from '../lib/supabase';

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

/* ─── Employee: submit monthly invoice ─── */

export function useSubmitEmployeeInvoice() {
  const { address } = useAccount();
  const { employee } = useEmployeeProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: { name: string; role: string; month_due: string }) => {
      if (!address || !employee) {
        setError('Wallet not connected or not an onboarded employee');
        return false;
      }
      const { name, role, month_due } = payload;
      if (!name.trim() || !role.trim() || !month_due) {
        setError('Name, role, and month are required');
        return false;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        const data: EmployeeInvoiceData = { name: name.trim(), role: role.trim() };
        const { error: insertError } = await supabase.from('employee_invoices').upsert(
          {
            employee_address: address.toLowerCase(),
            employer_address: employee.employer.toLowerCase(),
            month_due,
            data,
          },
          { onConflict: 'employee_address,month_due' }
        );
        if (insertError) {
          if (insertError.code === '23505') {
            setError('Already submitted for this month');
          } else {
            setError(insertError.message);
          }
          return false;
        }
        return true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to submit invoice');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, employee]
  );

  return { submit, isSubmitting, error };
}

/* ─── Employer: employee display names (set at onboarding) ─── */

export function useEmployerEmployeeNames() {
  const { address } = useAccount();
  const [names, setNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_display_names')
        .select('employee_address, name')
        .eq('employer_address', address.toLowerCase());

      if (error) {
        console.error('[Supabase] employer employee names error:', error.message);
        setNames({});
        return;
      }
      const map: Record<string, string> = {};
      for (const row of (data as EmployeeDisplayNameRow[]) ?? []) {
        const emp = row.employee_address?.toLowerCase();
        if (emp) map[emp] = row.name ?? '';
      }
      setNames(map);
    } catch (err) {
      console.error('[Supabase] employer employee names error:', err);
      setNames({});
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const upsertName = useCallback(
    async (employeeAddress: string, name: string) => {
      if (!address) return;
      const { error } = await supabase.from('employee_display_names').upsert(
        {
          employer_address: address.toLowerCase(),
          employee_address: employeeAddress.toLowerCase(),
          name: (name || '').trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employer_address,employee_address' }
      );
      if (error) throw error;
      setNames((prev) => ({ ...prev, [employeeAddress.toLowerCase()]: (name || '').trim() }));
    },
    [address]
  );

  return { names, isLoading, reload: fetch, upsertName };
}

/* ─── Employer: latest salary payment encrypted handle per employee (from Supabase, for decrypt) ─── */

export function useEmployerLatestPaymentHandles() {
  const { address } = useAccount();
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('salary_payments')
        .select('employee, encrypted')
        .eq('employer', address.toLowerCase())
        .order('block_number', { ascending: false });

      if (error) {
        console.error('[Supabase] employer latest payment handles error:', error.message);
        setHandles({});
        return;
      }
      const map: Record<string, string> = {};
      for (const row of (data ?? [])) {
        const emp = (row as { employee: string; encrypted: string }).employee?.toLowerCase();
        if (emp && !(emp in map)) map[emp] = (row as { employee: string; encrypted: string }).encrypted;
      }
      setHandles(map);
    } catch (err) {
      console.error('[Supabase] employer latest payment handles error:', err);
      setHandles({});
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { handles, isLoading, reload: fetch };
}

/* ─── Employer: invoices for a given month ─── */

export function useEmployerInvoices(monthDue: string) {
  const { address } = useAccount();
  const [invoices, setInvoices] = useState<EmployeeInvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address || !monthDue) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_invoices')
        .select('*')
        .eq('employer_address', address.toLowerCase())
        .eq('month_due', monthDue)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Supabase] employer invoices error:', error.message);
        setInvoices([]);
        return;
      }
      setInvoices((data as EmployeeInvoiceRow[]) ?? []);
    } catch (err) {
      console.error('[Supabase] employer invoices error:', err);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, monthDue]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const invoicedAddresses = new Set(invoices.map((i) => i.employee_address.toLowerCase()));

  return { invoices, invoicedAddresses, isLoading, reload: fetch };
}
