"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { dbErr } from "@/server/db-error";

const ALLOWED_PERSONAL_FIELDS = new Set([
  "name", "handle_or_url", "phone", "email", "where_found",
  "date_found", "follow_up_date", "date_contacted", "notes", "status",
]);

const LeadSchema = z.object({
  name: z.string().min(1),
  handle_or_url: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  where_found: z.string().optional().nullable(),
  date_found: z.string().optional().nullable(),
  follow_up_date: z.string().optional().nullable(),
  date_contacted: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["Active", "Archived", "Dead"]),
});

export async function createPersonalLead(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = LeadSchema.parse({
    name: raw.name,
    handle_or_url: raw.handle_or_url || null,
    phone: raw.phone || null,
    email: raw.email || null,
    where_found: raw.where_found || null,
    date_found: raw.date_found || null,
    follow_up_date: raw.follow_up_date || null,
    date_contacted: raw.date_contacted || null,
    notes: raw.notes || null,
    status: raw.status || "Active",
  });

  const db = createServerClient();
  const { error } = await db.from("personal_leads").insert(parsed);
  if (error) return dbErr(error);

  revalidatePath("/personal-outreach");
  return { success: true };
}

export async function updatePersonalLeadField(
  id: string,
  field: string,
  value: string | null
) {
  if (!ALLOWED_PERSONAL_FIELDS.has(field)) return { error: "Invalid field" };
  const db = createServerClient();
  const { error } = await db.from("personal_leads").update({ [field]: value || null }).eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/personal-outreach");
  return { success: true };
}

export async function softDeletePersonalLead(id: string) {
  const db = createServerClient();
  const { error } = await db.from("personal_leads").update({ status: "Dead" as const }).eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/personal-outreach");
  return { success: true };
}

export async function hardDeletePersonalLead(id: string) {
  const db = createServerClient();
  const { error } = await db.from("personal_leads").delete().eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/personal-outreach");
  return { success: true };
}

export async function bulkUpdatePersonalLeadStatus(ids: string[], status: "Active" | "Archived" | "Dead") {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("personal_leads").update({ status }).in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/personal-outreach");
  return { success: true };
}

export async function bulkHardDeletePersonalLeads(ids: string[]) {
  if (!ids.length) return { success: true };
  const db = createServerClient();
  const { error } = await db.from("personal_leads").delete().in("id", ids);
  if (error) return dbErr(error);
  revalidatePath("/personal-outreach");
  return { success: true };
}

export async function updatePersonalLead(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = LeadSchema.parse({
    name: raw.name,
    handle_or_url: raw.handle_or_url || null,
    phone: raw.phone || null,
    email: raw.email || null,
    where_found: raw.where_found || null,
    date_found: raw.date_found || null,
    follow_up_date: raw.follow_up_date || null,
    status: raw.status || "Active",
  });

  const db = createServerClient();
  const { error } = await db.from("personal_leads").update(parsed).eq("id", id);
  if (error) return dbErr(error);

  revalidatePath("/personal-outreach");
  return { success: true };
}

export async function importPersonalLeads(
  rows: Array<{
    name: string;
    handle_or_url?: string;
    phone?: string;
    email?: string;
    where_found?: string;
    date_found?: string;
    follow_up_date?: string;
    date_contacted?: string;
    notes?: string;
    status?: string;
  }>
) {
  const db = createServerClient();
  const toInsert = rows.map((r) => ({
    name: r.name,
    handle_or_url: r.handle_or_url || null,
    phone: r.phone || null,
    email: r.email || null,
    where_found: r.where_found || null,
    date_found: r.date_found || null,
    follow_up_date: r.follow_up_date || null,
    date_contacted: r.date_contacted || null,
    notes: r.notes || null,
    status: (["Active", "Archived", "Dead"].includes(r.status ?? "") ? r.status : "Active") as "Active" | "Archived" | "Dead",
  }));
  const { error } = await db.from("personal_leads").insert(toInsert);
  if (error) return dbErr(error);
  revalidatePath("/personal-outreach");
  return { success: true, count: toInsert.length };
}
