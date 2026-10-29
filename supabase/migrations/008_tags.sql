-- 008_tags.sql
-- Adds the tags column to papers table for paper tagging.

ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
