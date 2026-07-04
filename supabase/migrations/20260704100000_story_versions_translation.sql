-- Aggiunge supporto per: testo originale pre-riscrittura, stato traduzione,
-- e le 4 versioni di durata (3/5/10/15 min). "content" esistente = versione 5 min.
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS original_text TEXT,
  ADD COLUMN IF NOT EXISTS original_language TEXT,
  ADD COLUMN IF NOT EXISTS translation_status TEXT NOT NULL DEFAULT 'not_needed',
  ADD COLUMN IF NOT EXISTS content_3min TEXT,
  ADD COLUMN IF NOT EXISTS content_10min TEXT,
  ADD COLUMN IF NOT EXISTS content_15min TEXT;

ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_translation_status_check;
ALTER TABLE public.stories
  ADD CONSTRAINT stories_translation_status_check
  CHECK (translation_status IN ('not_needed', 'pending', 'done'));

COMMENT ON COLUMN public.stories.content IS 'Versione da 5 minuti (durata di riferimento)';
COMMENT ON COLUMN public.stories.original_text IS 'Testo fedele trovato online, anche in lingua originale (es. inglese), prima di qualunque riscrittura AI';
