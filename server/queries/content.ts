import { createServerClient } from "@/lib/supabase/server";

export async function getAllContentPieces() {
  const db = createServerClient();
  const { data, error } = await db
    .from("content_pieces")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAllContentAnalysis() {
  const db = createServerClient();
  const { data, error } = await db
    .from("content_analysis")
    .select("*, content_pieces(id, title)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
