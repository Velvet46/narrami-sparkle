
-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user can read own roles" ON public.user_roles;
CREATE POLICY "user can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Bootstrap: claim admin role if no admin exists yet
CREATE OR REPLACE FUNCTION public.claim_admin_if_none()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  admin_count int;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END $$;

GRANT EXECUTE ON FUNCTION public.claim_admin_if_none() TO authenticated;

-- Characters catalog
CREATE TABLE IF NOT EXISTS public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  role_title text NOT NULL DEFAULT 'Amico',
  image_url text NOT NULL,
  voice_id text NOT NULL,
  voice_label text NOT NULL DEFAULT '',
  voice_persona text NOT NULL DEFAULT '',
  accent text NOT NULL DEFAULT 'from-celeste/40 to-celeste/10',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.characters TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.characters TO authenticated;
GRANT ALL ON public.characters TO service_role;

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can view active characters" ON public.characters;
CREATE POLICY "anyone can view active characters" ON public.characters
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins can insert characters" ON public.characters;
CREATE POLICY "admins can insert characters" ON public.characters
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins can update characters" ON public.characters;
CREATE POLICY "admins can update characters" ON public.characters
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins can delete characters" ON public.characters;
CREATE POLICY "admins can delete characters" ON public.characters
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS characters_set_updated_at ON public.characters;
CREATE TRIGGER characters_set_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed
INSERT INTO public.characters (slug, name, role_title, image_url, voice_id, voice_label, voice_persona, accent, sort_order) VALUES
('orso-tom', 'Orso Tom', 'Amico', '/__l5e/assets-v1/e0bffe95-bc3e-4832-9cdd-02435d7ef0a4/orso-tom.png', 'nPczCjzI2devNBz1zQrb', 'Calda e abbraccio', 'voce calda, dolce e rassicurante, come un abbraccio morbido', 'from-celeste/40 to-celeste/10', 1),
('orsetta-lily', 'Orsetta Lily', 'Amica', '/__l5e/assets-v1/09b31949-4e72-418d-bf90-c93017c45884/orsetta-lily.png', 'pFZP5JQG7iQjIQuC4Bku', 'Luminosa e gentile', 'voce luminosa e gentile, dolce e leggera', 'from-pink-300/40 to-pink-100/10', 2),
('dino-dex', 'Dino Dex', 'Eroe', '/__l5e/assets-v1/24308ab7-8847-4f41-8210-95b68529a2e6/dino-dex.png', 'TX3LPaxmHKxFdv7VOQHJ', 'Curiosa e vivace', 'voce curiosa, allegra e vivace, da esploratore', 'from-emerald-400/40 to-emerald-100/10', 3),
('drago-flame', 'Drago Flame', 'Eroe', '/__l5e/assets-v1/f40882c9-fad4-4337-bd28-f9c99b7ca646/drago-flame.png', 'JBFqnCBsd6RMkjVDRZzb', 'Coraggiosa e profonda', 'voce coraggiosa e profonda, ma amichevole, da piccolo drago buono', 'from-rose-500/40 to-amber-200/10', 4),
('unicorno-stella', 'Unicorno Stella', 'Eroe', '/__l5e/assets-v1/20301ccf-f1a0-410f-8fb5-d74fd97349ad/unicorno-stella.png', 'XrExE9yKIg1WjnnlVkGX', 'Sognante e magica', 'voce sognante, magica e melodiosa, piena di stelle', 'from-fuchsia-300/40 to-violet-200/10', 5),
('astronauta-neo', 'Astronauta Neo', 'Eroe', '/__l5e/assets-v1/c54fa5f0-96e1-4101-8b2c-88aa6d97edb3/astronauta-neo.png', 'bIHbv24MWmeRgasZH58o', 'Chiara e spaziale', 'voce chiara e curiosa, da esploratore dello spazio', 'from-sky-400/40 to-slate-200/10', 6),
('pirata-jack', 'Pirata Jack', 'Eroe', '/__l5e/assets-v1/7b9fa59c-074b-42a5-9b1a-cae03a10aceb/pirata-jack.png', 'N2lVS1w4EtoT3dr4eOWO', 'Avventurosa', 'voce avventurosa e giocosa, da pirata buono dei sette mari', 'from-amber-500/40 to-amber-100/10', 7),
('esploratrice-aria', 'Esploratrice Aria', 'Eroe', '/__l5e/assets-v1/d74434ca-538c-4133-81d0-3a54afd4597f/esploratrice-aria.png', 'EXAVITQu4vr4xnSDxMaL', 'Saggia e calma', 'voce saggia, calma e narrante, da esploratrice esperta', 'from-stone-400/40 to-stone-100/10', 8)
ON CONFLICT (slug) DO NOTHING;
