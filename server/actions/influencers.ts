"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { todayStr, addDaysStr } from "@/lib/date";
import { z } from "zod";
import { dbErr } from "@/server/db-error";

const ALLOWED_INFLUENCER_FIELDS = new Set([
  "link", "platform", "status", "archive_date",
  "touch_1", "touch_2", "touch_3",
  "touch_1_date", "touch_2_date", "touch_3_date",
  "notes", "replied",
]);

const InfluencerSchema = z.object({
  link: z.string().min(1),
  platform: z.enum(["IG", "X"]),
  notes: z.string().optional().nullable(),
});

export async function createInfluencer(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = InfluencerSchema.parse({ link: raw.link, platform: raw.platform, notes: raw.notes || null });

  const db = createServerClient();
  const { error } = await db.from("influencers").insert({
    link: parsed.link,
    platform: parsed.platform,
    notes: parsed.notes ?? null,
  });
  if (error) return dbErr(error);

  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function setTouch(
  id: string,
  touch: "touch_1" | "touch_2" | "touch_3",
  checked: boolean
) {
  const db = createServerClient();
  const today = todayStr();
  const dateField = `${touch}_date` as "touch_1_date" | "touch_2_date" | "touch_3_date";
  const update: Record<string, boolean | string | null> = {
    [touch]: checked,
    [dateField]: checked ? today : null,
  };

  const { error } = await db.from("influencers").update(update).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function archiveInfluencer(id: string) {
  const db = createServerClient();
  const today = todayStr();

  // Get current cycle_count
  const { data } = await db.from("influencers").select("cycle_count").eq("id", id).single();
  const cycleCount = (data?.cycle_count ?? 0) + 1;
  const newStatus = cycleCount >= 2 ? "Deleted" : "Archived";

  const { error } = await db.from("influencers").update({
    status: newStatus,
    archive_date: today,
    cycle_count: cycleCount,
  }).eq("id", id);

  if (error) return dbErr(error);

  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function updateInfluencerField(
  id: string,
  field: string,
  value: string | boolean | null
) {
  if (!ALLOWED_INFLUENCER_FIELDS.has(field)) return { error: "Invalid field" };
  const db = createServerClient();
  const { error } = await db.from("influencers").update({ [field]: value }).eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function softDeleteInfluencer(id: string) {
  const db = createServerClient();
  const { error } = await db.from("influencers").update({ status: "Deleted" as const }).eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function hardDeleteInfluencer(id: string) {
  const db = createServerClient();
  const { error } = await db.from("influencers").delete().eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function restoreInfluencer(id: string) {
  const db = createServerClient();
  const { error } = await db.from("influencers").update({ status: "Active" as const }).eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function bulkArchiveInfluencers(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("influencers").update({ status: "Archived" as const }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function bulkSoftDeleteInfluencers(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("influencers").update({ status: "Deleted" as const }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function bulkRestoreInfluencers(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("influencers").update({ status: "Active" as const }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function bulkHardDeleteInfluencers(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("influencers").delete().in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function reEngageInfluencer(id: string) {
  const db = createServerClient();
  const { error } = await db.from("influencers").update({
    status: "Active",
    touch_1: false,
    touch_2: false,
    touch_3: false,
    touch_1_date: null,
    touch_2_date: null,
    touch_3_date: null,
    archive_date: null,
  }).eq("id", id);

  if (error) return dbErr(error);

  revalidatePath("/influencer-outreach");
  return { success: true };
}

export async function importInfluencers(
  rows: Array<{ link: string; platform?: string; notes?: string; status?: string }>
) {
  const db = createServerClient();
  const toInsert = rows.map((r) => ({
    link: r.link,
    platform: (r.platform === "X" ? "X" : "IG") as "IG" | "X",
    notes: r.notes || null,
    status: (["Active", "Archived", "Deleted"].includes(r.status ?? "") ? r.status : "Active") as "Active" | "Archived" | "Deleted",
  }));
  const { error } = await db.from("influencers").insert(toInsert);
  if (error) return dbErr(error);
  revalidatePath("/influencer-outreach");
  return { success: true, count: toInsert.length };
}
