"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { dbErr } from "@/server/db-error";

const ALLOWED_CONTACT_FIELDS = new Set([
  "name", "role", "email", "x_handle", "linkedin_url",
  "phone", "email_copy_used", "dm_copy_used", "archived",
]);

const ContactSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().min(1),
  role: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  x_handle: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email_copy_used: z.string().optional().nullable(),
  dm_copy_used: z.string().optional().nullable(),
});

export async function createContact(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = ContactSchema.parse({
    company_id: raw.company_id,
    name: raw.name,
    role: raw.role || null,
    email: raw.email || null,
    x_handle: raw.x_handle || null,
    linkedin_url: raw.linkedin_url || null,
    phone: raw.phone || null,
    email_copy_used: raw.email_copy_used || null,
    dm_copy_used: raw.dm_copy_used || null,
  });

  const db = createServerClient();
  const { error } = await db.from("contacts").insert(parsed);
  if (error) return dbErr(error);

  revalidatePath("/email-outreach");
  return { success: true };
}

export async function updateContactField(id: string, field: string, value: string | null) {
  if (!ALLOWED_CONTACT_FIELDS.has(field)) return { error: "Invalid field" };
  const db = createServerClient();
  const { error } = await db.from("contacts").update({ [field]: value || null }).eq("id", id);
  if (error) return dbErr(error);
  revalidatePath("/email-outreach");
  return { success: true };
}

export async function deleteContact(id: string) {
  const db = createServerClient();
  const { error } = await db.from("contacts").delete().eq("id", id);
  if (error) return dbErr(error);

  revalidatePath("/email-outreach");
  return { success: true };
}
