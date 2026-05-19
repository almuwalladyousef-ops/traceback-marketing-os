"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { ContentScope, ContentKind } from "@/lib/supabase/types";
import { dbErr } from "@/server/db-error";

const ALLOWED_CONTENT_FIELDS = new Set([
  "title", "inspiration_link", "status", "notes", "finish_link",
  "publish_date", "about", "copy", "visual_url",
  "todo_draft_copy", "todo_create_visual", "todo_schedule_post", "todo_publish_post",
  "archived", "user_archived",
]);

const NULLABLE_DATE_FIELDS = new Set(["publish_date"]);

export async function updateContentPiece(id: string, updates: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (ALLOWED_CONTENT_FIELDS.has(k)) {
      safe[k] = (NULLABLE_DATE_FIELDS.has(k) && v === "") ? null : v;
    }
  }
  if (!Object.keys(safe).length) return { success: true };

  const db = createServerClient();
  const { error } = await db.from("content_pieces").update(safe).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath(`/content`);
  return { success: true };
}

export async function createContentPieceAndReturn(
  scope: ContentScope,
  kind: ContentKind,
  title: string,
  defaultStatus = "Idea",
  inspiration_link = "",
  notes = "",
) {
  const db = createServerClient();
  const { data, error } = await db
    .from("content_pieces")
    .insert({ scope, kind, title, status: defaultStatus, inspiration_link: inspiration_link || null, notes: notes || null })
    .select("*")
    .single();

  if (error) return dbErr(error);
  revalidatePath("/content");
  return { data };
}

export async function createAnalysisEntry(params: {
  scope: ContentScope;
  content_piece_id: string | null;
  what_worked: string;
  what_didnt: string;
  key_lesson: string;
  apply_to_next: string;
}) {
  const db = createServerClient();
  const { data, error } = await db
    .from("content_analysis")
    .insert({
      scope: params.scope,
      content_piece_id: params.content_piece_id || null,
      what_worked: params.what_worked || null,
      what_didnt: params.what_didnt || null,
      key_lesson: params.key_lesson || null,
      apply_to_next: params.apply_to_next || null,
    })
    .select("*")
    .single();

  if (error) return dbErr(error);
  revalidatePath("/content");
  return { data };
}

export async function deleteContentPiece(id: string) {
  const db = createServerClient();
  const { error } = await db.from("content_pieces").update({ archived: true }).eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function bulkSoftDeleteContentPieces(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("content_pieces").update({ archived: true }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function bulkUnarchiveContentPieces(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("content_pieces").update({ user_archived: false }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function bulkRestoreContentPieces(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("content_pieces").update({ archived: false }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function bulkHardDeleteContentPieces(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("content_pieces").delete().in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function hardDeleteContentPiece(id: string) {
  const db = createServerClient();
  const { error } = await db.from("content_pieces").delete().eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function deleteAnalysisEntry(id: string) {
  const db = createServerClient();
  const { error } = await db.from("content_analysis").update({ archived: true }).eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function restoreAnalysisEntry(id: string) {
  const db = createServerClient();
  const { error } = await db.from("content_analysis").update({ archived: false }).eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function hardDeleteAnalysisEntry(id: string) {
  const db = createServerClient();
  const { error } = await db.from("content_analysis").delete().eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function bulkDeleteAnalysisEntries(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("content_analysis").update({ archived: true }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function bulkRestoreAnalysisEntries(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("content_analysis").update({ archived: false }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}

export async function bulkHardDeleteAnalysisEntries(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("content_analysis").delete().in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/content");
  return { success: true };
}
