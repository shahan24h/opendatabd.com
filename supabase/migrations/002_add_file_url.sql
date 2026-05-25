-- Add file_url column to datasets for R2-hosted files
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS file_url text;
