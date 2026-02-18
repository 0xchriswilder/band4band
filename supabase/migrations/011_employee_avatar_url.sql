-- Employee avatar URL (stored per employer/employee display row)
ALTER TABLE employee_display_names
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

