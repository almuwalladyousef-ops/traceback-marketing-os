"use client";

import { useState, useTransition } from "react";
import { Table, Thead, Th, Tbody, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { createAnalysis } from "@/server/actions/content";
import type { ContentAnalysis, ContentScope, ContentPiece } from "@/lib/supabase/types";
import { Plus } from "lucide-react";

interface Props {
  entries: ContentAnalysis[];
  scope: ContentScope;
  pieces: Pick<ContentPiece, "id" | "title">[];
}

export function AnalysisClient({ entries, scope, pieces }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<ContentAnalysis | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    formData.set("scope", scope);
    startTransition(async () => {
      await createAnalysis(formData);
      setShowNew(false);
    });
  }

  return (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Analysis</h1>
          <Button variant="primary" size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} />
            New entry
          </Button>
        </div>

        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        >
          <Table>
            <Thead>
              <Th>Content Piece</Th>
              <Th>What Worked</Th>
              <Th>What Didn&apos;t</Th>
              <Th>Key Lesson</Th>
              <Th>Apply To Next</Th>
            </Thead>
            <Tbody>
              {entries.length === 0 && (
                <Tr>
                  <Td className="text-center py-8" colSpan={5}>
                    <span style={{ color: "var(--text-muted)" }}>No analysis entries yet.</span>
                  </Td>
                </Tr>
              )}
              {entries.map((e) => (
                <Tr key={e.id} onClick={() => setSelected(e)}>
                  <Td className="max-w-[160px]">
                    <span style={{ color: "var(--text)" }}>
                      {(e.content_pieces as { title?: string } | null)?.title ?? "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[160px]">
                    <span className="text-xs truncate block max-w-[150px]" style={{ color: "var(--text-muted)" }}>
                      {e.what_worked ?? "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[160px]">
                    <span className="text-xs truncate block max-w-[150px]" style={{ color: "var(--text-muted)" }}>
                      {e.what_didnt ?? "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[160px]">
                    <span className="text-xs truncate block max-w-[150px]" style={{ color: "var(--text-muted)" }}>
                      {e.key_lesson ?? "—"}
                    </span>
                  </Td>
                  <Td className="max-w-[160px]">
                    <span className="text-xs truncate block max-w-[150px]" style={{ color: "var(--text-muted)" }}>
                      {e.apply_to_next ?? "—"}
                    </span>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {/* New entry modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New analysis entry">
        <form action={handleCreate} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Content Piece
            </label>
            <select
              name="content_piece_id"
              className="px-3 py-1.5 rounded-lg border text-sm outline-none"
              style={{
                backgroundColor: "var(--surface-2)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              <option value="">— None —</option>
              {pieces.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <Textarea label="What Worked" name="what_worked" rows={2} />
          <Textarea label="What Didn't" name="what_didnt" rows={2} />
          <Textarea label="Key Lesson" name="key_lesson" rows={2} />
          <Textarea label="Apply To Next" name="apply_to_next" rows={2} />
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>Add</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* View entry modal */}
      {selected && (
        <Modal open onClose={() => setSelected(null)} title="Analysis Entry">
          <div className="space-y-3 text-sm">
            <Field label="Content Piece" value={(selected.content_pieces as { title?: string } | null)?.title ?? "—"} />
            <Field label="What Worked" value={selected.what_worked ?? "—"} />
            <Field label="What Didn't" value={selected.what_didnt ?? "—"} />
            <Field label="Key Lesson" value={selected.key_lesson ?? "—"} />
            <Field label="Apply To Next" value={selected.apply_to_next ?? "—"} />
          </div>
        </Modal>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p style={{ color: "var(--text)" }}>{value}</p>
    </div>
  );
}
