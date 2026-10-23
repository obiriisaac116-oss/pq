-- 002_rls.sql
-- Row Level Security, helper functions, and the auth trigger.
-- Depends on the tables created in 001_schema.sql.

-- =============================================================================
-- Enable Row Level Security
-- =============================================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages  ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Helper: is the requesting user an admin?
--   SECURITY DEFINER so it can read any profile's role regardless of the
--   caller's own RLS grants (avoids a chicken-and-egg during session checks).
--   `SET search_path` locks the schema for SECURITY DEFINER safety.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =============================================================================
-- profiles
--   Users read/update their own row; admins have full access.
-- =============================================================================
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins full access to profiles"
  ON public.profiles FOR ALL
  USING (is_admin());

-- =============================================================================
-- courses
--   Public can read; only admins can write.
-- =============================================================================
CREATE POLICY "Public can read courses"
  ON public.courses FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING (is_admin());

-- =============================================================================
-- papers
--   Public can read published papers only; admins manage everything.
--   Public never needs write access: the download counter is bumped through
--   the SECURITY DEFINER function below.
-- =============================================================================
CREATE POLICY "Public can read published papers"
  ON public.papers FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage all papers"
  ON public.papers FOR ALL
  USING (is_admin());

-- Increment the download counter for a published paper. Runs as the table
-- owner (SECURITY DEFINER), so it bypasses RLS and lets anonymous/authenticated
-- users bump the counter without any INSERT/UPDATE grant on papers.
CREATE OR REPLACE FUNCTION public.increment_downloads(paper_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.papers
  SET downloads = downloads + 1
  WHERE id = paper_id AND status = 'published';
END;
$$;

-- =============================================================================
-- contact_messages
--   Anyone (anon and authenticated) may submit; only admins read/update/delete.
-- =============================================================================
CREATE POLICY "Anyone can submit contact message"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read contact messages"
  ON public.contact_messages FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete contact messages"
  ON public.contact_messages FOR DELETE
  USING (is_admin());

-- =============================================================================
-- Auto-create a profiles row when a new auth user is created.
--   Fires AFTER INSERT on auth.users. Defaults role to 'student' and pulls
--   full_name from the user metadata if present.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, 'student', NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
