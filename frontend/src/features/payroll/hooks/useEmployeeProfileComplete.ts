import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export interface EmployeeProfileCompleteResult {
  name: string;
  email: string;
  avatarUrl: string;
  isComplete: boolean;
  missingFields: string[];
  isLoading: boolean;
  reload: () => void;
}

export function useEmployeeProfileComplete(
  employeeAddress: string | undefined,
  employerAddress: string | undefined
): EmployeeProfileCompleteResult {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!employeeAddress || !employerAddress) {
      setName('');
      setEmail('');
      setAvatarUrl('');
      return;
    }
    setIsLoading(true);
    try {
      const employee = employeeAddress.toLowerCase();
      const employer = employerAddress.toLowerCase();
      const { data, error } = await supabase
        .from('employee_display_names')
        .select('name, email, avatar_url')
        .eq('employee_address', employee)
        .eq('employer_address', employer)
        .maybeSingle();

      if (error) {
        setName('');
        setEmail('');
        setAvatarUrl('');
        return;
      }
      const row = data as { name?: string; email?: string; avatar_url?: string } | null;
      const displayName = (row?.name ?? '').trim();
      const displayEmail = (row?.email ?? '').trim();
      const displayAvatar = (row?.avatar_url ?? '').trim();

      // Fallback: if the employer never set `employee_display_names.name`, try the latest invoice name.
      // This helps show an existing name immediately for employees who already submitted invoices.
      if (!displayName) {
        const { data: inv, error: invError } = await supabase
          .from('employee_invoices')
          .select('data')
          .eq('employee_address', employee)
          .eq('employer_address', employer)
          .order('month_due', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!invError) {
          const invoiceName = ((inv as { data?: { name?: string } } | null)?.data?.name ?? '').trim();
          setName(invoiceName);
        } else {
          setName('');
        }
      } else {
        setName(displayName);
      }

      setEmail(displayEmail);
      setAvatarUrl(displayAvatar);
    } catch {
      setName('');
      setEmail('');
      setAvatarUrl('');
    } finally {
      setIsLoading(false);
    }
  }, [employeeAddress, employerAddress]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const isComplete = !!(name && email);
  const missingFields: string[] = [];
  if (!name) missingFields.push('name');
  if (!email) missingFields.push('email');

  return { name, email, avatarUrl, isComplete, missingFields, isLoading, reload: fetchProfile };
}
