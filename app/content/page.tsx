import { getAllContentPieces, getAllContentAnalysis, getArchivedContentAnalysis, getArchivedContentPieces, getUserArchivedContentPieces } from "@/server/queries/content";
import { ContentClient } from "@/components/content/ContentClient";
import { todayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const [pieces, analysis, deletedAnalysis, archivedPieces, userArchivedPieces] = await Promise.all([
    getAllContentPieces(),
    getAllContentAnalysis(),
    getArchivedContentAnalysis(),
    getArchivedContentPieces(),
    getUserArchivedContentPieces(),
  ]);

  return <ContentClient pieces={pieces} analysis={analysis} deletedAnalysis={deletedAnalysis} archivedPieces={archivedPieces} userArchivedPieces={userArchivedPieces} today={todayStr()} />;
}
