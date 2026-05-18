import { getAllContentPieces, getAllContentAnalysis } from "@/server/queries/content";
import { ContentClient } from "@/components/content/ContentClient";
import { todayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const [pieces, analysis] = await Promise.all([
    getAllContentPieces(),
    getAllContentAnalysis(),
  ]);

  return <ContentClient pieces={pieces} analysis={analysis} today={todayStr()} />;
}
