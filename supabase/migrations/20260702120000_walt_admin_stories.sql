ALTER TABLE public.stories
  ALTER COLUMN child_id DROP NOT NULL,
  ALTER COLUMN parent_id DROP NOT NULL;

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'it' CHECK (language IN ('it','en','es','fr','de')),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_preset BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('draft','pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS story_type TEXT NOT NULL DEFAULT 'user' CHECK (story_type IN ('user','catalog','seasonal')),
  ADD COLUMN IF NOT EXISTS holiday_tag TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visible_to TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS stories_status_idx ON public.stories(status);
CREATE INDEX IF NOT EXISTS stories_story_type_idx ON public.stories(story_type, holiday_tag);

DROP POLICY IF EXISTS "admin manages all stories" ON public.stories;
CREATE POLICY "admin manages all stories" ON public.stories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "anyone can view approved catalog stories" ON public.stories;
CREATE POLICY "anyone can view approved catalog stories" ON public.stories
  FOR SELECT TO authenticated
  USING (
    story_type IN ('catalog','seasonal')
    AND status = 'approved'
    AND active = true
    AND (visible_from IS NULL OR visible_from <= now())
    AND (visible_to IS NULL OR visible_to >= now())
  );
