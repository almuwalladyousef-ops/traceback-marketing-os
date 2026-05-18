import { createServerClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/date";

export async function getCompanies() {
  const db = createServerClient();
  const { data, error } = await db
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const today = todayStr();
  return (data ?? []).map((c) => ({
    ...c,
    due:
      !c.archived &&
      !c.soft_deleted &&
      c.follow_up_date !== null &&
      c.follow_up_date <= today &&
      !["Replied", "In Conversation", "Dead"].includes(c.status),
  }));
}

export async function getCompanyWithContacts(id: string) {
  const db = createServerClient();
  const [companyRes, contactsRes] = await Promise.all([
    db.from("companies").select("*").eq("id", id).single(),
    db.from("contacts").select("*").eq("company_id", id).eq("archived", false).order("created_at"),
  ]);
  if (companyRes.error) throw companyRes.error;
  return { company: companyRes.data, contacts: contactsRes.data ?? [] };
}
