ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'n' CHECK (gender IN ('m','f','n')),
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'it' CHECK (language IN ('it','en','es','fr','de'));