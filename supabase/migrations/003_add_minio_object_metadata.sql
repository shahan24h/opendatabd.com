-- Store private MinIO object metadata instead of permanent public URLs.
ALTER TABLE public.datasets
  ADD COLUMN IF NOT EXISTS object_key text,
  ADD COLUMN IF NOT EXISTS original_filename text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint;

CREATE UNIQUE INDEX IF NOT EXISTS datasets_object_key_unique_idx
  ON public.datasets (object_key)
  WHERE object_key IS NOT NULL;
