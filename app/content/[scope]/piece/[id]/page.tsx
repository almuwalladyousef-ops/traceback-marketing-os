import { createServerClient } from "@/lib/supabase/server";
import { PiecePageClient } from "@/components/content/PiecePageClient";
import { notFound } from "next/navigation";
import type { ContentPiece } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function PiecePage({
  params,
}: {
  params: Promise<{ scope: string; id: string }>;
}) {
  const { id } = await params;

  const db = createServerClient();
  const { data, error } = await db
    .from("content_pieces")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return <PiecePageClient piece={data as ContentPiece} />;
}
