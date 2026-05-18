import { getCommentData } from "@/server/queries/comments";
import { CommentHackingClient } from "@/components/comments/CommentHackingClient";

export const dynamic = "force-dynamic";

export default async function CommentHackingPage() {
  const data = await getCommentData();
  return <CommentHackingClient {...data} />;
}
