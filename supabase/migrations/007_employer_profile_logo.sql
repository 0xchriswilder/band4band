-- Company logo URL for employer profile (shown in sidebar and transaction history)
ALTER TABLE employer_profiles
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
