"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { updateContentPiece } from "@/server/actions/content";
import type { ContentPiece } from "@/lib/supabase/types";
import { ArrowLeft, Check } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "Idea", label: "Idea" },
  { value: "Outline", label: "Outline" },
  { value: "Script Draft", label: "Script Draft" },
  { value: "Script Final", label: "Script Final" },
  { value: "Filming", label: "Filming" },
  { value: "Editing", label: "Editing" },
  { value: "Published", label: "Published" },
];

interface Props {
  piece: ContentPiece;
}

export function PiecePageClient({ piece }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Local state for all editable fields
  const [title, setTitle] = useState(piece.title);
  const [inspirationLink, setInspirationLink] = useState(piece.inspiration_link ?? "");
  const [status, setStatus] = useState(piece.status);
  const [notes, setNotes] = useState(piece.notes ?? "");
  const [finishLink, setFinishLink] = useState(piece.finish_link ?? "");
  const [publishDate, setPublishDate] = useState(piece.publish_date ?? "");
  const [about, setAbout] = useState(piece.about ?? "");
  const [copy, setCopy] = useState(piece.copy ?? "");
  const [visualUrl, setVisualUrl] = useState(piece.visual_url ?? "");
  const [todoDraftCopy, setTodoDraftCopy] = useState(piece.todo_draft_copy);
  const [todoCreateVisual, setTodoCreateVisual] = useState(piece.todo_create_visual);
  const [todoSchedulePost, setTodoSchedulePost] = useState(piece.todo_schedule_post);
  const [todoPublishPost, setTodoPublishPost] = useState(piece.todo_publish_post);

  function save(updates: Record<string, unknown>) {
    startTransition(async () => {
      await updateContentPiece(piece.id, updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleBlur(field: string, value: unknown) {
    save({ [field]: value || null });
  }

  function handleCheckbox(field: string, value: boolean) {
    save({ [field]: value });
  }

  const kindLabel = { long_form: "Long Form", short_form: "Short Form", blogs: "Blogs / Text" }[piece.kind] ?? piece.kind;
  const backHref = `/content/${piece.scope}/${piece.kind.replace("_", "-")}`;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Back + save indicator */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={14} />
          {piece.scope === "personal" ? "Personal" : "Traceback"} / {kindLabel}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--success)" }}>
            <Check size={12} /> Saved
          </span>
        )}
        {isPending && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Saving...</span>
        )}
      </div>

      {/* Title */}
      <input
        className="w-full text-2xl font-bold bg-transparent border-none outline-none mb-6"
        style={{ color: "var(--text)" }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => handleBlur("title", title)}
        placeholder="Untitled"
      />

      {/* Properties */}
      <div
        className="rounded-xl p-4 mb-6 space-y-3"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <PropertyRow label="Inspiration Link">
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
            value={inspirationLink}
            onChange={(e) => setInspirationLink(e.target.value)}
            onBlur={() => handleBlur("inspiration_link", inspirationLink)}
            placeholder="https://..."
          />
        </PropertyRow>
        <PropertyRow label="Status">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              save({ status: e.target.value });
            }}
            className="bg-transparent text-sm outline-none cursor-pointer"
            style={{ color: "var(--text)" }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ backgroundColor: "var(--surface-2)" }}>
                {o.label}
              </option>
            ))}
          </select>
        </PropertyRow>
        <PropertyRow label="Notes">
          <textarea
            className="flex-1 bg-transparent text-sm outline-none resize-none"
            style={{ color: "var(--text)" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => handleBlur("notes", notes)}
            rows={2}
            placeholder="Add notes..."
          />
        </PropertyRow>
        <PropertyRow label="Finish Link">
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
            value={finishLink}
            onChange={(e) => setFinishLink(e.target.value)}
            onBlur={() => handleBlur("finish_link", finishLink)}
            placeholder="https://..."
          />
        </PropertyRow>
        <PropertyRow label="Publish Date">
          <input
            type="date"
            className="bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            onBlur={() => handleBlur("publish_date", publishDate)}
          />
        </PropertyRow>
      </div>

      {/* Body sections */}
      <div className="space-y-6">
        {/* About */}
        <Section title="What is this content piece about?">
          <textarea
            className="w-full bg-transparent text-sm outline-none resize-none min-h-[80px]"
            style={{ color: "var(--text)" }}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            onBlur={() => handleBlur("about", about)}
            placeholder="Describe the concept..."
          />
        </Section>

        {/* To Do */}
        <Section title="To Do">
          <div className="space-y-2">
            <Checkbox
              label="Draft copy"
              checked={todoDraftCopy}
              onChange={(c) => { setTodoDraftCopy(c); handleCheckbox("todo_draft_copy", c); }}
            />
            <Checkbox
              label="Create visual"
              checked={todoCreateVisual}
              onChange={(c) => { setTodoCreateVisual(c); handleCheckbox("todo_create_visual", c); }}
            />
            <Checkbox
              label="Schedule post"
              checked={todoSchedulePost}
              onChange={(c) => { setTodoSchedulePost(c); handleCheckbox("todo_schedule_post", c); }}
            />
            <Checkbox
              label="Publish post"
              checked={todoPublishPost}
              onChange={(c) => { setTodoPublishPost(c); handleCheckbox("todo_publish_post", c); }}
            />
          </div>
        </Section>

        {/* Copy */}
        <Section title="Copy">
          <textarea
            className="w-full bg-transparent text-sm outline-none resize-none min-h-[120px] font-mono"
            style={{ color: "var(--text)" }}
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            onBlur={() => handleBlur("copy", copy)}
            placeholder="Draft the caption or script here..."
          />
        </Section>

        {/* Visual */}
        <Section title="Visual">
          <input
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
            value={visualUrl}
            onChange={(e) => setVisualUrl(e.target.value)}
            onBlur={() => handleBlur("visual_url", visualUrl)}
            placeholder="Paste a link to the visual (Drive, Figma, etc.)..."
          />
          {visualUrl && (
            <a
              href={visualUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline mt-1 block"
              style={{ color: "var(--accent)" }}
            >
              Open link →
            </a>
          )}
        </Section>
      </div>
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
      <span
        className="text-xs w-32 flex-shrink-0 pt-1"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
