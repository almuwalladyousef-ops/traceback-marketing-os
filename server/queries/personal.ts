import { createServerClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/date";

export async function getPersonalLeads() {
  const db = createServerClient();
  const { data, error } = await db
    .from("personal_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const today = todayStr();
  return (data ?? []).map((p) => ({
    ...p,
    due:
      p.status === "Active" &&
      p.follow_up_date !== null &&
      p.follow_up_date <= today,
  }));
}
