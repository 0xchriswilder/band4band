-- ============================================
-- Optional company profile fields
-- ============================================

ALTER TABLE employer_profiles
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS website  TEXT;
