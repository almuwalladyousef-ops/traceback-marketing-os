import { getAnalysis, getContentPiecesForScope } from "@/server/queries/content";
import { AnalysisClient } from "@/components/content/AnalysisClient";
import { notFound } from "next/navigation";
import type { ContentScope } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ scope: string }>;
}) {
  const { scope } = await params;
  if (!["personal", "traceback"].includes(scope)) notFound();

  const [entries, pieces] = await Promise.all([
    getAnalysis(scope as ContentScope),
    getContentPiecesForScope(scope as ContentScope),
  ]);

  return <AnalysisClient entries={entries} scope={scope as ContentScope} pieces={pieces} />;
}
