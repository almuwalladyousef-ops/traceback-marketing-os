"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ContentBoard } from "@/components/content/ContentBoard";
import { Table, Thead, Th, Tbody, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { createContentPiece } from "@/server/actions/content";
import type { ContentPiece, ContentScope, ContentKind } from "@/lib/supabase/types";
import { LayoutGrid, List, Plus } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "blue" | "green" | "yellow"> = {
  Idea: "default",
  Outline: "blue",
  "Script Draft": "blue",
  "Script Final": "blue",
  Filming: "yellow",
  Editing: "yellow",
  Published: "green",
};

interface Props {
  pieces: ContentPiece[];
  scope: ContentScope;
  kind: ContentKind;
}

export function ContentListClient({ pieces, scope, kind }: Props) {
  const router = useRouter();
  const [view, setView] = useState<"board" | "table">("board");
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!title.trim()) return;
    startTransition(async () => {
      await createContentPiece(scope, kind, title.trim());
    });
  }

  function openPiece(id: string) {
    router.push(`/content/${scope}/piece/${id}`);
  }

  const kindLabel = { long_form: "Long Form", short_form: "Short Form", blogs: "Blogs / Text" }[kind];

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-y-3">
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            {kindLabel}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("board")}
              className="p-1.5 rounded transition-colors"
              style={{
                backgroundColor: view === "board" ? "var(--surface-2)" : "transparent",
                color: view === "board" ? "var(--text)" : "var(--text-muted)",
              }}
              title="Board view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView("table")}
              className="p-1.5 rounded transition-colors"
              style={{
                backgroundColor: view === "table" ? "var(--surface-2)" : "transparent",
                color: view === "table" ? "var(--text)" : "var(--text-muted)",
              }}
              title="Table view"
            >
              <List size={16} />
            </button>
            <Button variant="primary" size="sm" onClick={() => setShowNew(true)}>
              <Plus size={14} />
              New piece
            </Button>
          </div>
        </div>

        {view === "board" ? (
          <ContentBoard pieces={pieces} scope={scope} kind={kind} onOpenPiece={openPiece} />
        ) : (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
          >
            <Table>
              <Thead>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Publish Date</Th>
              </Thead>
              <Tbody>
                {pieces.length === 0 && (
                  <Tr>
                    <Td className="text-center py-8" colSpan={3}>
                      <span style={{ color: "var(--text-muted)" }}>No pieces yet.</span>
                    </Td>
                  </Tr>
                )}
                {pieces.map((p) => (
                  <Tr key={p.id} onClick={() => openPiece(p.id)}>
                    <Td>
                      <span className="font-medium" style={{ color: "var(--text)" }}>{p.title}</span>
                    </Td>
                    <Td>
                      <Badge variant={STATUS_COLORS[p.status] ?? "default"}>{p.status}</Badge>
                    </Td>
                    <Td className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {p.publish_date ?? "—"}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New content piece">
        <div className="space-y-3">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title..."
          />
          <div className="flex gap-2 pt-1">
            <Button variant="primary" size="sm" onClick={handleCreate} disabled={isPending || !title.trim()}>
              Create
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowNew(false); setTitle(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
