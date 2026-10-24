-- 001_schema.sql
-- Past Questions Website — database schema
-- Tables: profiles, courses, papers, contact_messages
-- Apply with:  supabase db push   (or psql "$DATABASE_URL" -f this file)

-- =============================================================================
-- profiles
--   One row per auth user. Created automatically by the handle_new_user
--   trigger defined in 002_rls.sql (fires AFTER INSERT on auth.users).
-- =============================================================================
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'student',   -- 'student' | 'admin'
  full_name   text,
  avatar_url  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- courses
-- =============================================================================
CREATE TABLE public.courses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,             -- e.g. 'CS101'
  name        text NOT NULL,                     -- e.g. 'Introduction to Computer Science'
  programme   text,                              -- e.g. 'BSc Computer Science'
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- papers
--   search_vec is a generated tsvector over title + year for full-text search
--   on natural-language titles. Course code/name lookup is performed in the
--   API layer via ILIKE on courses (short codes benefit from prefix search
--   more than FTS tokenisation). A GIN index makes the tsvector fast.
-- =============================================================================
CREATE TABLE public.papers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  course_id   uuid REFERENCES public.courses (id) ON DELETE SET NULL,
  year        int,                               -- e.g. 2023
  semester    text,                              -- 'first' | 'second' | 'resit'
  level       text,                              -- '100' | '200' | '300' | '400' | '500'
  file_path   text NOT NULL,                     -- Storage object key, e.g. 'papers/uuid.pdf'
  file_type   text NOT NULL,                     -- 'pdf' | 'jpg' | 'png'
  status      text NOT NULL DEFAULT 'draft'
              CHECK (status IN ('published', 'draft')),
  downloads   int NOT NULL DEFAULT 0,
  search_vec  tsvector GENERATED ALWAYS AS (
                to_tsvector('english',
                  coalesce(title, '') || ' ' ||
                  coalesce(year::text, '')
                )
              ) STORED,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- contact_messages
-- =============================================================================
CREATE TABLE public.contact_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read        boolean NOT NULL DEFAULT false
);

-- =============================================================================
-- Indexes
-- =============================================================================
-- Full-text search on papers (title + year)
CREATE INDEX papers_search_vec_gin ON public.papers USING GIN (search_vec);

-- Filter-panel lookups
CREATE INDEX papers_course_id_idx ON public.papers (course_id);
CREATE INDEX papers_year_idx      ON public.papers (year);
CREATE INDEX papers_semester_idx  ON public.papers (semester);
CREATE INDEX papers_level_idx     ON public.papers (level);
CREATE INDEX papers_status_idx    ON public.papers (status);

-- =============================================================================
-- updated_at auto-maintenance
--   Both papers and profiles expose an updated_at column; this trigger keeps
--   them current without application code.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER papers_updated_at
  BEFORE UPDATE ON public.papers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- increment_downloads
--   Called by GET /api/papers/[id]/download to atomically bump the counter
--   without a read-modify-write race. SECURITY DEFINER so it bypasses RLS.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.increment_downloads(paper_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.papers SET downloads = downloads + 1 WHERE id = paper_id;
$$;

-- =============================================================================
-- handle_new_user
--   Automatically creates a profile row when a new auth user signs up.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
