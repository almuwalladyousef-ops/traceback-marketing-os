import { createServerClient } from "@/lib/supabase/server";
import { influencerDueTouch, influencerDueArchive } from "@/lib/date";
import type { InfluencerStatus } from "@/lib/supabase/types";

export async function getInfluencers(status: InfluencerStatus = "Active") {
  const db = createServerClient();
  const query = db
    .from("influencers")
    .select("*")
    .order("created_at", { ascending: false });

  if (status === "Deleted") {
    query.eq("status", "Deleted");
  } else {
    query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((i) => ({
    ...i,
    dueTouch: influencerDueTouch(i),
    dueArchive: influencerDueArchive(i),
  }));
}
