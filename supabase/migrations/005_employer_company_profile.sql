-- ============================================
-- Employer company profile (name shown to employees)
-- ============================================

CREATE TABLE IF NOT EXISTS employer_profiles (
  employer_address TEXT PRIMARY KEY,
  company_name     TEXT NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employer_profiles_address ON employer_profiles (employer_address);

ALTER TABLE employer_profiles ENABLE ROW LEVEL SECURITY;

-- Public read so employees can resolve company name by employer address
CREATE POLICY "Public read employer_profiles" ON employer_profiles FOR SELECT USING (true);

-- Anon insert/update so employer can set their company name from frontend
CREATE POLICY "Anon insert employer_profiles" ON employer_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update employer_profiles" ON employer_profiles FOR UPDATE USING (true) WITH CHECK (true);
