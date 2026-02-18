-- Create public bucket for employer logos (if not exists) and allow anon upload/read
INSERT INTO storage.buckets (id, name, public)
VALUES ('employer-logos', 'employer-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to read (public bucket)
DROP POLICY IF EXISTS "Public read employer-logos" ON storage.objects;
CREATE POLICY "Public read employer-logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'employer-logos');

-- Allow anon to upload (for app without auth)
DROP POLICY IF EXISTS "Anon upload employer-logos" ON storage.objects;
CREATE POLICY "Anon upload employer-logos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'employer-logos');

-- Allow anon to update (upsert)
DROP POLICY IF EXISTS "Anon update employer-logos" ON storage.objects;
CREATE POLICY "Anon update employer-logos"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'employer-logos')
WITH CHECK (bucket_id = 'employer-logos');
