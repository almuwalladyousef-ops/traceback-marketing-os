"use client";

import { useState, useTransition } from "react";
import { updateContentStatus } from "@/server/actions/content";
import type { ContentPiece, ContentScope, ContentKind, ContentStatus } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/Badge";

const STATUSES: ContentStatus[] = [
  "Idea",
  "Outline",
  "Script Draft",
  "Script Final",
  "Filming",
  "Editing",
  "Published",
];

interface Props {
  pieces: ContentPiece[];
  scope: ContentScope;
  kind: ContentKind;
  onOpenPiece: (id: string) => void;
}

export function ContentBoard({ pieces, scope, kind, onOpenPiece }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(id: string, newStatus: ContentStatus) {
    startTransition(async () => {
      await updateContentStatus(id, newStatus, scope, kind);
    });
  }

  const byStatus = STATUSES.reduce<Record<ContentStatus, ContentPiece[]>>(
    (acc, s) => ({ ...acc, [s]: [] }),
    {} as Record<ContentStatus, ContentPiece[]>
  );
  pieces.forEach((p) => {
    if (byStatus[p.status]) byStatus[p.status].push(p);
  });

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {STATUSES.map((status) => (
        <div
          key={status}
          className="flex-shrink-0 w-52 rounded-xl p-3"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {status}
            </span>
            <span
              className="text-xs rounded-full w-5 h-5 flex items-center justify-center"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              {byStatus[status].length}
            </span>
          </div>
          <div className="space-y-2">
            {byStatus[status].map((piece) => (
              <div
                key={piece.id}
                onClick={() => onOpenPiece(piece.id)}
                className="p-2.5 rounded-lg cursor-pointer transition-colors hover:border-[var(--accent)]"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <p className="text-xs font-medium leading-tight mb-2" style={{ color: "var(--text)" }}>
                  {piece.title}
                </p>
                {piece.publish_date && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {piece.publish_date}
                  </p>
                )}
                {/* Move to next status */}
                {status !== "Published" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = STATUSES[STATUSES.indexOf(status) + 1];
                      if (next) handleStatusChange(piece.id, next);
                    }}
                    disabled={isPending}
                    className="mt-2 text-xs hover:underline disabled:opacity-50"
                    style={{ color: "var(--accent)" }}
                  >
                    → {STATUSES[STATUSES.indexOf(status) + 1]}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
