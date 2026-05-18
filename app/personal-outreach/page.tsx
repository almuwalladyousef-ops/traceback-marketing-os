import { getPersonalLeads } from "@/server/queries/personal";
import { PersonalOutreachClient } from "@/components/personal/PersonalOutreachClient";
import { todayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function PersonalOutreachPage() {
  const leads = await getPersonalLeads();
  return <PersonalOutreachClient leads={leads} today={todayStr()} />;
}
