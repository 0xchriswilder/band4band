-- Create public bucket for employee avatars (if not exists) and allow anon upload/read
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-avatars', 'employee-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to read (public bucket)
DROP POLICY IF EXISTS "Public read employee-avatars" ON storage.objects;
CREATE POLICY "Public read employee-avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-avatars');

-- Allow anon to upload (for app without auth)
DROP POLICY IF EXISTS "Anon upload employee-avatars" ON storage.objects;
CREATE POLICY "Anon upload employee-avatars"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'employee-avatars');

-- Allow anon to update (upsert)
DROP POLICY IF EXISTS "Anon update employee-avatars" ON storage.objects;
CREATE POLICY "Anon update employee-avatars"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'employee-avatars')
WITH CHECK (bucket_id = 'employee-avatars');

