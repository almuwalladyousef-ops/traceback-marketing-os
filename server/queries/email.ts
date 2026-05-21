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
  const twoDaysAgo = addDaysStr(today, -2);
  const fourDaysAgo = addDaysStr(today, -4);
  const fiveDaysAgo = addDaysStr(today, -5);
  const sixDaysAgo = addDaysStr(today, -6);

  return (data ?? []).map((c) => {
    const inactive = ["Replied", "In Conversation", "Dead"].includes(c.status);
    const due =
      !c.archived &&
      !c.soft_deleted &&
      !inactive &&
      !!c.outreach_date &&
      (
        (!c.follow_up_date && c.outreach_date <= twoDaysAgo) ||
        (!c.follow_up_2_date && !!c.follow_up_date && c.follow_up_date <= fourDaysAgo) ||
        (!c.follow_up_3_date && !!c.follow_up_2_date && c.follow_up_2_date <= fiveDaysAgo) ||
        (!c.follow_up_4_date && !!c.follow_up_3_date && c.follow_up_3_date <= sixDaysAgo)
      );

    return {
      ...c,
      due,
      dueArchive:
        !c.archived &&
        !c.soft_deleted &&
        !inactive &&
        !!c.follow_up_4_date &&
        c.follow_up_4_date <= threeDaysAgo,
      reEngageDue:
        !!c.archived &&
        !c.soft_deleted &&
        !!c.archive_date &&
        c.archive_date <= thirtyDaysAgo,
    };
  });
}
