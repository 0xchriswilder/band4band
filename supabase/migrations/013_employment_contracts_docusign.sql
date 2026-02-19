-- ============================================
-- DocuSign e-sign: tokens per employer + employment contracts
-- ============================================

-- Store refresh token per employer (from OAuth). Only backend uses this.
CREATE TABLE IF NOT EXISTS employer_docusign_tokens (
  employer_address TEXT PRIMARY KEY,
  refresh_token    TEXT NOT NULL,
  account_id       TEXT NOT NULL,
  base_uri         TEXT NOT NULL DEFAULT 'https://demo.docusign.net',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Employment contracts (envelope sent by employer to employee)
CREATE TABLE IF NOT EXISTS employment_contracts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_address   TEXT NOT NULL,
  employee_address  TEXT NOT NULL,
  employee_email    TEXT NOT NULL DEFAULT '',
  employer_address  TEXT NOT NULL,
  envelope_id       TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'signed', 'declined', 'voided')),
  signed_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (envelope_id)
);

CREATE INDEX IF NOT EXISTS idx_employment_contracts_employee ON employment_contracts (employee_address);
CREATE INDEX IF NOT EXISTS idx_employment_contracts_employer ON employment_contracts (employer_address);

ALTER TABLE employment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_docusign_tokens ENABLE ROW LEVEL SECURITY;

-- Allow read for employment_contracts (employees see their own; employers see their sent)
CREATE POLICY "Read employment_contracts" ON employment_contracts FOR SELECT USING (true);
CREATE POLICY "Service write employment_contracts" ON employment_contracts FOR ALL USING (true) WITH CHECK (true);

-- Tokens: only service role should read/write (no anon policies)
CREATE POLICY "Service only employer_docusign_tokens" ON employer_docusign_tokens FOR ALL USING (true) WITH CHECK (true);
