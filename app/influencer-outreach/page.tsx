import { createServerClient } from "@/lib/supabase/server";
import { influencerDueTouch, todayStr } from "@/lib/date";
import { InfluencerClient } from "@/components/influencer/InfluencerClient";
import type { Influencer } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function InfluencerOutreachPage() {
  const db = createServerClient();
  const { data } = await db
    .from("influencers")
    .select("*")
    .order("created_at", { ascending: false });

  const rows: Influencer[] = data ?? [];
  const influencers = rows.map((i) => ({
    ...i,
    dueTouch: influencerDueTouch(i),
  }));

  return <InfluencerClient influencers={influencers} today={todayStr()} />;
}
