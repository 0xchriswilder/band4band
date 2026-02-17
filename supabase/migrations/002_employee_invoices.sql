-- ============================================
-- Employee Invoices (monthly invoice submission)
-- ============================================

CREATE TABLE IF NOT EXISTS employee_invoices (
  id               SERIAL PRIMARY KEY,
  employee_address TEXT NOT NULL,
  employer_address TEXT NOT NULL,
  month_due        TEXT NOT NULL,
  data             JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_address, month_due)
);

CREATE INDEX IF NOT EXISTS idx_employee_invoices_employer ON employee_invoices (employer_address);
CREATE INDEX IF NOT EXISTS idx_employee_invoices_employee ON employee_invoices (employee_address);
CREATE INDEX IF NOT EXISTS idx_employee_invoices_month_due ON employee_invoices (month_due);
CREATE INDEX IF NOT EXISTS idx_employee_invoices_employer_month ON employee_invoices (employer_address, month_due);

ALTER TABLE employee_invoices ENABLE ROW LEVEL SECURITY;

-- Public read (frontend queries by employer or employee)
CREATE POLICY "Public read employee_invoices" ON employee_invoices FOR SELECT USING (true);

-- Anon insert so employees can submit from frontend (one per employee per month enforced by UNIQUE)
CREATE POLICY "Anon insert employee_invoices" ON employee_invoices FOR INSERT WITH CHECK (true);

-- Service role can do everything (for future admin/backfill)
CREATE POLICY "Service write employee_invoices" ON employee_invoices FOR ALL USING (true) WITH CHECK (true);
