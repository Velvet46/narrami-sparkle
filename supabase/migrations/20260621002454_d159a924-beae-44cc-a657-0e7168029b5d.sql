
CREATE TABLE public.child_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_range TEXT NOT NULL CHECK (age_range IN ('3-5','6-8','9-12')),
  favorite_color TEXT,
  favorite_animal TEXT,
  fears TEXT,
  preferred_voice TEXT NOT NULL DEFAULT 'sage',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated;
GRANT ALL ON public.child_profiles TO service_role;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent manages own children" ON public.child_profiles
  FOR ALL USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);
CREATE INDEX child_profiles_parent_idx ON public.child_profiles(parent_id);

CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  mode TEXT NOT NULL,
  duration INT NOT NULL,
  age TEXT NOT NULL,
  cover_key TEXT NOT NULL DEFAULT 'forest',
  favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent manages own stories" ON public.stories
  FOR ALL USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);
CREATE INDEX stories_child_idx ON public.stories(child_id, created_at DESC);
CREATE INDEX stories_parent_idx ON public.stories(parent_id, created_at DESC);
