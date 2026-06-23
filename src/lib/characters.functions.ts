import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PuppetCharacter } from "@/lib/characters";

type Row = {
  id: string;
  slug: string;
  name: string;
  role_title: string;
  image_url: string;
  voice_id: string;
  voice_label: string;
  voice_persona: string;
  accent: string;
  sort_order: number;
  active: boolean;
};

function toClient(r: Row): PuppetCharacter & { dbId: string; active: boolean; sortOrder: number } {
  return {
    id: r.slug,
    name: r.name,
    role: r.role_title,
    image: r.image_url,
    voiceId: r.voice_id,
    voiceLabel: r.voice_label,
    voicePersona: r.voice_persona,
    accent: r.accent,
    dbId: r.id,
    active: r.active,
    sortOrder: r.sort_order,
  };
}

export const listCharacters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("characters")
      .select("id,slug,name,role_title,image_url,voice_id,voice_label,voice_persona,accent,sort_order,active")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => toClient(r as Row));
  });

const UpsertSchema = z.object({
  dbId: z.string().uuid().optional().nullable(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(60),
  role_title: z.string().max(40).default("Amico"),
  image_url: z.string().min(1).max(500),
  voice_id: z.string().min(1).max(100),
  voice_label: z.string().max(60).default(""),
  voice_persona: z.string().max(300).default(""),
  accent: z.string().max(120).default("from-celeste/40 to-celeste/10"),
  sort_order: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const upsertCharacter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => UpsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    const payload = {
      slug: data.slug,
      name: data.name,
      role_title: data.role_title,
      image_url: data.image_url,
      voice_id: data.voice_id,
      voice_label: data.voice_label,
      voice_persona: data.voice_persona,
      accent: data.accent,
      sort_order: data.sort_order,
      active: data.active,
    };
    if (data.dbId) {
      const { error } = await context.supabase.from("characters").update(payload).eq("id", data.dbId);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("characters").insert(payload);
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteCharacter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ dbId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("characters").delete().eq("id", data.dbId);
    if (error) throw error;
    return { ok: true };
  });

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw error;
    return !!data;
  });

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_admin_if_none");
    if (error) throw error;
    return { claimed: !!data };
  });