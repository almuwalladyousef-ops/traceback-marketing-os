"use client";

import { useState, useMemo, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createInfluencer,
  setTouch,
  archiveInfluencer,
  updateInfluencerField,
  softDeleteInfluencer,
  hardDeleteInfluencer,
  restoreInfluencer,
  reEngageInfluencer,
  importInfluencers,
} from "@/server/actions/influencers";
import type { Influencer } from "@/lib/supabase/types";
import { getBrowserClient } from "@/lib/supabase/browser";
import { MobileActionsPortal, MobileMoreMenu } from "@/components/shell/MobileActionsPortal";

type InfWithDue = Influencer & { dueTouch: "touch_1" | "touch_2" | "touch_3" | "re_engage" | null; dueArchive: boolean };

function fmtDate(d: string | null) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
}

function daysAgo(d: string | null, today: string): number | null {
  if (!d) return null;
  return Math.floor((new Date(today).getTime() - new Date(d).getTime()) / 86400000);
}

const PLATFORM_COLORS: Record<string, string> = { IG: "oklch(0.7 0.13 330)", X: "var(--text)" };
const PLATFORM_BG: Record<string, string> = { IG: "oklch(0.7 0.13 330 / 0.12)", X: "var(--surface-3)" };

const INF_FILTERS = [
  { id: "not_contacted", label: "Not sent",  icon: "○" },
  { id: "touch1",        label: "Bump 1",    icon: "↗" },
  { id: "touch2",        label: "Bump 2",    icon: "↻" },
  { id: "touch3",        label: "Bump 3",    icon: "↻↻" },
  { id: "replied",       label: "Replied",   icon: "✓" },
  { id: "archived",      label: "Archived",  icon: "▤" },
  { id: "deleted",       label: "Deleted",   icon: "✕" },
] as const;

type FilterId = typeof INF_FILTERS[number]["id"];

function getFiltered(list: InfWithDue[], touchFilter: FilterId, platformFilter: string): InfWithDue[] {
  let filtered = list.filter((i) => platformFilter === "All" || i.platform === platformFilter);
  if (touchFilter === "deleted") return filtered.filter((i) => i.status === "Deleted");
  filtered = filtered.filter((i) => i.status !== "Deleted");
  switch (touchFilter) {
    case "not_contacted": return filtered.filter((i) => i.status === "Active" && !i.touch_1);
    case "touch1":        return filtered.filter((i) => i.status === "Active" && i.touch_1 && !i.touch_2);
    case "touch2":        return filtered.filter((i) => i.status === "Active" && i.touch_2 && !i.touch_3);
    case "touch3":        return filtered.filter((i) => i.status === "Active" && i.touch_3);
    case "replied":       return filtered.filter((i) => i.replied);
    case "archived":      return filtered.filter((i) => i.status === "Archived");
    default:              return filtered;
  }
}

/* ─── Stats strip ───────────────────────────────────────────────────── */
function InfluencerStats({ influencers }: { influencers: InfWithDue[] }) {
  const live = influencers.filter((i) => i.status !== "Deleted");
  const active = live.filter((i) => i.status === "Active");
  const replied = active.filter((i) => i.replied).length;
  const reEngageDue = live.filter((i) => i.status === "Archived" && i.dueTouch === "re_engage").length;
  const due = active.filter((i) => i.dueTouch).length + reEngageDue;
  const ig = active.filter((i) => i.platform === "IG").length;
  const xct = active.filter((i) => i.platform === "X").length;
  return (
    <div className="stats-grid" style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      gap: 1, background: "var(--border)",
      border: "1px solid var(--border)", borderRadius: 12,
      overflow: "hidden", marginBottom: 18, minWidth: 600,
    }}>
      {[
        { label: "Due", value: due, color: "var(--accent)", note: reEngageDue > 0 ? `${reEngageDue} re-engage ready` : "touches pending" },
        { label: "Active", value: active.length, color: "var(--text)", note: `${ig} IG · ${xct} X` },
        { label: "Replied", value: replied, color: "var(--green)", note: `${active.length > 0 ? Math.round(replied / active.length * 100) : 0}% reply rate` },
        { label: "Archived", value: live.filter((i) => i.status === "Archived").length, color: "var(--text-muted)", note: "completed outreach" },
      ].map((s, i) => (
        <div key={i} style={{ background: "var(--surface)", padding: "14px 18px" }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{s.label}</div>
          <div className="stat-num" style={{ fontSize: 26, color: s.color, marginTop: 6, letterSpacing: "-0.02em" }}>{s.value}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{s.note}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Platform badge ────────────────────────────────────────────────── */
function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, borderRadius: 7,
      background: PLATFORM_BG[platform] ?? "var(--surface-3)",
      color: PLATFORM_COLORS[platform] ?? "var(--text)",
      border: `1px solid color-mix(in oklch, ${PLATFORM_COLORS[platform] ?? "var(--text)"} 25%, transparent)`,
    }}>
      {platform === "IG" ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.763l7.727-8.854-8.144-10.646h5.346l4.261 5.631 5.091-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      )}
    </span>
  );
}

/* ─── Inline edit ────────────────────────────────────────────────────── */
function InfInlineEdit({ value, onSave, placeholder, textStyle }: {
  value: string | null;
  onSave: (v: string) => void;
  placeholder?: string;
  textStyle?: React.CSSProperties;
}) {
  const [local, setLocal] = useState(value || "");
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setLocal(value || ""); }, [value, focused]);
  return (
    <input
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); if (local !== (value || "")) onSave(local); }}
      style={{
        width: "100%", background: focused ? "var(--surface-2)" : "transparent",
        border: "1px solid " + (focused ? "var(--accent-line)" : "transparent"),
        borderRadius: 5, padding: "3px 6px",
        color: local ? "var(--text)" : "var(--text-dim)",
        fontSize: 12.5, fontFamily: "inherit", outline: "none",
        lineHeight: 1.4, transition: "background 0.12s, border-color 0.12s", ...textStyle,
      }}
      onMouseEnter={(e) => { if (!focused) (e.target as HTMLInputElement).style.background = "var(--surface-2)"; }}
      onMouseLeave={(e) => { if (!focused) (e.target as HTMLInputElement).style.background = "transparent"; }}
    />
  );
}

/* ─── Touch cell ────────────────────────────────────────────────────── */
function InfTouchCell({ checked, date, disabled, onToggle, onDateChange }: {
  checked: boolean;
  date: string | null;
  disabled: boolean;
  onToggle: (v: boolean) => void;
  onDateChange?: (d: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <button
        onClick={() => !disabled && onToggle(!checked)}
        disabled={disabled}
        style={{
          width: 22, height: 22, borderRadius: 6,
          background: checked ? "var(--accent)" : "transparent",
          border: "1px solid " + (checked ? "var(--accent)" : (disabled ? "var(--border)" : "var(--border-strong)")),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#1a1208", cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
          transition: "all 0.15s",
          boxShadow: checked ? "0 0 0 3px var(--accent-dim)" : "none",
        }}
      >
        {checked && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </button>
      {date && (
        <div style={{ position: "relative", display: "inline-block", marginTop: 2 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", padding: "1px 3px", userSelect: "none" }}>{fmtDate(date)}</div>
          <input type="date" value={date} onChange={(e) => onDateChange?.(e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", zIndex: 2 }}/>
        </div>
      )}
    </div>
  );
}

/* ─── Influencer row ────────────────────────────────────────────────── */
function InfluencerRow({ inf, num, selected, today, onSelect, onFieldUpdate, onTouchToggle, onTouchDateChange, onArchive, onSoftDelete, onPermDelete, onRestore, onReEngage }: {
  inf: InfWithDue;
  num: number;
  selected: boolean;
  today: string;
  onSelect: (id: string, on: boolean) => void;
  onFieldUpdate: (id: string, field: string, value: string | boolean | null) => void;
  onTouchToggle: (id: string, touch: "touch_1" | "touch_2" | "touch_3", checked: boolean) => void;
  onTouchDateChange: (id: string, field: string, value: string) => void;
  onArchive: (id: string) => void;
  onSoftDelete: (id: string) => void;
  onPermDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onReEngage: (id: string) => void;
}) {
  const handle = inf.link.split("/").pop() ?? inf.link;
  const isArchived = inf.status === "Archived";
  const isDeleted = inf.status === "Deleted";

  return (
    <div className="row-hover" style={{
      display: "grid",
      gridTemplateColumns: "36px 44px 220px 110px 90px 90px 90px 150px 1fr 70px",
      alignItems: "center", padding: "12px 14px",
      borderTop: "1px solid var(--border)",
      background: selected ? "color-mix(in oklch, var(--accent) 8%, transparent)" : "transparent",
      borderLeft: (inf.dueArchive && !isArchived) ? "2px solid var(--red)" : (inf.dueTouch && !isArchived) ? "2px solid var(--accent)" : "2px solid transparent",
      opacity: isArchived ? 0.55 : 1,
      minHeight: 64, transition: "background 0.12s",
    }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={() => onSelect(inf.id, !selected)} style={{
          width: 16, height: 16, borderRadius: 4,
          border: "1px solid " + (selected ? "var(--accent)" : "var(--border-strong)"),
          background: selected ? "var(--accent)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#1a1208", cursor: "pointer",
        }}>
          {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>
      </div>

      <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center" }}>{String(num).padStart(2, "0")}</div>

      <div style={{ paddingRight: 16, paddingLeft: 4 }}>
        <InfInlineEdit
          value={"@" + handle}
          onSave={(v) => onFieldUpdate(inf.id, "link", inf.link.replace(handle, v.replace(/^@/, "")))}
          placeholder="@handle"
          textStyle={{ fontWeight: 500, fontSize: 13.5, color: "var(--text)" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <InfInlineEdit
            value={inf.link}
            onSave={(v) => onFieldUpdate(inf.id, "link", v)}
            placeholder="platform.com/handle"
            textStyle={{ fontSize: 11, color: "var(--text-muted)" }}
          />
          <a href={`https://${inf.link}`} target="_blank" rel="noreferrer" style={{ color: "var(--text-dim)", display: "flex", alignItems: "center", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <PlatformBadge platform={inf.platform}/>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <InfTouchCell
          checked={inf.touch_1} date={inf.touch_1_date} disabled={isArchived}
          onToggle={(v) => onTouchToggle(inf.id, "touch_1", v)}
          onDateChange={(d) => onTouchDateChange(inf.id, "touch_1_date", d)}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <InfTouchCell
          checked={inf.touch_2} date={inf.touch_2_date} disabled={isArchived || !inf.touch_1}
          onToggle={(v) => onTouchToggle(inf.id, "touch_2", v)}
          onDateChange={(d) => onTouchDateChange(inf.id, "touch_2_date", d)}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <InfTouchCell
          checked={inf.touch_3} date={inf.touch_3_date} disabled={isArchived || !inf.touch_2}
          onToggle={(v) => onTouchToggle(inf.id, "touch_3", v)}
          onDateChange={(d) => onTouchDateChange(inf.id, "touch_3_date", d)}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        {inf.replied ? (
          <button
            onClick={() => onFieldUpdate(inf.id, "replied", false)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 500,
              background: "var(--green-dim)", color: "var(--green)",
              border: "1px solid color-mix(in oklch, var(--green) 35%, transparent)",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = "var(--red-dim)"; el.style.color = "var(--red)"; el.style.borderColor = "color-mix(in oklch, var(--red) 35%, transparent)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = "var(--green-dim)"; el.style.color = "var(--green)"; el.style.borderColor = "color-mix(in oklch, var(--green) 35%, transparent)"; }}
            title="Click to unmark replied"
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }}/>
            Replied
          </button>
        ) : (
          <button
            onClick={() => onFieldUpdate(inf.id, "replied", true)}
            style={{
              padding: "5px 12px", fontSize: 11.5, fontWeight: 500,
              background: "transparent", color: "var(--text-muted)",
              border: "1px solid var(--border)", borderRadius: 7,
              display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = "var(--green)"; el.style.borderColor = "color-mix(in oklch, var(--green) 35%, transparent)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = "var(--text-muted)"; el.style.borderColor = "var(--border)"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.45 }}><polyline points="20 6 9 17 4 12"/></svg>
            Mark replied
          </button>
        )}
      </div>

      <div style={{ paddingRight: 12 }}>
        <InfInlineEdit value={inf.notes} onSave={(v) => onFieldUpdate(inf.id, "notes", v)} placeholder="Add notes…"/>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>
        {isDeleted ? (
          <>
            <button onClick={() => onRestore(inf.id)} className="btn-icon" title="Restore" style={{ width: 26, height: 26 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button onClick={() => onPermDelete(inf.id)} className="btn-icon" title="Delete permanently" style={{ width: 26, height: 26, color: "var(--red)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
            </button>
          </>
        ) : isArchived ? (
          <>
            <button
              onClick={() => inf.dueTouch === "re_engage" ? onReEngage(inf.id) : onRestore(inf.id)}
              className="btn-icon"
              title={inf.dueTouch === "re_engage" ? "Re-engage" : "Restore to Active"}
              style={{ width: 26, height: 26, color: inf.dueTouch === "re_engage" ? "var(--accent)" : undefined }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button onClick={() => onSoftDelete(inf.id)} className="btn-icon" title="Delete" style={{ width: 26, height: 26 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
            </button>
          </>
        ) : (
          <>
            <button onClick={() => onArchive(inf.id)} className="btn-icon" title="Archive" style={{ width: 26, height: 26 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18v3H3z"/><path d="M5 10v10h14V10"/><path d="M10 14h4"/></svg>
            </button>
            <button onClick={() => onSoftDelete(inf.id)} className="btn-icon" title="Delete" style={{ width: 26, height: 26 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Add influencer modal ──────────────────────────────────────────── */
function AddInfluencerModal({ onClose, onAdd }: { onClose: () => void; onAdd: (fd: FormData) => void }) {
  const [platform, setPlatform] = useState<"IG" | "X">("IG");

  const inp = {
    style: { width: "100%", padding: "7px 10px", borderRadius: 7, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" } as React.CSSProperties,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { (e.target as HTMLElement).style.borderColor = "var(--accent-line)"; },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { (e.target as HTMLElement).style.borderColor = "var(--border)"; },
  };

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("platform", platform);
    onAdd(fd);
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", zIndex: 60 }}/>
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "90vw", maxWidth: 440, background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: 14, padding: 24, zIndex: 61,
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Add influencer</div>
          <button onClick={onClose} className="btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 5 }}>Profile link *</div>
            <input {...inp} name="link" placeholder="instagram.com/handle or x.com/handle" required autoFocus/>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 5 }}>Platform</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["IG", "X"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPlatform(p)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 7, fontSize: 13, fontWeight: 500,
                  background: platform === p ? "var(--surface-3)" : "transparent",
                  color: platform === p ? PLATFORM_COLORS[p] : "var(--text-muted)",
                  border: "1px solid " + (platform === p ? "var(--border-strong)" : "var(--border)"),
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <PlatformBadge platform={p}/>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 5 }}>Notes</div>
            <textarea {...inp} name="notes" rows={2} placeholder="Optional notes…" style={{ ...inp.style, resize: "none" }}/>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="submit" style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#1a1208", border: "none", cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}>Add influencer</button>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
interface Props {
  influencers: InfWithDue[];
  today?: string;
}

export function InfluencerClient({ influencers: initialInfluencers, today: todayProp }: Props) {
  const router = useRouter();
  const [influencers, setInfluencers] = useState<InfWithDue[]>(initialInfluencers);
  const [touchFilter, setTouchFilter] = useState<FilterId>("not_contacted");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [isPendingImport, startImport] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const today = todayProp ?? new Date().toISOString().split("T")[0];

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel("influencers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "influencers" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);

  useEffect(() => { setInfluencers(initialInfluencers); }, [initialInfluencers]);

  function updateField(id: string, field: string, value: string | boolean | null) {
    setInfluencers((list) => list.map((i) => i.id === id ? { ...i, [field]: value } : i));
    startTransition(async () => { await updateInfluencerField(id, field, value); });
  }

  function handleTouchToggle(id: string, touch: "touch_1" | "touch_2" | "touch_3", checked: boolean) {
    const inf = influencers.find((i) => i.id === id);
    const autoArchive = touch === "touch_3" && checked && !!inf && !inf.replied;
    const dateField = `${touch}_date` as keyof InfWithDue;
    setInfluencers((list) => list.map((i) => {
      if (i.id !== id) return i;
      const updated = { ...i, [touch]: checked, [dateField]: checked ? today : null };
      if (autoArchive) updated.status = "Archived";
      if (touch === "touch_3") updated.dueArchive = false;
      return updated;
    }));
    startTransition(async () => {
      await setTouch(id, touch, checked);
      if (autoArchive) await archiveInfluencer(id);
    });
  }

  function handleTouchDateChange(id: string, field: string, value: string) {
    setInfluencers((list) => list.map((i) => i.id === id ? { ...i, [field]: value } : i));
    startTransition(async () => { await updateInfluencerField(id, field, value); });
  }

  function handleArchive(id: string) {
    setInfluencers((list) => list.map((i) => i.id === id ? { ...i, status: "Archived" as const } : i));
    startTransition(async () => { await archiveInfluencer(id); });
  }

  function handleSoftDelete(id: string) {
    setInfluencers((list) => list.map((i) => i.id === id ? { ...i, status: "Deleted" as const } : i));
    startTransition(async () => { await softDeleteInfluencer(id); });
  }

  function handlePermDelete(id: string) {
    setInfluencers((list) => list.filter((i) => i.id !== id));
    startTransition(async () => { await hardDeleteInfluencer(id); });
  }

  function handleRestore(id: string) {
    setInfluencers((list) => list.map((i) => i.id === id ? { ...i, status: "Active" as const } : i));
    startTransition(async () => { await restoreInfluencer(id); });
  }

  function handleReEngage(id: string) {
    setInfluencers((list) => list.map((i) => i.id === id ? {
      ...i, status: "Active" as const,
      touch_1: false, touch_2: false, touch_3: false,
      touch_1_date: null, touch_2_date: null, touch_3_date: null,
      archive_date: null, dueTouch: null, dueArchive: false,
    } : i));
    startTransition(async () => { await reEngageInfluencer(id); });
  }

  function selectOne(id: string, on: boolean) {
    setSelected((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n; });
  }

  function sanitizeCsvCell(v: string): string {
    return /^[=+\-@|]/.test(v) ? `\t${v}` : v;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split(/\r?\n/);
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => sanitizeCsvCell(v.trim().replace(/^"|"$/g, "")));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
        return obj;
      }).filter((r) => r.link);
      startImport(async () => { await importInfluencers(rows as Parameters<typeof importInfluencers>[0]); router.refresh(); });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function exportCSV() {
    const headers = ["link","platform","notes","status","touch_1","touch_2","touch_3","replied"];
    const rows = influencers.map((i) => headers.map((h) => {
      const v = sanitizeCsvCell(String((i as unknown as Record<string, unknown>)[h] ?? ""));
      return `"${v.replace(/"/g, '""')}"`;
    }).join(","));
    const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "influencers.csv"; a.click();
  }

  const filtered = useMemo(() => getFiltered(influencers, touchFilter, platformFilter), [influencers, touchFilter, platformFilter]);
  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));

  return (
    <div className="fade-in">
      {/* Mobile: inject Add + Import/Export into TopBar */}
      <MobileActionsPortal>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "var(--accent)", color: "#1a1208", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add
        </button>
        <MobileMoreMenu onImport={() => fileInputRef.current?.click()} onExport={exportCSV} />
      </MobileActionsPortal>

      <InfluencerStats influencers={influencers}/>

      {/* Mobile: filter trigger */}
      <button
        className="mobile-filter-trigger"
        onClick={() => setFiltersOpen((v) => !v)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <span>{INF_FILTERS.find((f) => f.id === touchFilter)?.label}</span>
          <span className="mono" style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 5, background: "var(--accent-dim)", color: "var(--accent)", fontWeight: 600 }}>{filtered.length}</span>
          {platformFilter !== "All" && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>· {platformFilter}</span>}
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {/* Filter row */}
      <div className={`filter-row${filtersOpen ? " open" : ""}`} style={{ display: "flex", alignItems: "center", gap: 4, padding: 3, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 12 }}>
        {INF_FILTERS.map((f) => {
          const isActive = touchFilter === f.id;
          const count = getFiltered(influencers, f.id, platformFilter).length;
          return (
            <button key={f.id} onClick={() => { setTouchFilter(f.id); setSelected(new Set()); setFiltersOpen(false); }} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "6px 12px", borderRadius: 7, whiteSpace: "nowrap",
              background: isActive ? "var(--surface-2)" : "transparent",
              color: isActive ? "var(--text)" : "var(--text-muted)",
              border: "none", fontSize: 12.5, fontWeight: isActive ? 500 : 400,
              boxShadow: isActive ? "inset 0 0 0 1px var(--border), 0 1px 2px rgba(0,0,0,0.3)" : "none",
              cursor: "pointer",
            }}>
              <span style={{ color: isActive ? "var(--accent)" : "var(--text-dim)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>{f.icon}</span>
              {f.label}
              <span className="mono" style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 5, background: isActive ? "var(--accent-dim)" : "var(--surface-3)", color: isActive ? "var(--accent)" : "var(--text-muted)", fontWeight: 600 }}>{count}</span>
            </button>
          );
        })}
        <div style={{ flex: 1 }}/>
        <div style={{ display: "flex", gap: 3, padding: "3px 3px 3px 0" }}>
          {["All", "IG", "X"].map((p) => (
            <button key={p} onClick={() => setPlatformFilter(p)} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: platformFilter === p ? 500 : 400,
              background: platformFilter === p ? "var(--surface-2)" : "transparent",
              color: platformFilter === p ? "var(--text)" : "var(--text-muted)",
              border: "none", cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: platformFilter === p ? "inset 0 0 0 1px var(--border), 0 1px 2px rgba(0,0,0,0.2)" : "none",
            }}>{p}</button>
          ))}
        </div>
        <div className="filter-sep" style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }}/>
      </div>

      {/* Toolbar */}
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileChange}/>
      <div className={`page-toolbar${selected.size > 0 ? " has-selection" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        {selected.size > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--accent-line)", borderRadius: 9, fontSize: 12.5 }}>
            <span style={{ color: "var(--text)" }}><span className="mono" style={{ color: "var(--accent)" }}>{selected.size}</span> selected</span>
            <span style={{ width: 1, height: 14, background: "var(--border)" }}/>
            <button onClick={() => { selected.forEach((id) => handleArchive(id)); setSelected(new Set()); }} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12.5, cursor: "pointer" }}>Archive</button>
            <button onClick={() => { selected.forEach((id) => handleSoftDelete(id)); setSelected(new Set()); }} style={{ background: "transparent", border: "none", color: "var(--red)", fontSize: 12.5, cursor: "pointer" }}>Delete</button>
            <div style={{ flex: 1 }}/>
            <button onClick={() => setSelected(new Set())} className="btn-icon" style={{ width: 24, height: 24 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ) : <div/>}
        <div className="page-actions" style={{ display: "flex", gap: 8 }}>
          <button onClick={() => fileInputRef.current?.click()} disabled={isPendingImport} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {isPendingImport ? "Importing…" : "Import CSV"}
          </button>
          <button onClick={exportCSV} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button onClick={() => setShowAdd(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "var(--accent)", color: "#1a1208", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add influencer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 1060 }}>
            <div style={{
              display: "grid", gridTemplateColumns: "36px 44px 220px 110px 90px 90px 90px 150px 1fr 70px",
              padding: "10px 14px", background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              fontSize: 10.5, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
              alignItems: "center",
            }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button onClick={() => setSelected(allSelected ? new Set() : new Set(filtered.map((i) => i.id)))} style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: "1px solid " + (allSelected ? "var(--accent)" : "var(--border-strong)"),
                  background: allSelected ? "var(--accent)" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1208",
                }}>{allSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</button>
              </div>
              <div style={{ textAlign: "center" }}>#</div>
              <div style={{ paddingLeft: 4 }}>Handle</div>
              <div style={{ textAlign: "center" }}>Platform</div>
              <div style={{ textAlign: "center" }}>Bump 1</div>
              <div style={{ textAlign: "center" }}>Bump 2</div>
              <div style={{ textAlign: "center" }}>Bump 3</div>
              <div style={{ textAlign: "center" }}>Replied</div>
              <div>Notes</div>
              <div style={{ textAlign: "center" }}>Actions</div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: "64px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 32, color: "var(--text-dim)", marginBottom: 8 }}>○</div>
                <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 4 }}>No influencers here</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Try a different filter or add one.</div>
              </div>
            ) : (
              filtered.map((inf, i) => (
                <InfluencerRow
                  key={inf.id} inf={inf} num={i + 1} today={today}
                  selected={selected.has(inf.id)}
                  onSelect={selectOne}
                  onFieldUpdate={updateField}
                  onTouchToggle={handleTouchToggle}
                  onTouchDateChange={handleTouchDateChange}
                  onArchive={handleArchive}
                  onSoftDelete={handleSoftDelete}
                  onPermDelete={setConfirmDeleteId}
                  onRestore={handleRestore}
                  onReEngage={handleReEngage}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <AddInfluencerModal
          onClose={() => setShowAdd(false)}
          onAdd={(fd) => {
            const tempInf: InfWithDue = {
              id: `temp-${Date.now()}`,
              link: (fd.get("link") as string) || "",
              platform: (fd.get("platform") as "IG" | "X") || "IG",
              notes: (fd.get("notes") as string) || null,
              touch_1: false, touch_2: false, touch_3: false,
              touch_1_date: null, touch_2_date: null, touch_3_date: null,
              status: "Active",
              archive_date: null,
              cycle_count: 0,
              replied: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              dueTouch: null,
              dueArchive: false,
            };
            setInfluencers((list) => [tempInf, ...list]);
            startTransition(async () => {
              const result = await createInfluencer(fd);
              if (result && "error" in result) {
                alert("Failed to add influencer: " + result.error);
                setInfluencers((list) => list.filter((i) => i.id !== tempInf.id));
              } else {
                router.refresh();
              }
            });
          }}
        />
      )}

      {confirmDeleteId && (() => {
        const inf = influencers.find((i) => i.id === confirmDeleteId);
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
                    <strong style={{ color: "var(--text)" }}>&ldquo;{inf?.link}&rdquo;</strong> will be gone forever. This cannot be undone.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { handlePermDelete(confirmDeleteId); setConfirmDeleteId(null); }}
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
