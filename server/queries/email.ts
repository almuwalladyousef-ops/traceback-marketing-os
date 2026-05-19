import { createServerClient } from "@/lib/supabase/server";
import { todayStr, addDaysStr } from "@/lib/date";

export async function getCompanies() {
  const db = createServerClient();
  const { data, error } = await db
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const today = todayStr();
  const thirtyDaysAgo = addDaysStr(today, -30);
  const threeDaysAgo = addDaysStr(today, -3);
  return (data ?? []).map((c) => ({
    ...c,
    due:
      !c.archived &&
      !c.soft_deleted &&
      c.follow_up_date !== null &&
      c.follow_up_date <= today &&
      !["Replied", "In Conversation", "Dead"].includes(c.status),
    dueArchive:
      !c.archived &&
      !c.soft_deleted &&
      c.follow_up_2_date !== null &&
      c.follow_up_2_date <= threeDaysAgo &&
      !["Replied", "In Conversation", "Dead"].includes(c.status),
    reEngageDue:
      !!c.archived &&
      !c.soft_deleted &&
      !!c.follow_up_3_date &&
      c.follow_up_3_date <= thirtyDaysAgo,
  }));
}
