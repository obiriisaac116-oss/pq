-- 007_scheduled_publish.sql
-- Adds the publish_at column to papers table for scheduled publishing.
-- publish_at is already added in FEAT-003 via src/types/database.ts; this
-- migration ensures the actual DB column exists.

ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS publish_at timestamptz;
