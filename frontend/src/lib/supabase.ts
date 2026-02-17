import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ─── TypeScript types for our tables ─── */

export interface PayrollRow {
  id: number;
  address: string;
  creator: string;
  deployed_at_block: number;
  last_indexed_block: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeRow {
  id: number;
  address: string;
  employer: string;
  whitelisted: boolean;
  encrypted_salary: string | null;
  input_proof: string | null;
  signature: string | null;
  added_at: string;
  removed_at: string | null;
}

export interface SalaryPaymentRow {
  id: number;
  employer: string;
  employee: string;
  tx_hash: string;
  block_number: number;
  encrypted: string;
  timestamp: string;
  claimed: boolean;
  payroll_address: string;
}

export interface IndexerMetaRow {
  key: string;
  value: string;
}

export interface EmployeeInvoiceData {
  name: string;
  role: string;
}

export interface EmployeeInvoiceRow {
  id: number;
  employee_address: string;
  employer_address: string;
  month_due: string;
  data: EmployeeInvoiceData;
  created_at: string;
  paid_at: string | null;
  paid_tx_hash: string | null;
}

export interface EmployeeDisplayNameRow {
  employer_address: string;
  employee_address: string;
  name: string;
  updated_at: string;
}
