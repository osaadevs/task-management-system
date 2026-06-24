-- Store uploaded file bytes in the database (Render has no persistent disk)
ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS file_data BYTEA,
  ADD COLUMN IF NOT EXISTS file_mime VARCHAR(127),
  ADD COLUMN IF NOT EXISTS file_size INTEGER;
