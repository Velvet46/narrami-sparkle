import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StartSessionSchema = z.object({
  childId: z.string().uuid().optional(),
  storyId: z.string().uuid().optional(),
});

export const startListeningSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StartSessionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("listening_sessions")
      .insert({
        parent_id: context.userId,
        child_id: data.childId ?? null,
        story_id: data.storyId ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

const EndSessionSchema = z.object({
  id: z.string().uuid(),
  durationSeconds: z.number().int().min(0),
  completed: z.boolean().default(false),
});

export const endListeningSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EndSessionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("listening_sessions")
      .update({ duration_seconds: data.durationSeconds, completed: data.completed })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listListeningSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("listening_sessions")
      .select("id,child_id,story_id,started_at,duration_seconds,completed")
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
