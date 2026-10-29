-- Migration 005: add archived column to papers
ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
