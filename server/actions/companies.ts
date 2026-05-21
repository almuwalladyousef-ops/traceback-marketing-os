"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/date";
import { z } from "zod";
import { dbErr } from "@/server/db-error";

const ALLOWED_COMPANY_FIELDS = new Set([
  "name", "url", "industry", "outreach_date", "follow_up_date",
  "follow_up_2_date", "follow_up_3_date", "follow_up_4_date",
  "status", "reply_notes", "archived", "soft_deleted",
]);

const CompanySchema = z.object({
  name: z.string().min(1),
  url: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  outreach_date: z.string().optional().nullable(),
  follow_up_date: z.string().optional().nullable(),
  status: z.enum(["Not Started", "In Progress", "Replied", "In Conversation", "Dead"]),
  reply_notes: z.string().optional().nullable(),
});

export async function createCompany(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = CompanySchema.parse({
    name: raw.name,
    url: raw.url || null,
    industry: raw.industry || null,
    outreach_date: raw.outreach_date || null,
    follow_up_date: raw.follow_up_date || null,
    status: raw.status || "Not Started",
    reply_notes: raw.reply_notes || null,
  });

  const db = createServerClient();
  const { error } = await db.from("companies").insert(parsed);
  if (error) return dbErr(error);

  revalidatePath("/email-outreach");
  return { success: true };
}

export async function updateCompany(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = CompanySchema.parse({
    name: raw.name,
    url: raw.url || null,
    industry: raw.industry || null,
    outreach_date: raw.outreach_date || null,
    follow_up_date: raw.follow_up_date || null,
    status: raw.status || "Not Started",
    reply_notes: raw.reply_notes || null,
  });

  const db = createServerClient();
  const { error } = await db.from("companies").update(parsed).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath("/email-outreach");
  return { success: true };
}

export async function updateCompanyField(id: string, field: string, value: string | null) {
  if (!ALLOWED_COMPANY_FIELDS.has(field)) return { error: "Invalid field" };
  const db = createServerClient();
  const { error } = await db
    .from("companies")
    .update({ [field]: value || null })
    .eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/email-outreach");
  return { success: true };
}

export async function archiveCompany(id: string) {
  const db = createServerClient();
  const today = todayStr();
  const { data } = await db.from("companies").select("archive_date").eq("id", id).single();
  const wasCycled = !!data?.archive_date;
  const update = wasCycled
    ? { soft_deleted: true }
    : { archived: true, archive_date: today };
  const { error } = await db.from("companies").update(update).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath("/email-outreach");
  return { success: true };
}

export async function unarchiveCompany(id: string) {
  const db = createServerClient();
  const { error } = await db.from("companies").update({ archived: false }).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath("/email-outreach");
  return { success: true };
}

export async function reEngageCompany(id: string) {
  const db = createServerClient();
  const { error } = await db.from("companies").update({
    archived: false,
    archive_date: null,
    outreach_date: null,
    follow_up_date: null,
    follow_up_2_date: null,
    follow_up_3_date: null,
    follow_up_4_date: null,
    status: "Not Started" as const,
    reply_notes: null,
  }).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath("/email-outreach");
  return { success: true };
}

export async function bulkSoftDeleteCompanies(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("companies").update({ soft_deleted: true }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/email-outreach");
  return { success: true };
}

export async function bulkDeleteCompanies(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("companies").delete().in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/email-outreach");
  return { success: true };
}

export async function bulkArchiveCompanies(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("companies").update({ archived: true }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/email-outreach");
  return { success: true };
}

export async function bulkUnarchiveCompanies(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("companies").update({ archived: false }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/email-outreach");
  return { success: true };
}

export async function bulkRestoreCompanies(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("companies").update({ soft_deleted: false }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/email-outreach");
  return { success: true };
}

export async function softDeleteCompany(id: string) {
  const db = createServerClient();
  const { error } = await db.from("companies").update({ soft_deleted: true }).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath("/email-outreach");
  return { success: true };
}

export async function restoreCompany(id: string) {
  const db = createServerClient();
  const { error } = await db.from("companies").update({ soft_deleted: false }).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath("/email-outreach");
  return { success: true };
}

export async function deleteCompany(id: string) {
  const db = createServerClient();
  const { error } = await db.from("companies").delete().eq("id", id);
  if (error) return dbErr(error);

  revalidatePath("/email-outreach");
  return { success: true };
}

const VALID_STATUSES = ["Not Started", "In Progress", "Replied", "In Conversation", "Dead"] as const;

export async function importCompanies(
  rows: Array<{
    name: string;
    url?: string;
    industry?: string;
    status?: string;
    outreach_date?: string;
    follow_up_date?: string;
    reply_notes?: string;
  }>
) {
  const db = createServerClient();
  const toInsert = rows.map((r) => ({
    name: r.name,
    url: r.url || null,
    industry: r.industry || null,
    status: (VALID_STATUSES.includes(r.status as typeof VALID_STATUSES[number])
      ? r.status
      : "Not Started") as typeof VALID_STATUSES[number],
    outreach_date: r.outreach_date || null,
    follow_up_date: r.follow_up_date || null,
    reply_notes: r.reply_notes || null,
  }));
  const { error } = await db.from("companies").insert(toInsert);
  if (error) return dbErr(error);
  revalidatePath("/email-outreach");
  return { success: true, count: toInsert.length };
}
