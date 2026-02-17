-- ============================================
-- Confidential Payroll dApp — Supabase Schema
-- ============================================

-- Indexer metadata (cursor tracking)
CREATE TABLE IF NOT EXISTS indexer_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Payroll contracts discovered by factory events
CREATE TABLE IF NOT EXISTS payrolls (
  id                SERIAL PRIMARY KEY,
  address           TEXT UNIQUE NOT NULL,
  creator           TEXT NOT NULL,
  deployed_at_block INTEGER NOT NULL DEFAULT 0,
  last_indexed_block INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payrolls_creator ON payrolls (creator);

-- Employees onboarded via payroll contracts
CREATE TABLE IF NOT EXISTS employees (
  id               SERIAL PRIMARY KEY,
  address          TEXT UNIQUE NOT NULL,
  employer         TEXT NOT NULL,
  whitelisted      BOOLEAN NOT NULL DEFAULT true,
  encrypted_salary TEXT,
  input_proof      TEXT,
  signature        TEXT,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_employees_employer ON employees (employer);
CREATE INDEX IF NOT EXISTS idx_employees_address  ON employees (address);

-- Salary payments indexed from SalaryPaid events
CREATE TABLE IF NOT EXISTS salary_payments (
  id              SERIAL PRIMARY KEY,
  employer        TEXT NOT NULL DEFAULT '',
  employee        TEXT NOT NULL,
  tx_hash         TEXT NOT NULL,
  block_number    INTEGER NOT NULL,
  encrypted       TEXT NOT NULL,
  timestamp       TIMESTAMPTZ NOT NULL,
  claimed         BOOLEAN NOT NULL DEFAULT false,
  payroll_address TEXT NOT NULL,
  UNIQUE (tx_hash, employee)
);

CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON salary_payments (employee);
CREATE INDEX IF NOT EXISTS idx_salary_payments_employer ON salary_payments (employer);
CREATE INDEX IF NOT EXISTS idx_salary_payments_payroll  ON salary_payments (payroll_address);

-- Salary update history from EmployeeUpdated events
CREATE TABLE IF NOT EXISTS salary_updates (
  id              SERIAL PRIMARY KEY,
  employer        TEXT NOT NULL,
  employee        TEXT NOT NULL,
  encrypted_salary TEXT NOT NULL,
  tx_hash         TEXT NOT NULL,
  block_number    INTEGER NOT NULL,
  timestamp       TIMESTAMPTZ NOT NULL,
  payroll_address TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_salary_updates_employee ON salary_updates (employee);
CREATE INDEX IF NOT EXISTS idx_salary_updates_employer ON salary_updates (employer);

-- Payroll run summary (one row per batchPaySalaries tx)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id              SERIAL PRIMARY KEY,
  employer        TEXT NOT NULL,
  tx_hash         TEXT UNIQUE NOT NULL,
  block_number    INTEGER NOT NULL,
  employee_count  INTEGER NOT NULL DEFAULT 0,
  timestamp       TIMESTAMPTZ NOT NULL,
  payroll_address TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_employer ON payroll_runs (employer);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_payroll  ON payroll_runs (payroll_address);

-- Enable Row Level Security (optional, can restrict later)
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexer_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anon key) for frontend queries
CREATE POLICY "Public read payrolls" ON payrolls FOR SELECT USING (true);
CREATE POLICY "Public read employees" ON employees FOR SELECT USING (true);
CREATE POLICY "Public read salary_payments" ON salary_payments FOR SELECT USING (true);
CREATE POLICY "Public read indexer_meta" ON indexer_meta FOR SELECT USING (true);
CREATE POLICY "Public read salary_updates" ON salary_updates FOR SELECT USING (true);
CREATE POLICY "Public read payroll_runs" ON payroll_runs FOR SELECT USING (true);

-- Service role can do everything (indexer uses service key)
CREATE POLICY "Service write payrolls" ON payrolls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write salary_payments" ON salary_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write indexer_meta" ON indexer_meta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write salary_updates" ON salary_updates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write payroll_runs" ON payroll_runs FOR ALL USING (true) WITH CHECK (true);
