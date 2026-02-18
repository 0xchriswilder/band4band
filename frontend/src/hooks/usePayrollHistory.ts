import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase, type SalaryPaymentRow, type EmployeeRow, type EmployeeInvoiceRow, type EmployeeInvoiceData, type EmployeeDisplayNameRow, type EmployerProfileRow } from '../lib/supabase';

/* ─── Employer company name + logo (for employee-facing views, sidebar, activity) ─── */

export function useEmployerCompanyName(employerAddress: string | undefined) {
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [website, setWebsite] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!employerAddress) {
      setCompanyName(null);
      setLogoUrl(null);
      setWebsite(null);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employer_profiles')
        .select('company_name, logo_url, website')
        .eq('employer_address', employerAddress.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('[Supabase] employer company name error:', error.message);
        setCompanyName(null);
        setLogoUrl(null);
        setWebsite(null);
        return;
      }
      const row = data as EmployerProfileRow | null;
      setCompanyName(row?.company_name ?? null);
      setLogoUrl(row?.logo_url ?? null);
      setWebsite(row?.website ?? null);
    } catch (err) {
      console.error('[Supabase] employer company name error:', err);
      setCompanyName(null);
      setLogoUrl(null);
      setWebsite(null);
    } finally {
      setIsLoading(false);
    }
  }, [employerAddress]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { companyName, logoUrl, website, isLoading, reload: fetch };
}

/* ─── Employer full profile (for Company profile page edit) ─── */

export function useEmployerProfile(employerAddress: string | undefined) {
  const [profile, setProfile] = useState<EmployerProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!employerAddress) {
      setProfile(null);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employer_profiles')
        .select('*')
        .eq('employer_address', employerAddress.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('[Supabase] employer profile error:', error.message);
        setProfile(null);
        return;
      }
      setProfile((data as EmployerProfileRow | null) ?? null);
    } catch (err) {
      console.error('[Supabase] employer profile error:', err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [employerAddress]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { profile, isLoading, reload: fetch };
}

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
        .maybeSingle();

      if (error) {
        console.error('[Supabase] employee profile error:', error.message);
        setEmployee(null);
        return;
      }
      setEmployee(data ?? null);
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

/* ─── Employee: list their own submitted invoices (with paid status) ─── */

export function useEmployeeInvoices() {
  const { address } = useAccount();
  const [invoices, setInvoices] = useState<EmployeeInvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_invoices')
        .select('*')
        .eq('employee_address', address.toLowerCase())
        .order('month_due', { ascending: false });

      if (error) {
        console.error('[Supabase] employee invoices error:', error.message);
        setInvoices([]);
        return;
      }
      setInvoices((data as EmployeeInvoiceRow[]) ?? []);
    } catch (err) {
      console.error('[Supabase] employee invoices error:', err);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { invoices, isLoading, reload: fetch };
}

/* ─── Employer: employee display names (set at onboarding) ─── */

export function useEmployerEmployeeNames() {
  const { address } = useAccount();
  const [names, setNames] = useState<Record<string, string>>({});
  const [frequencies, setFrequencies] = useState<Record<string, string>>({});
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_display_names')
        .select('employee_address, name, email, payment_frequency')
        .eq('employer_address', address.toLowerCase());

      if (error) {
        console.error('[Supabase] employer employee names error:', error.message);
        setNames({});
        setFrequencies({});
        setEmails({});
        return;
      }
      const map: Record<string, string> = {};
      const freqMap: Record<string, string> = {};
      const emailMap: Record<string, string> = {};
      for (const row of (data as EmployeeDisplayNameRow[]) ?? []) {
        const emp = row.employee_address?.toLowerCase();
        if (emp) {
          map[emp] = row.name ?? '';
          if (row.payment_frequency) freqMap[emp] = row.payment_frequency;
          if (row.email) emailMap[emp] = row.email;
        }
      }
      setNames(map);
      setFrequencies(freqMap);
      setEmails(emailMap);
    } catch (err) {
      console.error('[Supabase] employer employee names error:', err);
      setNames({});
      setFrequencies({});
      setEmails({});
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const upsertName = useCallback(
    async (employeeAddress: string, name: string, paymentFrequency?: string, email?: string) => {
      if (!address) return;
      const payload: Record<string, unknown> = {
        employer_address: address.toLowerCase(),
        employee_address: employeeAddress.toLowerCase(),
        name: (name || '').trim(),
        updated_at: new Date().toISOString(),
      };
      if (paymentFrequency) payload.payment_frequency = paymentFrequency;
      if (email !== undefined) payload.email = (email || '').trim() || null;
      const { error } = await supabase.from('employee_display_names').upsert(
        payload,
        { onConflict: 'employer_address,employee_address' }
      );
      if (error) throw error;
      const key = employeeAddress.toLowerCase();
      setNames((prev) => ({ ...prev, [key]: (name || '').trim() }));
      if (paymentFrequency) setFrequencies((prev) => ({ ...prev, [key]: paymentFrequency }));
      if (email !== undefined) setEmails((prev) => ({ ...prev, [key]: (email || '').trim() }));
    },
    [address]
  );

  return { names, frequencies, emails, isLoading, reload: fetch, upsertName };
}

/* ─── Employer: latest salary payment encrypted handle per employee (from Supabase, for decrypt) ─── */
/* Uses salary_payments when available; falls back to employees.encrypted_salary for new employees not yet paid. */

export function useEmployerLatestPaymentHandles() {
  const { address } = useAccount();
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const employer = address.toLowerCase();
      const map: Record<string, string> = {};

      const { data: paymentData, error: paymentError } = await supabase
        .from('salary_payments')
        .select('employee, encrypted')
        .eq('employer', employer)
        .order('block_number', { ascending: false });

      if (paymentError) {
        console.error('[Supabase] employer latest payment handles error:', paymentError.message);
      } else {
        for (const row of (paymentData ?? [])) {
          const emp = (row as { employee: string; encrypted: string }).employee?.toLowerCase();
          if (emp && !(emp in map)) map[emp] = (row as { employee: string; encrypted: string }).encrypted;
        }
      }

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('address, encrypted_salary')
        .eq('employer', employer)
        .eq('whitelisted', true);

      if (!employeeError && employeeData) {
        for (const row of employeeData as { address: string; encrypted_salary: string | null }[]) {
          const emp = row.address?.toLowerCase();
          const enc = row.encrypted_salary;
          if (emp && enc && typeof enc === 'string' && enc.startsWith('0x') && !(emp in map)) {
            map[emp] = enc;
          }
        }
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

/* ─── Mark invoices as paid (frontend only: call as soon as payment tx is confirmed, not by indexer) ─── */

export async function markInvoicesPaidForMonth(
  employerAddress: string,
  employeeAddresses: string[],
  monthDue: string,
  txHash: string
): Promise<void> {
  if (!employerAddress || !monthDue || !txHash || employeeAddresses.length === 0) return;
  const employer = employerAddress.toLowerCase();
  const now = new Date().toISOString();
  for (const emp of employeeAddresses) {
    const employee = emp.toLowerCase();
    const { error } = await supabase
      .from('employee_invoices')
      .update({ paid_at: now, paid_tx_hash: txHash })
      .eq('employer_address', employer)
      .eq('employee_address', employee)
      .eq('month_due', monthDue);
    if (error) {
      console.error('[Supabase] mark invoice paid error:', error.message);
    }
  }
}
