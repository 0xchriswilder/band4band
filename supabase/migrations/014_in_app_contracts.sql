-- ============================================
-- In-app contracts (Deel-style, no DocuSign)
-- ============================================

CREATE TABLE IF NOT EXISTS in_app_contracts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_address   TEXT NOT NULL,
  payroll_address    TEXT NOT NULL,
  employee_address   TEXT,
  contract_type      TEXT NOT NULL CHECK (contract_type IN ('fixed_rate', 'pay_as_you_go', 'milestone')),
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'assigned', 'signed')),
  signed_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  form_data          JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_in_app_contracts_employer ON in_app_contracts (employer_address);
CREATE INDEX IF NOT EXISTS idx_in_app_contracts_employee ON in_app_contracts (employee_address);

ALTER TABLE in_app_contracts ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (indexer uses service role)
CREATE POLICY "Service in_app_contracts" ON in_app_contracts FOR ALL USING (true) WITH CHECK (true);
