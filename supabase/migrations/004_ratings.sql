CREATE TABLE public.paper_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(paper_id, session_id)
);

ALTER TABLE public.paper_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can rate" ON public.paper_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read ratings" ON public.paper_ratings FOR SELECT USING (true);
CREATE POLICY "Users can update own rating" ON public.paper_ratings FOR UPDATE USING (true);
