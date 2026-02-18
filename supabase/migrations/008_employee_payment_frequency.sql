-- Payment frequency per employee (monthly, biweekly, weekly)
ALTER TABLE employee_display_names
  ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'monthly';
