"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ContentScope, ContentKind } from "@/lib/supabase/types";
import { dbErr } from "@/server/db-error";

const ALLOWED_CONTENT_FIELDS = new Set([
  "title", "inspiration_link", "status", "notes", "finish_link",
  "publish_date", "about", "copy", "visual_url",
  "todo_draft_copy", "todo_create_visual", "todo_schedule_post", "todo_publish_post",
  "archived",
]);

export async function createContentPiece(scope: ContentScope, kind: ContentKind, title: string) {
  const db = createServerClient();
  const { data, error } = await db
    .from("content_pieces")
    .insert({ scope, kind, title, status: "Idea" })
    .select("id")
    .single();

  if (error) return dbErr(error);

  revalidatePath(`/content/${scope}/${kind.replace("_", "-")}`);
  redirect(`/content/${scope}/piece/${data.id}`);
}

export async function updateContentPiece(id: string, updates: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (ALLOWED_CONTENT_FIELDS.has(k)) safe[k] = v;
  }
  if (!Object.keys(safe).length) return { success: true };

  const db = createServerClient();
  const { error } = await db.from("content_pieces").update(safe).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath(`/content`);
  return { success: true };
}

export async function updateContentStatus(id: string, status: string, scope: ContentScope, kind: ContentKind) {
  const db = createServerClient();
  const { error } = await db.from("content_pieces").update({ status }).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath(`/content/${scope}/${kind.replace("_", "-")}`);
  return { success: true };
}

export async function archiveContentPiece(id: string, scope: ContentScope, kind: ContentKind) {
  const db = createServerClient();
  const { error } = await db.from("content_pieces").update({ archived: true }).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath(`/content/${scope}/${kind.replace("_", "-")}`);
  return { success: true };
}

export async function createAnalysis(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const db = createServerClient();
  const { error } = await db.from("content_analysis").insert({
    scope: raw.scope as ContentScope,
    content_piece_id: raw.content_piece_id || null,
    what_worked: raw.what_worked || null,
    what_didnt: raw.what_didnt || null,
    key_lesson: raw.key_lesson || null,
    apply_to_next: raw.apply_to_next || null,
  });

  if (error) return dbErr(error);

  revalidatePath(`/content/${raw.scope}/analysis`);
  return { success: true };
}

export async function updateAnalysis(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const db = createServerClient();
  const { error } = await db.from("content_analysis").update({
    content_piece_id: raw.content_piece_id || null,
    what_worked: raw.what_worked || null,
    what_didnt: raw.what_didnt || null,
    key_lesson: raw.key_lesson || null,
    apply_to_next: raw.apply_to_next || null,
  }).eq("id", id);

  if (error) return dbErr(error);

  revalidatePath(`/content/${raw.scope}/analysis`);
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
