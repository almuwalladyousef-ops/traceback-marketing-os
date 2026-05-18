import { getContentPieces } from "@/server/queries/content";
import { ContentListClient } from "@/components/content/ContentListClient";
import { notFound } from "next/navigation";
import type { ContentScope } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function BlogsPage({
  params,
}: {
  params: Promise<{ scope: string }>;
}) {
  const { scope } = await params;
  if (!["personal", "traceback"].includes(scope)) notFound();

  const pieces = await getContentPieces(scope as ContentScope, "blogs");
  return <ContentListClient pieces={pieces} scope={scope as ContentScope} kind="blogs" />;
}
