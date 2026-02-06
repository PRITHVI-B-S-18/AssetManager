# Supabase setup for Policy section

The **Policies** section stores PDFs in Supabase Storage (free tier: 1 GB).

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → choose org, name, database password, region.
3. Wait for the project to be ready.

## 2. Create the storage bucket

1. In the dashboard: **Storage** → **New bucket**.
2. Name: `policies`.
3. Set **Public bucket** to **ON** (so the app can generate view/download URLs with the anon key).
4. Click **Create bucket**.

## 3. Bucket policies (allow uploads and deletes)

In **Storage** → **Policies** for the `policies` bucket, click **New policy** and add one policy:

- **Policy name**: `Allow anon upload and delete` (or any name under 50 chars)
- **Allowed operation**: check **SELECT**, **INSERT**, **DELETE** (SELECT is required for list/download)
- **Target roles**: `anon`
- **Policy definition**: enter exactly:
  ```text
  bucket_id = 'policies'
  ```
  Do **not** add anything else (e.g. no leading `1` or `true`). The expression must be just `bucket_id = 'policies'`.

Then click **Review** and save. The app will be able to list, upload, download, and delete PDFs in the `policies` bucket.

Or use SQL in **Storage** → **Policies**:

```sql
-- Allow anyone with anon key to list and read (public bucket)
-- Allow insert and delete (actual restriction is in app via canEdit)
CREATE POLICY "Allow anon read"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'policies');

CREATE POLICY "Allow anon insert"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'policies');

CREATE POLICY "Allow anon delete"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'policies');
```

## 4. Add env vars to your app

Copy `.env.example` to `.env` and set:

- **Project URL**: Supabase dashboard → **Settings** → **API** → **Project URL** → `VITE_SUPABASE_URL`
- **anon key**: Same page → **Project API keys** → **anon public** → `VITE_SUPABASE_ANON_KEY`

Restart the dev server after changing `.env`.

## 5. Usage

- **Policies** appears in the sidebar. Open it to list, view, download, and (if you have edit permission) upload and delete PDFs.
- Viewers can only view and download; admins can also upload and delete.
