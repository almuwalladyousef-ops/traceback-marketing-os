"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import type { ContentPiece, ContentAnalysis, ContentScope, ContentKind, ContentStatus } from "@/lib/supabase/types";
import {
  createContentPieceAndReturn,
  updateContentPiece,
  deleteContentPiece,
  hardDeleteContentPiece,
  createAnalysisEntry,
  bulkRestoreContentPieces,
  bulkHardDeleteContentPieces,
  bulkUnarchiveContentPieces,
  bulkSoftDeleteContentPieces,
  deleteAnalysisEntry,
  restoreAnalysisEntry,
  hardDeleteAnalysisEntry,
} from "@/server/actions/content";
import { getBrowserClient } from "@/lib/supabase/browser";
import { MobileActionsPortal } from "@/components/shell/MobileActionsPortal";

// ─── Constants ──────────────────────────────────────────────────────────

const STATUSES: ContentStatus[] = ["Idea", "Outline", "Script Draft", "Script Final", "Filming", "Editing", "Published"];
const SCOPES: ContentScope[] = ["traceback", "personal"];
const KINDS: ContentKind[] = ["short_form", "blogs", "long_form"];
const KIND_LABELS: Record<ContentKind, string> = { long_form: "Long Form", short_form: "Short Form", blogs: "Blog / Text" };

const STATUS_META: Record<ContentStatus, { color: string; bg: string }> = {
  "Idea":         { color: "var(--text-dim)",   bg: "var(--surface-3)" },
  "Outline":      { color: "var(--accent)",      bg: "var(--accent-dim)" },
  "Script Draft": { color: "var(--yellow)",      bg: "color-mix(in oklch, var(--yellow) 12%, transparent)" },
  "Script Final": { color: "var(--yellow)",      bg: "color-mix(in oklch, var(--yellow) 18%, transparent)" },
  "Filming":      { color: "var(--purple)",      bg: "color-mix(in oklch, var(--purple) 12%, transparent)" },
  "Editing":      { color: "var(--pink)",        bg: "color-mix(in oklch, var(--pink) 12%, transparent)" },
  "Published":    { color: "var(--green)",       bg: "var(--green-dim)" },
  "Deleted":      { color: "var(--red, #f87171)", bg: "color-mix(in oklch, var(--red, #f87171) 12%, transparent)" },
};

// ─── Types ───────────────────────────────────────────────────────────────

type AnalysisWithPiece = ContentAnalysis & {
  content_pieces?: { id: string; title: string } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function fmtPubDate(d: string | null) {
  if (!d) return null;
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
}

function daysUntil(d: string | null, today: string) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - new Date(today).getTime()) / 86400000);
}

function todoPct(p: ContentPiece) {
  const bools = [p.todo_draft_copy, p.todo_create_visual, p.todo_schedule_post, p.todo_publish_post];
  const done = bools.filter(Boolean).length;
  return { done, total: 4 };
}

// ─── StatusPill ──────────────────────────────────────────────────────────

function StatusPill({ status, size = "sm" }: { status: ContentStatus; size?: "sm" | "md" }) {
  const m = STATUS_META[status] ?? STATUS_META["Idea"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: size === "sm" ? "2px 7px" : "4px 10px",
      borderRadius: 5,
      background: m.bg,
      color: m.color,
      fontSize: size === "sm" ? 11 : 12.5,
      fontWeight: 500,
      border: `1px solid color-mix(in oklch, ${m.color} 25%, transparent)`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }}/>
      {status}
    </span>
  );
}

// ─── TodoDots ────────────────────────────────────────────────────────────

function TodoDots({ piece }: { piece: ContentPiece }) {
  const bools = [piece.todo_draft_copy, piece.todo_create_visual, piece.todo_schedule_post, piece.todo_publish_post];
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {bools.map((v, i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: v ? "var(--green)" : "var(--surface-3)",
          border: `1px solid ${v ? "var(--green)" : "var(--border-strong)"}`,
        }}/>
      ))}
    </div>
  );
}

// ─── KanbanCard ──────────────────────────────────────────────────────────

function KanbanCard({ piece, today, onClick, statusColor }: { piece: ContentPiece; today: string; onClick: (p: ContentPiece) => void; statusColor: string }) {
  const pub = fmtPubDate(piece.publish_date);
  const days = daysUntil(piece.publish_date, today);
  const isUrgent = days !== null && days <= 7 && days >= 0;
  const borderColor = `color-mix(in oklch, ${statusColor} 35%, var(--border))`;
  const borderHover = `color-mix(in oklch, ${statusColor} 65%, var(--border))`;
  return (
    <div
      onClick={() => onClick(piece)}
      className="card"
      style={{
        padding: "12px 13px", cursor: "pointer",
        background: "var(--surface-2)",
        border: `1px solid ${borderColor}`,
        marginBottom: 6, transition: "border-color 0.12s, transform 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = borderHover; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)", lineHeight: 1.4, marginBottom: 8 }}>{piece.title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <TodoDots piece={piece}/>
        {pub && (
          <span style={{
            fontSize: 10.5, fontFamily: "JetBrains Mono, monospace",
            color: isUrgent ? "var(--accent)" : "var(--text-dim)",
            fontWeight: isUrgent ? 600 : 400,
          }}>{pub}</span>
        )}
      </div>
      {piece.notes && (
        <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{piece.notes}</div>
      )}
    </div>
  );
}

// ─── KanbanBoard ─────────────────────────────────────────────────────────

function KanbanBoard({ pieces, today, onOpen, onAddCard }: {
  pieces: ContentPiece[];
  today: string;
  onOpen: (p: ContentPiece) => void;
  onAddCard: (status: ContentStatus) => void;
}) {
  const byStatus = useMemo(() => {
    const map: Record<ContentStatus, ContentPiece[]> = {} as Record<ContentStatus, ContentPiece[]>;
    STATUSES.forEach((s) => (map[s] = []));
    pieces.forEach((p) => { if (map[p.status]) map[p.status].push(p); });
    return map;
  }, [pieces]);

  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
      {STATUSES.map((status) => {
        const cols = byStatus[status] ?? [];
        const m = STATUS_META[status];
        return (
          <div key={status} style={{ flexShrink: 0, width: 200, display: "flex", flexDirection: "column" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 10px", marginBottom: 6,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }}/>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" }}>{status}</span>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                background: cols.length > 0 ? m.bg : "var(--surface-3)",
                color: cols.length > 0 ? m.color : "var(--text-dim)",
                fontFamily: "JetBrains Mono, monospace",
              }}>{cols.length}</span>
            </div>
            <div style={{ flex: 1 }}>
              {cols.map((p) => (
                <KanbanCard key={p.id} piece={p} today={today} onClick={onOpen} statusColor={m.color}/>
              ))}
            </div>
            <button onClick={() => onAddCard(status)} style={{
              width: "100%", padding: "7px", borderRadius: 7, fontSize: 12,
              background: "transparent", border: "1px dashed var(--border)",
              color: "var(--text-dim)", cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              marginTop: 2,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── TableView ───────────────────────────────────────────────────────────

function TableView({ pieces, today, onOpen }: { pieces: ContentPiece[]; today: string; onOpen: (p: ContentPiece) => void }) {
  const gridTemplate = "36px 1fr 120px 100px 100px 72px";
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 640 }}>
          <div style={{
            display: "grid", gridTemplateColumns: gridTemplate,
            padding: "9px 14px", background: "var(--surface-2)",
            borderBottom: "1px solid var(--border)",
            fontSize: 10.5, color: "var(--text-muted)", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            <div>#</div><div>Title</div><div>Status</div><div>Publish</div><div>Progress</div><div></div>
          </div>
          {pieces.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No pieces yet — add one above</div>
          )}
          {pieces.map((p, i) => {
            const { done, total } = todoPct(p);
            const pub = fmtPubDate(p.publish_date);
            const days = daysUntil(p.publish_date, today);
            const isUrgent = days !== null && days <= 7 && days >= 0;
            return (
              <div key={p.id} onClick={() => onOpen(p)} className="row-hover" style={{
                display: "grid", gridTemplateColumns: gridTemplate,
                padding: "12px 14px", borderTop: "1px solid var(--border)",
                cursor: "pointer", alignItems: "center",
              }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{p.title}</div>
                  {p.notes && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 1 }}>{p.notes}</div>}
                </div>
                <div><StatusPill status={p.status}/></div>
                <div className="mono" style={{ fontSize: 11.5, color: isUrgent ? "var(--accent)" : "var(--text-muted)", fontWeight: isUrgent ? 600 : 400 }}>
                  {pub ?? "—"}
                  {isUrgent && <span style={{ fontSize: 9.5, display: "block", color: "var(--accent)", letterSpacing: "0.04em" }}>{days}d left</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--surface-3)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(done / total) * 100}%`, background: done === total ? "var(--green)" : "var(--accent)", borderRadius: 2, transition: "width 0.3s" }}/>
                  </div>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{done}/{total}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={(e) => { e.stopPropagation(); onOpen(p); }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SlideSection ────────────────────────────────────────────────────────

function SlideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9 }}>
        {children}
      </div>
    </div>
  );
}

// ─── PieceSlideOver ──────────────────────────────────────────────────────

function PieceSlideOver({ piece, analyses, onClose, onUpdate, onDelete, onMoveStatus, onAnalyze, onDeleteAnalysis, onArchive }: {
  piece: ContentPiece;
  analyses: AnalysisWithPiece[];
  onClose: () => void;
  onUpdate: (id: string, key: string, value: unknown) => void;
  onDelete: (id: string) => void;
  onMoveStatus: (id: string, status: ContentStatus) => void;
  onAnalyze: (entry: AnalysisWithPiece) => void;
  onDeleteAnalysis: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [viewingAnalysis, setViewingAnalysis] = useState<AnalysisWithPiece | null>(null);
  const statusIdx = STATUSES.indexOf(piece.status);
  const prevStatus = statusIdx > 0 ? STATUSES[statusIdx - 1] : null;
  const nextStatus = statusIdx < STATUSES.length - 1 ? STATUSES[statusIdx + 1] : null;

  function field(key: string, value: unknown) { onUpdate(piece.id, key, value); }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", zIndex: 50, animation: "fade-in 0.2s" }}/>
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "85vw", maxWidth: 560,
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        zIndex: 51, display: "flex", flexDirection: "column",
        boxShadow: "-16px 0 40px rgba(0,0,0,0.45)",
        animation: "slide-in 0.22s ease-out",
      }}>
        <style>{`@keyframes slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusPill status={piece.status} size="md"/>
              <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{KIND_LABELS[piece.kind]} · {piece.scope}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {piece.status === "Published" && !piece.user_archived && (
                <button
                  onClick={() => onArchive(piece.id)}
                  className="btn-icon"
                  title="Archive"
                  style={{ color: "var(--yellow)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>
                </button>
              )}
              <button onClick={() => onDelete(piece.id)} className="btn-icon" title="Delete" style={{ color: "var(--text-dim)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
              </button>
              <button onClick={onClose} className="btn-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <input
            key={piece.id + "-title"}
            defaultValue={piece.title}
            onBlur={(e) => field("title", e.target.value)}
            placeholder="Untitled piece"
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 18, fontWeight: 600, color: "var(--text)", fontFamily: "inherit", lineHeight: 1.3 }}
          />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>

          {/* Analyze button — only for published pieces */}
          {piece.status === "Published" && (
            <button
              onClick={() => setShowAnalyze(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: "color-mix(in oklch, var(--purple) 12%, transparent)",
                color: "var(--purple)",
                border: "1px solid color-mix(in oklch, var(--purple) 30%, transparent)",
                cursor: "pointer", marginBottom: 14,
              }}
            >
              ✦ Analyze with Claude
            </button>
          )}

          {/* Status nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9 }}>
            {prevStatus && (
              <button onClick={() => onMoveStatus(piece.id, prevStatus)} style={{ fontSize: 11.5, color: "var(--text-muted)", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>← {prevStatus}</button>
            )}
            <div style={{ flex: 1, textAlign: "center" }}>
              <StatusPill status={piece.status} size="md"/>
            </div>
            {nextStatus && (
              <button onClick={() => onMoveStatus(piece.id, nextStatus)} style={{ fontSize: 11.5, color: "var(--accent)", background: "var(--accent-dim)", border: "1px solid var(--accent-line)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontWeight: 500 }}>{nextStatus} →</button>
            )}
          </div>

          {/* Properties */}
          {[
            { label: "Publish date", type: "date", key: "publish_date", value: piece.publish_date ?? "" },
            { label: "Inspiration",  type: "url",  key: "inspiration_link", value: piece.inspiration_link ?? "", placeholder: "https://..." },
            { label: "Finish link",  type: "url",  key: "finish_link",      value: piece.finish_link ?? "",      placeholder: "https://..." },
          ].map(({ label, type, key, value, placeholder }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", width: 90, flexShrink: 0 }}>{label}</span>
              <input
                key={piece.id + "-" + key}
                type={type === "date" ? "date" : "text"}
                defaultValue={value}
                onBlur={(e) => field(key, e.target.value)}
                placeholder={placeholder ?? ""}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 13, fontFamily: "inherit", colorScheme: "dark" }}
              />
            </div>
          ))}

          {/* Notes */}
          <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", display: "flex", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", width: 90, flexShrink: 0, paddingTop: 2 }}>Notes</span>
            <textarea
              key={piece.id + "-notes"}
              defaultValue={piece.notes ?? ""}
              onBlur={(e) => field("notes", e.target.value)}
              placeholder="Add notes…"
              rows={2}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", color: "var(--text)", fontSize: 13, fontFamily: "inherit", lineHeight: 1.5 }}
            />
          </div>

          {/* Checklist */}
          <div style={{ marginTop: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 10 }}>Checklist</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {([
                ["todo_draft_copy",    "Draft copy",    piece.todo_draft_copy],
                ["todo_create_visual", "Create visual", piece.todo_create_visual],
                ["todo_schedule_post", "Schedule post", piece.todo_schedule_post],
                ["todo_publish_post",  "Publish post",  piece.todo_publish_post],
              ] as [string, string, boolean][]).map(([key, label, done]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "6px 10px", borderRadius: 7, transition: "background 0.12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <button
                    onClick={() => field(key, !done)}
                    style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: done ? "var(--green)" : "transparent",
                      border: `1.5px solid ${done ? "var(--green)" : "var(--border-strong)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", cursor: "pointer", transition: "all 0.15s",
                      boxShadow: done ? "0 0 0 3px var(--green-dim)" : "none",
                    }}
                  >
                    {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                  </button>
                  <span style={{ fontSize: 13, color: done ? "var(--text-muted)" : "var(--text)", textDecoration: done ? "line-through" : "none" }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* About */}
          <SlideSection title="What it's about">
            <textarea
              key={piece.id + "-about"}
              defaultValue={piece.about ?? ""}
              onBlur={(e) => field("about", e.target.value)}
              placeholder="Describe the concept, angle, or hook…"
              rows={3}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "vertical", color: "var(--text)", fontSize: 13, fontFamily: "inherit", lineHeight: 1.6 }}
            />
          </SlideSection>

          {/* Copy */}
          <SlideSection title="Copy / Script">
            <textarea
              key={piece.id + "-copy"}
              defaultValue={piece.copy ?? ""}
              onBlur={(e) => field("copy", e.target.value)}
              placeholder="Draft the caption, hook, or script here…"
              rows={5}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "vertical", color: "var(--text)", fontSize: 12.5, fontFamily: "JetBrains Mono, monospace", lineHeight: 1.6 }}
            />
          </SlideSection>

          {/* Visual */}
          <SlideSection title="Visual / Asset link">
            <input
              key={piece.id + "-visual"}
              defaultValue={piece.visual_url ?? ""}
              onBlur={(e) => field("visual_url", e.target.value)}
              placeholder="Drive, Figma, Dropbox link…"
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}
            />
            {piece.visual_url && (
              <a href={piece.visual_url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "var(--accent)", textDecoration: "none", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                Open link
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
              </a>
            )}
          </SlideSection>

          {/* Analysis section — only for published pieces */}
          {piece.status === "Published" && <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                Post-mortem Analysis {analyses.length > 0 && <span style={{ color: "var(--purple)", marginLeft: 4 }}>{analyses.length}</span>}
              </div>
              <button
                onClick={() => setShowAnalyze(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                  background: "color-mix(in oklch, var(--purple) 12%, transparent)",
                  color: "var(--purple)",
                  border: "1px solid color-mix(in oklch, var(--purple) 30%, transparent)",
                  cursor: "pointer",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Add analysis
              </button>
            </div>

            {analyses.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center", color: "var(--text-dim)", fontSize: 12, border: "1px dashed var(--border)", borderRadius: 8 }}>
                No analysis yet — click Add analysis to post-mortem this piece
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {analyses.map((a) => (
                  <div key={a.id} style={{ padding: "12px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
                        {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setViewingAnalysis(a)} className="btn-icon" style={{ width: 22, height: 22 }} title="View full">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button onClick={() => onDeleteAnalysis(a.id)} className="btn-icon" style={{ width: 22, height: 22, color: "var(--text-dim)" }} title="Delete">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {([["✓ What worked", a.what_worked], ["✗ What didn't", a.what_didnt], ["💡 Key lesson", a.key_lesson], ["→ Apply next", a.apply_to_next]] as [string, string | null][]).map(([l, v]) => v ? (
                        <div key={l}>
                          <div style={{ fontSize: 9.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 3 }}>{l}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{v}</div>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>}
        </div>
      </div>

      {/* Analysis full-view modal */}
      {viewingAnalysis && (
        <>
          <div onClick={() => setViewingAnalysis(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", zIndex: 62 }}/>
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: "90vw", maxWidth: 520, background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: 14, padding: 24, zIndex: 63, boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            maxHeight: "80vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{piece.title}</div>
              <button onClick={() => setViewingAnalysis(null)} className="btn-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {([["What worked", viewingAnalysis.what_worked], ["What didn't", viewingAnalysis.what_didnt], ["Key lesson", viewingAnalysis.key_lesson], ["Apply to next", viewingAnalysis.apply_to_next]] as [string, string | null][]).map(([l, v]) => (
              <div key={l} style={{ marginBottom: 14, padding: "12px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>{l}</div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>{v ?? "—"}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {showAnalyze && (
        <AnalyzeModal
          piece={piece}
          onClose={() => setShowAnalyze(false)}
          onSave={(entry) => { onAnalyze(entry); setShowAnalyze(false); }}
        />
      )}
    </>
  );
}

// ─── AnalyzeModal ────────────────────────────────────────────────────────

function AnalyzeModal({ piece, onClose, onSave }: {
  piece: ContentPiece;
  onClose: () => void;
  onSave: (entry: AnalysisWithPiece) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ what_worked: "", what_didnt: "", key_lesson: "", apply_to_next: "" });
  const [, startTransition] = useTransition();

  const prompt = `I just published a content piece and I want to do a post-mortem analysis on it so I can improve future content. Please help me answer these 4 questions about it:

Title: "${piece.title}"
Type: ${KIND_LABELS[piece.kind] ?? piece.kind}
${piece.notes ? `Notes: ${piece.notes}` : ""}
${piece.copy ? `Copy/script excerpt: ${piece.copy.slice(0, 300)}` : ""}

Please answer:
1. What worked? (What likely resonated, performed well, or was done right)
2. What didn't work? (What could have been better or held it back)
3. Key lesson? (The single most important takeaway in one sentence)
4. Apply to next piece? (1-2 specific, actionable things to do differently next time)

Keep each answer to 2-3 sentences max.`;

  function copyPrompt() {
    navigator.clipboard?.writeText(prompt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function save() {
    startTransition(async () => {
      const res = await createAnalysisEntry({
        scope: piece.scope,
        content_piece_id: piece.id,
        ...form,
      });
      if ("data" in res) {
        onSave({ ...res.data, content_pieces: { id: piece.id, title: piece.title } });
      }
    });
    onClose();
  }

  const taStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 7,
    background: "var(--surface-2)", border: "1px solid var(--border)",
    color: "var(--text)", fontSize: 12.5, fontFamily: "inherit",
    outline: "none", resize: "vertical", lineHeight: 1.55,
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", zIndex: 62, animation: "fade-in 0.18s" }}/>
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "90vw", maxWidth: 560, maxHeight: "88vh", overflowY: "auto",
        background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: 14, padding: 24, zIndex: 63, boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        animation: "fade-in 0.18s",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Analyze this piece</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{piece.title}</div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Step 1 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", color: "#1a1208", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>1</span>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>Copy this prompt and paste it into Claude</span>
          </div>
          <div style={{
            padding: "12px 14px", background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: 9, fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.7,
            maxHeight: 150, overflowY: "auto", fontFamily: "JetBrains Mono, monospace",
            whiteSpace: "pre-wrap", marginBottom: 8,
          }}>{prompt}</div>
          <button
            onClick={copyPrompt}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
              background: copied ? "var(--green-dim)" : "var(--surface-2)",
              color: copied ? "var(--green)" : "var(--text-muted)",
              border: `1px solid ${copied ? "color-mix(in oklch, var(--green) 30%, transparent)" : "var(--border)"}`,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {copied ? (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Copied!</>
            ) : "Copy prompt"}
          </button>
        </div>

        {/* Step 2 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--surface-3)", color: "var(--text-muted)", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>2</span>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>Paste Claude's answers below</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          {([
            ["what_worked",   "What worked"],
            ["what_didnt",    "What didn't work"],
            ["key_lesson",    "Key lesson"],
            ["apply_to_next", "Apply to next piece"],
          ] as [keyof typeof form, string][]).map(([key, label]) => (
            <div key={key}>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 5 }}>{label}</div>
              <textarea
                rows={2}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={`Paste Claude's answer for "${label.toLowerCase()}"…`}
                style={taStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={save}
            disabled={!form.what_worked && !form.key_lesson}
            style={{
              flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "var(--accent)", color: "#1a1208", border: "none", cursor: "pointer",
              opacity: !form.what_worked && !form.key_lesson ? 0.45 : 1,
            }}
          >Save analysis</button>
          <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, fontSize: 13, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </>
  );
}

// ─── NewPieceModal ───────────────────────────────────────────────────────

function NewPieceModal({ onClose, onAdd, scope, kind, defaultStatus }: {
  onClose: () => void;
  onAdd: (piece: ContentPiece) => void;
  scope: ContentScope;
  kind: ContentKind;
  defaultStatus: ContentStatus;
}) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createContentPieceAndReturn(scope, kind, title.trim(), defaultStatus, link.trim(), notes.trim());
      if ("data" in res) {
        onAdd(res.data as ContentPiece);
      }
    });
    onClose();
  }

  const inpStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    background: "var(--surface-2)", border: "1px solid var(--border)",
    color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", outline: "none",
  };

  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) { e.target.style.borderColor = "var(--accent-line)"; }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) { e.target.style.borderColor = "var(--border)"; }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", zIndex: 60, animation: "fade-in 0.18s" }}/>
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "90vw", maxWidth: 460, background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: 14, padding: 24, zIndex: 61, boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        animation: "fade-in 0.15s",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>New {KIND_LABELS[kind]} piece</div>
          <button onClick={onClose} className="btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Title *</div>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. How we 10x'd reply rates" required style={inpStyle} onFocus={onFocus} onBlur={onBlur}/>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Inspiration link</div>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" style={inpStyle} onFocus={onFocus} onBlur={onBlur}/>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Notes / what it's about</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the angle, concept, or any initial ideas…"
              rows={3}
              style={{ ...inpStyle, resize: "none", lineHeight: 1.55 }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="submit" style={{
              flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "var(--accent)", color: "#1a1208", border: "none", cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
            }}>Create piece</button>
            <button type="button" onClick={onClose} style={{
              padding: "9px 16px", borderRadius: 8, fontSize: 13,
              background: "transparent", color: "var(--text-muted)",
              border: "1px solid var(--border)", cursor: "pointer",
            }}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── ContentStats ────────────────────────────────────────────────────────

function ContentStats({ pieces, today }: { pieces: ContentPiece[]; today: string }) {
  const inProg = pieces.filter((p) => !["Idea", "Published"].includes(p.status)).length;
  const published = pieces.filter((p) => p.status === "Published").length;
  const scheduled = pieces.filter((p) => {
    const d = daysUntil(p.publish_date, today);
    return d !== null && d >= 0 && d <= 14;
  }).length;
  const ideas = pieces.filter((p) => p.status === "Idea").length;

  return (
    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
      {[
        { label: "In production", value: inProg,     color: "var(--accent)",     note: "active pieces" },
        { label: "Scheduled",     value: scheduled,  color: "var(--yellow)",     note: "next 14 days" },
        { label: "Published",     value: published,  color: "var(--green)",      note: "all time" },
        { label: "Ideas",         value: ideas,      color: "var(--text-muted)", note: "pipeline" },
      ].map((s, i) => (
        <div key={i} style={{ background: "var(--surface)", padding: "13px 18px" }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{s.label}</div>
          <div className="stat-num" style={{ fontSize: 24, color: s.color, marginTop: 4, letterSpacing: "-0.02em" }}>{s.value}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{s.note}</div>
        </div>
      ))}
    </div>
  );
}

// ─── ContentClient ───────────────────────────────────────────────────────

interface Props {
  pieces: ContentPiece[];
  analysis: AnalysisWithPiece[];
  deletedAnalysis: AnalysisWithPiece[];
  archivedPieces: ContentPiece[];
  userArchivedPieces: ContentPiece[];
  today: string;
}

export function ContentClient({ pieces: initialPieces, analysis: initialAnalysis, deletedAnalysis: initialDeletedAnalysis, archivedPieces: initialArchivedPieces, userArchivedPieces: initialUserArchivedPieces, today }: Props) {
  const [pieces, setPieces] = useState<ContentPiece[]>(initialPieces);
  const [analysis, setAnalysis] = useState<AnalysisWithPiece[]>(initialAnalysis);
  const [deletedAnalysis, setDeletedAnalysis] = useState<AnalysisWithPiece[]>(initialDeletedAnalysis);
  const [archivedPieces, setArchivedPieces] = useState<ContentPiece[]>(initialArchivedPieces);
  const [userArchivedPieces, setUserArchivedPieces] = useState<ContentPiece[]>(initialUserArchivedPieces);
  const [scope, setScope] = useState<ContentScope>(() => {
    if (typeof window === "undefined") return "traceback";
    return (localStorage.getItem("content_scope") as ContentScope) ?? "traceback";
  });
  const [kind, setKind] = useState<ContentKind | "archived" | "deleted">(() => {
    if (typeof window === "undefined") return "short_form";
    const stored = localStorage.getItem("content_kind");
    if (stored === "analysis") return "short_form";
    return (stored as ContentKind | "archived" | "deleted") ?? "short_form";
  });
  const [view, setView] = useState<"board" | "list">("board");
  const [selectedPiece, setSelectedPiece] = useState<ContentPiece | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newDefaultStatus, setNewDefaultStatus] = useState<ContentStatus>("Idea");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedDeletedIds, setSelectedDeletedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDeleteContent, setConfirmBulkDeleteContent] = useState(false);
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<Set<string>>(new Set());
  const [isPendingBulk, startBulk] = useTransition();
  const [, startTransition] = useTransition();

  const isDeleted = kind === "deleted";
  const isArchived = kind === "archived";
  const isSpecialTab = isDeleted || isArchived;

  const filtered = useMemo(
    () => isSpecialTab ? [] : pieces.filter((p) => p.scope === scope && p.kind === (kind as ContentKind)),
    [pieces, scope, kind, isSpecialTab]
  );

  const userArchivedForScope = useMemo(
    () => userArchivedPieces.filter((p) => p.scope === scope),
    [userArchivedPieces, scope]
  );

  const deletedPieces = useMemo(
    () => archivedPieces.filter((p) => p.scope === scope),
    [archivedPieces, scope]
  );

  const deletedAnalysisForScope = useMemo(
    () => deletedAnalysis.filter((a) => a.scope === scope),
    [deletedAnalysis, scope]
  );

  // Realtime sync
  useEffect(() => {
    const client = getBrowserClient();
    const channel = client
      .channel("content-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_pieces" }, () => {
        // Re-fetch by refreshing; simpler than re-fetching here
        window.location.reload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "content_analysis" }, () => {
        window.location.reload();
      })
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, []);

  function updatePiece(id: string, key: string, value: unknown) {
    setPieces((ps) => ps.map((p) => p.id === id ? { ...p, [key]: value } : p));
    setUserArchivedPieces((ap) => ap.map((p) => p.id === id ? { ...p, [key]: value } : p));
    setSelectedPiece((s) => s && s.id === id ? { ...s, [key]: value } as ContentPiece : s);
    startTransition(async () => {
      await updateContentPiece(id, { [key]: value });
    });
  }

  function removePiece(id: string) {
    const piece = pieces.find((p) => p.id === id) ?? userArchivedPieces.find((p) => p.id === id);
    setPieces((ps) => ps.filter((p) => p.id !== id));
    setUserArchivedPieces((ap) => ap.filter((p) => p.id !== id));
    if (piece) setArchivedPieces((ap) => [{ ...piece, archived: true }, ...ap]);
    setSelectedPiece(null);
    startTransition(async () => {
      await deleteContentPiece(id);
    });
  }

  function restorePiece(id: string) {
    const piece = archivedPieces.find((p) => p.id === id);
    setArchivedPieces((ap) => ap.filter((p) => p.id !== id));
    if (piece) setPieces((ps) => [{ ...piece, archived: false }, ...ps]);
    startTransition(async () => {
      await updateContentPiece(id, { archived: false });
    });
  }

  function permanentlyDeletePiece(id: string) {
    setArchivedPieces((ap) => ap.filter((p) => p.id !== id));
    setUserArchivedPieces((ap) => ap.filter((p) => p.id !== id));
    startTransition(async () => {
      await hardDeleteContentPiece(id);
    });
  }

  function bulkUnarchiveSelected() {
    const ids = Array.from(selectedArchivedIds);
    const restored = userArchivedPieces.filter((p) => ids.includes(p.id)).map((p) => ({ ...p, user_archived: false }));
    startBulk(async () => {
      await bulkUnarchiveContentPieces(ids);
      setUserArchivedPieces((ap) => ap.filter((p) => !ids.includes(p.id)));
      setPieces((ps) => [...restored, ...ps]);
      setSelectedArchivedIds(new Set());
    });
  }

  function bulkDeleteFromArchived() {
    const ids = Array.from(selectedArchivedIds);
    const moved = userArchivedPieces.filter((p) => ids.includes(p.id)).map((p) => ({ ...p, archived: true }));
    startBulk(async () => {
      await bulkSoftDeleteContentPieces(ids);
      setUserArchivedPieces((ap) => ap.filter((p) => !ids.includes(p.id)));
      setArchivedPieces((ap) => [...moved, ...ap]);
      setSelectedArchivedIds(new Set());
    });
  }

  function archivePiece(id: string) {
    const piece = pieces.find((p) => p.id === id);
    setPieces((ps) => ps.filter((p) => p.id !== id));
    if (piece) setUserArchivedPieces((ap) => [{ ...piece, user_archived: true }, ...ap]);
    setSelectedPiece(null);
    startTransition(async () => {
      await updateContentPiece(id, { user_archived: true });
    });
  }

  function unarchivePiece(id: string) {
    const piece = userArchivedPieces.find((p) => p.id === id);
    setUserArchivedPieces((ap) => ap.filter((p) => p.id !== id));
    if (piece) setPieces((ps) => [{ ...piece, user_archived: false }, ...ps]);
    startTransition(async () => {
      await updateContentPiece(id, { user_archived: false });
    });
  }

  function addPiece(piece: ContentPiece) {
    setPieces((ps) => [piece, ...ps]);
    setSelectedPiece(piece);
  }

  function moveStatus(id: string, newStatus: ContentStatus) {
    updatePiece(id, "status", newStatus);
  }

  function addCardAtStatus(status: ContentStatus) {
    setNewDefaultStatus(status);
    setShowNew(true);
  }

  function handleDeleteAnalysis(id: string) {
    const entry = analysis.find((a) => a.id === id);
    setAnalysis((a) => a.filter((e) => e.id !== id));
    if (entry) setDeletedAnalysis((a) => [{ ...entry, archived: true }, ...a]);
    startTransition(async () => { await deleteAnalysisEntry(id); });
  }

  function bulkRestoreDeleted() {
    const ids = Array.from(selectedDeletedIds);
    const restoredPieces = archivedPieces.filter((p) => ids.includes(p.id)).map((p) => ({ ...p, archived: false }));
    startBulk(async () => {
      await bulkRestoreContentPieces(ids);
      setArchivedPieces((ap) => ap.filter((p) => !ids.includes(p.id)));
      setPieces((ps) => [...restoredPieces, ...ps]);
      setSelectedDeletedIds(new Set());
    });
  }

  function bulkHardDeleteSelected() {
    const ids = Array.from(selectedDeletedIds);
    startBulk(async () => {
      await bulkHardDeleteContentPieces(ids);
      setArchivedPieces((ap) => ap.filter((p) => !ids.includes(p.id)));
      setSelectedDeletedIds(new Set());
      setConfirmBulkDeleteContent(false);
    });
  }

  const liveSelected = selectedPiece
    ? (pieces.find((p) => p.id === selectedPiece.id) ?? userArchivedPieces.find((p) => p.id === selectedPiece.id) ?? selectedPiece)
    : null;

  return (
    <div className="fade-in">
      {/* Mobile: View toggle + New piece button in TopBar */}
      {!isSpecialTab && (
        <MobileActionsPortal>
          <div style={{ display: "flex", gap: 2, padding: 2, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7 }}>
            {([["board", "⊞"], ["list", "☰"]] as [string, string][]).map(([v, icon]) => (
              <button key={v} onClick={() => setView(v as "board" | "list")} style={{
                width: 28, height: 28, borderRadius: 5, fontSize: 14,
                background: view === v ? "var(--surface)" : "transparent",
                color: view === v ? "var(--text)" : "var(--text-muted)",
                border: "none", cursor: "pointer",
                boxShadow: view === v ? "inset 0 0 0 1px var(--border)" : "none",
              }}>{icon}</button>
            ))}
          </div>
          <button
            onClick={() => { setNewDefaultStatus("Idea"); setShowNew(true); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "var(--accent)", color: "#1a1208", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New piece
          </button>
        </MobileActionsPortal>
      )}

      {/* Scope + view toggle row */}
      <div className="content-top-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <span className="channel-label" style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Channel</span>
          <div className="scope-toggle-wrap" style={{ display: "flex", gap: 4 }}>
            {SCOPES.map((s) => (
              <button key={s} onClick={() => { setScope(s); localStorage.setItem("content_scope", s); }} style={{
                padding: "7px 20px", borderRadius: 8, fontSize: 13.5, fontWeight: scope === s ? 600 : 400,
                background: scope === s ? "var(--accent)" : "transparent",
                color: scope === s ? "#1a1208" : "var(--text-muted)",
                border: `1px solid ${scope === s ? "transparent" : "var(--border)"}`,
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: scope === s ? "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px oklch(0.78 0.14 75 / 0.2)" : "none",
              }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
        </div>
        {!isSpecialTab && (
          <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 2, padding: 2, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7 }}>
              {([["board", "⊞"], ["list", "☰"]] as [string, string][]).map(([v, icon]) => (
                <button key={v} onClick={() => setView(v as "board" | "list")} style={{
                  width: 28, height: 28, borderRadius: 5, fontSize: 14,
                  background: view === v ? "var(--surface)" : "transparent",
                  color: view === v ? "var(--text)" : "var(--text-muted)",
                  border: "none", cursor: "pointer",
                  boxShadow: view === v ? "inset 0 0 0 1px var(--border)" : "none",
                }}>{icon}</button>
              ))}
            </div>
            <button onClick={() => { setNewDefaultStatus("Idea"); setShowNew(true); }} style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: 8, background: "var(--accent)", color: "#1a1208",
              border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              New piece
            </button>
          </div>
        )}
      </div>

      {/* Kind tabs */}
      <div className="content-kind-tabs" style={{ display: "flex", alignItems: "center", gap: 4, padding: 3, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 16 }}>
        {([...KINDS, "archived", "deleted"] as (ContentKind | "archived" | "deleted")[]).map((k) => {
          const label = k === "deleted" ? "Deleted" : k === "archived" ? "Archived" : KIND_LABELS[k as ContentKind];
          const isActive = kind === k;
          const isDeletedTab = k === "deleted";
          const isArchivedTab = k === "archived";
          const deletedCount = deletedPieces.length + deletedAnalysisForScope.length;
          const archivedCount = userArchivedForScope.length;
          return (
            <button key={k} onClick={() => { setKind(k); localStorage.setItem("content_kind", k); }} style={{
              flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "6px 12px", borderRadius: 7, whiteSpace: "nowrap",
              background: isActive ? "var(--surface-2)" : "transparent",
              color: isActive ? (isDeletedTab ? "var(--red, #f87171)" : isArchivedTab ? "var(--yellow)" : "var(--text)") : "var(--text-muted)",
              border: "none", fontSize: 13, fontWeight: isActive ? 500 : 400,
              boxShadow: isActive ? "inset 0 0 0 1px var(--border), 0 1px 2px rgba(0,0,0,0.3)" : "none",
              cursor: "pointer", transition: "background 0.15s, color 0.15s",
            }}>
              {label}
              {isDeletedTab && deletedCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4,
                  background: "color-mix(in oklch, var(--red, #f87171) 15%, transparent)",
                  color: "var(--red, #f87171)",
                }}>{deletedCount}</span>
              )}
              {isArchivedTab && archivedCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4,
                  background: "color-mix(in oklch, var(--yellow) 15%, transparent)",
                  color: "var(--yellow)",
                }}>{archivedCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats + main content — keyed to scope so it fades in on scope switch */}
      <div key={scope} className="fade-in">
      {/* Stats */}
      {!isSpecialTab && <ContentStats pieces={filtered} today={today}/>}

      {/* Main content */}
      {isArchived ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {userArchivedForScope.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No archived pieces — archive a published piece from its slide-over</div>
          ) : (
            <>
              {/* Bulk toolbar */}
              <div className={`page-toolbar${selectedArchivedIds.size > 0 ? " has-selection" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                {selectedArchivedIds.size > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--accent-line)", borderRadius: 9, fontSize: 12.5 }}>
                    <span style={{ color: "var(--text)" }}><span className="mono" style={{ color: "var(--accent)" }}>{selectedArchivedIds.size}</span> selected</span>
                    <span style={{ width: 1, height: 14, background: "var(--border)" }}/>
                    <button onClick={bulkUnarchiveSelected} disabled={isPendingBulk} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12.5, cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Unarchive</button>
                    <button onClick={bulkDeleteFromArchived} disabled={isPendingBulk} style={{ background: "transparent", border: "none", color: "var(--red, #f87171)", fontSize: 12.5, cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Delete</button>
                    <div style={{ flex: 1 }}/>
                    <button onClick={() => setSelectedArchivedIds(new Set())} className="btn-icon" style={{ width: 24, height: 24 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedArchivedIds(new Set(userArchivedForScope.map((p) => p.id)))}
                    style={{ fontSize: 12, color: "var(--text-muted)", background: "transparent", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}
                  >Select all</button>
                )}
              </div>

              {userArchivedForScope.map((p) => {
                const isSelected = selectedArchivedIds.has(p.id);
                return (
                  <div key={p.id} onClick={() => setSelectedPiece(p)} className="row-hover" style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px",
                    background: isSelected ? "color-mix(in oklch, var(--accent) 8%, var(--surface))" : "var(--surface)",
                    border: `1px solid ${isSelected ? "var(--accent-line)" : "var(--border)"}`,
                    borderRadius: 10, cursor: "pointer",
                  }}>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedArchivedIds((s) => { const n = new Set(s); isSelected ? n.delete(p.id) : n.add(p.id); return n; }); }} style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: "1px solid " + (isSelected ? "var(--accent)" : "var(--border-strong)"),
                      background: isSelected ? "var(--accent)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#1a1208", cursor: "pointer",
                    }}>
                      {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{KIND_LABELS[p.kind]} · {p.scope}{p.publish_date ? ` · ${fmtPubDate(p.publish_date)}` : ""}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); unarchivePiece(p.id); }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500,
                        background: "var(--surface-2)", color: "var(--text-muted)",
                        border: "1px solid var(--border)", cursor: "pointer",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                      Unarchive
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removePiece(p.id); }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500,
                        background: "color-mix(in oklch, var(--red, #f87171) 10%, transparent)",
                        color: "var(--red, #f87171)",
                        border: "1px solid color-mix(in oklch, var(--red, #f87171) 25%, transparent)",
                        cursor: "pointer",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
                      Delete
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      ) : isDeleted ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {deletedPieces.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No deleted pieces</div>
          ) : (
            <>
              {/* Bulk toolbar */}
              <div className={`page-toolbar${selectedDeletedIds.size > 0 ? " has-selection" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                {selectedDeletedIds.size > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--accent-line)", borderRadius: 9, fontSize: 12.5 }}>
                    <span style={{ color: "var(--text)" }}><span className="mono" style={{ color: "var(--accent)" }}>{selectedDeletedIds.size}</span> selected</span>
                    <span style={{ width: 1, height: 14, background: "var(--border)" }}/>
                    <button onClick={bulkRestoreDeleted} disabled={isPendingBulk} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12.5, cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Recover</button>
                    <button onClick={() => setConfirmBulkDeleteContent(true)} disabled={isPendingBulk} style={{ background: "transparent", border: "none", color: "var(--red, #f87171)", fontSize: 12.5, cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Delete permanently</button>
                    <div style={{ flex: 1 }}/>
                    <button onClick={() => setSelectedDeletedIds(new Set())} className="btn-icon" style={{ width: 24, height: 24 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedDeletedIds(new Set(deletedPieces.map((p) => p.id)))}
                    style={{ fontSize: 12, color: "var(--text-muted)", background: "transparent", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}
                  >Select all</button>
                )}
              </div>

              {deletedPieces.length > 0 && (
                <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 6, marginTop: 4 }}>Content pieces</div>
              )}
              {deletedPieces.map((p) => {
                const isSelected = selectedDeletedIds.has(p.id);
                return (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", background: isSelected ? "color-mix(in oklch, var(--accent) 8%, var(--surface))" : "var(--surface)",
                    border: `1px solid ${isSelected ? "var(--accent-line)" : "var(--border)"}`,
                    borderRadius: 10,
                  }}>
                    <button onClick={() => setSelectedDeletedIds((s) => { const n = new Set(s); isSelected ? n.delete(p.id) : n.add(p.id); return n; })} style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: "1px solid " + (isSelected ? "var(--accent)" : "var(--border-strong)"),
                      background: isSelected ? "var(--accent)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#1a1208", cursor: "pointer",
                    }}>
                      {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{KIND_LABELS[p.kind]} · {p.scope}</div>
                    </div>
                    <button onClick={() => restorePiece(p.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                      Restore
                    </button>
                    <button onClick={() => setConfirmDeleteId(p.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, background: "color-mix(in oklch, var(--red, #f87171) 10%, transparent)", color: "var(--red, #f87171)", border: "1px solid color-mix(in oklch, var(--red, #f87171) 25%, transparent)", cursor: "pointer" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
                      Delete permanently
                    </button>
                  </div>
                );
              })}

            </>
          )}
        </div>
      ) : view === "board" ? (
        <KanbanBoard pieces={filtered} today={today} onOpen={setSelectedPiece} onAddCard={addCardAtStatus}/>
      ) : (
        <TableView pieces={filtered} today={today} onOpen={setSelectedPiece}/>
      )}
      </div>

      {/* Piece slide-over */}
      {liveSelected && (
        <PieceSlideOver
          piece={liveSelected}
          analyses={analysis.filter((a) => a.content_piece_id === liveSelected.id)}
          onClose={() => setSelectedPiece(null)}
          onUpdate={updatePiece}
          onDelete={removePiece}
          onMoveStatus={moveStatus}
          onAnalyze={(entry) => { setAnalysis((a) => [entry, ...a]); }}
          onDeleteAnalysis={handleDeleteAnalysis}
          onArchive={archivePiece}
        />
      )}

      {/* New piece modal */}
      {showNew && !isSpecialTab && (
        <NewPieceModal
          onClose={() => setShowNew(false)}
          onAdd={addPiece}
          scope={scope}
          kind={kind as ContentKind}
          defaultStatus={newDefaultStatus}
        />
      )}

      {/* Bulk permanent delete confirmation */}
      {confirmBulkDeleteContent && (
        <>
          <div onClick={() => setConfirmBulkDeleteContent(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", zIndex: 70, animation: "fade-in 0.18s" }}/>
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: "90vw", maxWidth: 420, background: "var(--surface)",
            border: "1px solid var(--border-strong)", borderRadius: 14, padding: 24,
            zIndex: 71, boxShadow: "0 24px 64px rgba(0,0,0,0.55)", animation: "fade-in 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: "color-mix(in oklch, var(--red, #f87171) 12%, transparent)",
                border: "1px solid color-mix(in oklch, var(--red, #f87171) 25%, transparent)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red, #f87171)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Delete {selectedDeletedIds.size} {selectedDeletedIds.size === 1 ? "piece" : "pieces"} permanently?</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>These {selectedDeletedIds.size} pieces will be gone forever. This cannot be undone.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={bulkHardDeleteSelected} disabled={isPendingBulk} style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "var(--red, #f87171)", color: "#fff", border: "none", cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Yes, delete forever</button>
              <button onClick={() => setConfirmBulkDeleteContent(false)} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* Permanent delete warning dialog */}
      {confirmDeleteId && (() => {
        const piece = archivedPieces.find((p) => p.id === confirmDeleteId) ?? userArchivedPieces.find((p) => p.id === confirmDeleteId) ?? pieces.find((p) => p.id === confirmDeleteId);
        return (
          <>
            <div onClick={() => setConfirmDeleteId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", zIndex: 70, animation: "fade-in 0.18s" }}/>
            <div style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              width: "90vw", maxWidth: 420, background: "var(--surface)",
              border: "1px solid var(--border-strong)", borderRadius: 14, padding: 24,
              zIndex: 71, boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
              animation: "fade-in 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: "color-mix(in oklch, var(--red, #f87171) 12%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--red, #f87171) 25%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red, #f87171)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Delete permanently?</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                    <strong style={{ color: "var(--text)" }}>&ldquo;{piece?.title}&rdquo;</strong> will be gone forever. This cannot be undone.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { permanentlyDeletePiece(confirmDeleteId); setConfirmDeleteId(null); }}
                  style={{
                    flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: "var(--red, #f87171)", color: "#fff", border: "none", cursor: "pointer",
                  }}
                >
                  Yes, delete forever
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  style={{
                    padding: "9px 18px", borderRadius: 8, fontSize: 13,
                    background: "transparent", color: "var(--text-muted)",
                    border: "1px solid var(--border)", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
