-- 003_subscribers.sql
--
-- Creates the subscribers table for email subscription functionality.
-- Depends on the is_admin() function defined in 002_rls.sql.

CREATE TABLE IF NOT EXISTS subscribers (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text         NOT NULL UNIQUE,
  created_at timestamptz  NOT NULL DEFAULT now(),
  confirmed  boolean      NOT NULL DEFAULT true
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON subscribers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage subscribers"
  ON subscribers
  FOR ALL
  USING (is_admin());
