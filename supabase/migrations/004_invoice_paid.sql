-- ============================================
-- Paid state for employee invoices (set by frontend after tx confirm)
-- ============================================

ALTER TABLE employee_invoices
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS paid_tx_hash TEXT NULL;

-- Anon can update (frontend marks invoices paid after payment tx confirm)
CREATE POLICY "Anon update employee_invoices" ON employee_invoices FOR UPDATE USING (true) WITH CHECK (true);
