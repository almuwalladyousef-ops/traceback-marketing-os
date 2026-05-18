"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";

const TABLES = [
  "companies",
  "contacts",
  "influencers",
  "personal_leads",
  "content_pieces",
  "content_analysis",
  "comment_logs",
] as const;

export function RealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    const client = getBrowserClient();
    const channels = TABLES.map((table) =>
      client
        .channel(`realtime:${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => router.refresh()
        )
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => client.removeChannel(ch));
    };
  }, [router]);

  return null;
}
