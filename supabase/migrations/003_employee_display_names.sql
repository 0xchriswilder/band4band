-- ============================================
-- Employee display names (set by employer at onboarding)
-- ============================================

CREATE TABLE IF NOT EXISTS employee_display_names (
  employer_address  TEXT NOT NULL,
  employee_address  TEXT NOT NULL,
  name              TEXT NOT NULL DEFAULT '',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (employer_address, employee_address)
);

CREATE INDEX IF NOT EXISTS idx_employee_display_names_employer ON employee_display_names (employer_address);

ALTER TABLE employee_display_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read employee_display_names" ON employee_display_names FOR SELECT USING (true);
CREATE POLICY "Anon insert employee_display_names" ON employee_display_names FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update employee_display_names" ON employee_display_names FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Service write employee_display_names" ON employee_display_names FOR ALL USING (true) WITH CHECK (true);
