import { createServerClient } from "@/lib/supabase/server";
import type { ContentScope, ContentKind } from "@/lib/supabase/types";

export async function getContentPieces(scope: ContentScope, kind: ContentKind) {
  const db = createServerClient();
  const { data, error } = await db
    .from("content_pieces")
    .select("*")
    .eq("scope", scope)
    .eq("kind", kind)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getContentPiece(id: string) {
  const db = createServerClient();
  const { data, error } = await db
    .from("content_pieces")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAnalysis(scope: ContentScope) {
  const db = createServerClient();
  const { data, error } = await db
    .from("content_analysis")
    .select("*, content_pieces(id, title)")
    .eq("scope", scope)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getContentPiecesForScope(scope: ContentScope) {
  const db = createServerClient();
  const { data } = await db
    .from("content_pieces")
    .select("id,title")
    .eq("scope", scope)
    .eq("archived", false)
    .order("title");

  return data ?? [];
}

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
