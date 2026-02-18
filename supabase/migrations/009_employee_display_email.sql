-- Email per employee (employer can set at onboarding / edit)
ALTER TABLE employee_display_names
  ADD COLUMN IF NOT EXISTS email TEXT;
