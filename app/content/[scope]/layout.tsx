import { notFound } from "next/navigation";
import { ContentScopeNav } from "@/components/content/ContentScopeNav";

const SCOPES = ["personal", "traceback"] as const;

export default async function ScopeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ scope: string }>;
}) {
  const { scope } = await params;
  if (!SCOPES.includes(scope as (typeof SCOPES)[number])) notFound();

  return (
    <div className="flex flex-col h-full">
      <ContentScopeNav scope={scope} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
