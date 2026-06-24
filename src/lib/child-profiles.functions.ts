import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AgeRange = z.enum(["3-5", "6-8", "9-12"]);
const Gender = z.enum(["m", "f", "n"]);
const Language = z.enum(["it", "en", "es", "fr", "de"]);
export type ChildGender = z.infer<typeof Gender>;
export type ChildLanguage = z.infer<typeof Language>;

export interface ChildProfile {
  id: string;
  name: string;
  age_range: "3-5" | "6-8" | "9-12";
  favorite_color: string | null;
  favorite_animal: string | null;
  fears: string | null;
  preferred_voice: string;
  puppet_character: string | null;
  gender: ChildGender;
  language: ChildLanguage;
}

const CreateSchema = z.object({
  name: z.string().min(1).max(40),
  age_range: AgeRange,
  favorite_color: z.string().max(40).optional().nullable(),
  favorite_animal: z.string().max(40).optional().nullable(),
  fears: z.string().max(200).optional().nullable(),
  preferred_voice: z.string().max(20).default("sage"),
  puppet_character: z.string().max(40).optional().nullable(),
  gender: Gender.default("n"),
  language: Language.default("it"),
});

const SELECT_COLS =
  "id,name,age_range,favorite_color,favorite_animal,fears,preferred_voice,puppet_character,gender,language";

export const listChildren = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("child_profiles")
      .select(SELECT_COLS)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ChildProfile[];
  });

export const createChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("child_profiles")
      .insert({ ...data, parent_id: context.userId })
      .select(SELECT_COLS)
      .single();
    if (error) throw new Error(error.message);
    return row as ChildProfile;
  });

export const deleteChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("child_profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdateCharSchema = z.object({
  id: z.string().uuid(),
  puppet_character: z.string().min(1).max(40),
});

export const updateChildCharacter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateCharSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("child_profiles")
      .update({ puppet_character: data.puppet_character })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdatePrefsSchema = z.object({
  id: z.string().uuid(),
  gender: Gender.optional(),
  language: Language.optional(),
});

export const updateChildPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdatePrefsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase.from("child_profiles").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });