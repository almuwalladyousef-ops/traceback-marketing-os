"use client";

import { useState, useMemo, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createPersonalLead,
  updatePersonalLeadField,
  softDeletePersonalLead,
  hardDeletePersonalLead,
  importPersonalLeads,
} from "@/server/actions/personal";
import type { PersonalLead } from "@/lib/supabase/types";
import { getBrowserClient } from "@/lib/supabase/browser";
import { MobileActionsPortal, MobileMoreMenu } from "@/components/shell/MobileActionsPortal";

type Lead = PersonalLead & { due: boolean };

function fmtDate(d: string | null) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
}

function isDueDate(d: string | null, today: string) {
  if (!d) return false;
  return d <= today;
}

const P_FILTERS = [
  { id: "active",   label: "Active",   icon: "○" },
  { id: "due",      label: "Due",      icon: "!" },
  { id: "archived", label: "Archived", icon: "▤" },
  { id: "deleted",  label: "Deleted",  icon: "✕" },
] as const;

type FilterId = typeof P_FILTERS[number]["id"];

/* ─── Inline edit ────────────────────────────────────────────────────── */
function PInlineEdit({ value, onSave, placeholder, textStyle }: {
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
        transition: "background 0.12s, border-color 0.12s", ...textStyle,
      }}
      onMouseEnter={(e) => { if (!focused) (e.target as HTMLInputElement).style.background = "var(--surface-2)"; }}
      onMouseLeave={(e) => { if (!focused) (e.target as HTMLInputElement).style.background = "transparent"; }}
    />
  );
}

/* ─── Date contacted cell ──────────────────────────────────────────── */
function DateContactedCell({ date, onSave }: { date: string | null; onSave: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: 22, height: 22 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: date ? "var(--accent)" : "transparent",
          border: "1px solid " + (date ? "var(--accent)" : "var(--border-strong)"),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#1a1208", pointerEvents: "none",
          boxShadow: date ? "0 0 0 3px var(--accent-dim)" : "none",
          transition: "all 0.15s",
        }}>
          {date && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>
        <input
          type="date"
          value={date || ""}
          onChange={(e) => onSave(e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", zIndex: 2 }}
        />
      </div>
      {date && (
        <div style={{ position: "relative", display: "inline-block" }}>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)", padding: "1px 2px", userSelect: "none" }}>{fmtDate(date)}</div>
          <input type="date" value={date} onChange={(e) => onSave(e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", zIndex: 2 }}/>
        </div>
      )}
    </div>
  );
}

/* ─── Follow-up date cell ───────────────────────────────────────────── */
function FollowUpCell({ date, today, onSave }: { date: string | null; today: string; onSave: (v: string) => void }) {
  const due = isDueDate(date, today);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      {due && (
        <span style={{
          fontSize: 9.5, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
          background: "var(--accent-dim)", color: "var(--accent)",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>Due</span>
      )}
      <div style={{ position: "relative", display: "inline-block" }}>
        <div className="mono" style={{
          fontSize: 11.5, padding: "2px 7px", borderRadius: 5,
          color: due ? "var(--accent)" : (date ? "var(--text-muted)" : "var(--text-dim)"),
          border: date ? "none" : "1px dashed var(--border-strong)",
          userSelect: "none", pointerEvents: "none",
          minWidth: 44, textAlign: "center",
        }}>
          {fmtDate(date) || "Set"}
        </div>
        <input
          type="date"
          value={date || today}
          onChange={(e) => onSave(e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", zIndex: 10 }}
        />
      </div>
    </div>
  );
}

/* ─── Lead row ──────────────────────────────────────────────────────── */
function LeadRow({ lead, num, selected, today, onSelect, onUpdate, onDelete, onPermDelete }: {
  lead: Lead;
  num: number;
  selected: boolean;
  today: string;
  onSelect: (id: string, on: boolean) => void;
  onUpdate: (id: string, field: string, value: string | null) => void;
  onDelete: (id: string) => void;
  onPermDelete: (id: string) => void;
}) {
  const isDead = lead.status === "Dead";
  const isArchived = lead.status === "Archived";
  const isDimmed = isArchived || isDead;

  return (
    <div className="row-hover" style={{
      display: "grid",
      gridTemplateColumns: "36px 44px 200px 160px 95px 85px 120px 100px 1fr 70px",
      alignItems: "center", padding: "12px 14px",
      borderTop: "1px solid var(--border)",
      background: selected ? "color-mix(in oklch, var(--accent) 8%, transparent)" : "transparent",
      opacity: isDimmed ? 0.55 : 1, minHeight: 64,
      transition: "background 0.12s",
    }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={() => onSelect(lead.id, !selected)} style={{
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

      <div style={{ paddingRight: 12, paddingLeft: 4 }}>
        <PInlineEdit value={lead.name} onSave={(v) => onUpdate(lead.id, "name", v)} placeholder="Name" textStyle={{ fontWeight: 500, fontSize: 13.5 }}/>
        <PInlineEdit value={lead.where_found} onSave={(v) => onUpdate(lead.id, "where_found", v)} placeholder="Where found" textStyle={{ fontSize: 11, color: "var(--text-muted)" }}/>
      </div>

      <div style={{ paddingRight: 12, display: "flex", alignItems: "center", gap: 4 }}>
        <PInlineEdit value={lead.handle_or_url} onSave={(v) => onUpdate(lead.id, "handle_or_url", v)} placeholder="handle or URL" textStyle={{ fontSize: 12, color: "var(--text-muted)" }}/>
        {lead.handle_or_url && (
          <a href={lead.handle_or_url.startsWith("http") ? lead.handle_or_url : `https://${lead.handle_or_url}`} target="_blank" rel="noreferrer" style={{ color: "var(--text-dim)", display: "flex", alignItems: "center", flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        )}
      </div>

      <div style={{ paddingRight: 8 }}>
        <PInlineEdit value={lead.email} onSave={(v) => onUpdate(lead.id, "email", v)} placeholder="email" textStyle={{ fontSize: 12, color: "var(--text-muted)" }}/>
      </div>

      <div style={{ paddingRight: 8 }}>
        <PInlineEdit value={lead.phone} onSave={(v) => onUpdate(lead.id, "phone", v)} placeholder="phone" textStyle={{ fontSize: 12, color: "var(--text-muted)" }}/>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <DateContactedCell date={lead.date_contacted} onSave={(v) => onUpdate(lead.id, "date_contacted", v)}/>
      </div>

      <FollowUpCell date={lead.follow_up_date} today={today} onSave={(v) => onUpdate(lead.id, "follow_up_date", v)}/>

      <div style={{ paddingRight: 12 }}>
        <PInlineEdit value={lead.notes} onSave={(v) => onUpdate(lead.id, "notes", v)} placeholder="Add notes…" textStyle={{ fontSize: 12.5 }}/>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>
        {isDead ? (
          <>
            <button onClick={() => onUpdate(lead.id, "status", "Active")} className="btn-icon" title="Restore" style={{ width: 26, height: 26 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button onClick={() => onPermDelete(lead.id)} className="btn-icon" title="Delete permanently" style={{ width: 26, height: 26, color: "var(--red)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onUpdate(lead.id, "status", isArchived ? "Active" : "Archived")}
              className="btn-icon" title={isArchived ? "Restore" : "Archive"} style={{ width: 26, height: 26 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18v3H3z"/><path d="M5 10v10h14V10"/><path d="M10 14h4"/></svg>
            </button>
            <button onClick={() => onDelete(lead.id)} className="btn-icon" title="Delete" style={{ width: 26, height: 26 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Add lead modal ─────────────────────────────────────────────────── */
function AddLeadModal({ today, onClose, onAdd }: {
  today: string;
  onClose: () => void;
  onAdd: (data: FormData) => void;
}) {
  const inp = {
    style: { width: "100%", padding: "7px 10px", borderRadius: 7, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 12.5, fontFamily: "inherit", outline: "none" } as React.CSSProperties,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { (e.target as HTMLElement).style.borderColor = "var(--accent-line)"; },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { (e.target as HTMLElement).style.borderColor = "var(--border)"; },
  };

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onAdd(fd);
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", zIndex: 60 }}/>
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "90vw", maxWidth: 480, background: "var(--surface)", border: "1px solid var(--border-strong)",
        borderRadius: 14, padding: 24, zIndex: 61, boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Add lead</div>
          <button onClick={onClose} className="btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Name *</div>
              <input {...inp} name="name" placeholder="Full name" required autoFocus/>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Where found</div>
              <input {...inp} name="where_found" placeholder="Twitter, podcast…"/>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Handle or URL</div>
            <input {...inp} name="handle_or_url" placeholder="x.com/handle or website.com"/>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Email</div>
              <input {...inp} type="email" name="email" placeholder="name@email.com"/>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Phone</div>
              <input {...inp} name="phone" placeholder="+1 555 000 0000"/>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Follow-up date</div>
              <input {...inp} type="date" name="follow_up_date"/>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Date contacted</div>
              <input {...inp} type="date" name="date_contacted"/>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Notes</div>
            <textarea {...inp} name="notes" rows={2} placeholder="Optional notes…" style={{ ...inp.style, resize: "none" }}/>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="submit" style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#1a1208", border: "none", cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}>Add lead</button>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ─── Stats strip ───────────────────────────────────────────────────── */
function PersonalStats({ leads, today }: { leads: Lead[]; today: string }) {
  const live = leads.filter((l) => l.status !== "Dead");
  const active = live.filter((l) => l.status === "Active").length;
  const due = live.filter((l) => l.status === "Active" && isDueDate(l.follow_up_date, today)).length;
  const contacted = live.filter((l) => l.status === "Active" && l.date_contacted).length;
  const archived = live.filter((l) => l.status === "Archived").length;
  return (
    <div className="stats-grid" style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      gap: 1, background: "var(--border)",
      border: "1px solid var(--border)", borderRadius: 12,
      overflow: "hidden", marginBottom: 18,
    }}>
      {[
        { label: "Active leads", value: active, color: "var(--text)", note: "in pipeline" },
        { label: "Due", value: due, color: "var(--accent)", note: "follow-ups overdue" },
        { label: "Contacted", value: contacted, color: "var(--green)", note: "of active leads" },
        { label: "Archived", value: archived, color: "var(--text-muted)", note: "completed / closed" },
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

/* ─── Main component ─────────────────────────────────────────────────── */
interface Props {
  leads: Lead[];
  today?: string;
}

export function PersonalOutreachClient({ leads: initialLeads, today: todayProp }: Props) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [filter, setFilter] = useState<FilterId>("active");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [isPendingImport, startImport] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sort, setSort] = useState<"newest" | "oldest" | "az">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [, startTransition] = useTransition();

  const today = todayProp ?? new Date().toISOString().split("T")[0];

  // Realtime subscription
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel("personal-leads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "personal_leads" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);

  // Sync with server on refresh
  useEffect(() => { setLeads(initialLeads); }, [initialLeads]);

  const SORT_CYCLE: Record<string, "newest" | "oldest" | "az"> = { newest: "oldest", oldest: "az", az: "newest" };

  function updateLocal(id: string, field: string, value: string | null) {
    setLeads((ls) => ls.map((l) => l.id === id ? { ...l, [field]: value, due: field === "follow_up_date" ? isDueDate(value, today) : l.due } as Lead : l));
    startTransition(async () => { await updatePersonalLeadField(id, field, value); });
  }

  function softDelete(id: string) {
    setLeads((ls) => ls.map((l) => l.id === id ? { ...l, status: "Dead" } as Lead : l));
    startTransition(async () => { await softDeletePersonalLead(id); });
  }

  function permDelete(id: string) {
    setLeads((ls) => ls.filter((l) => l.id !== id));
    startTransition(async () => { await hardDeletePersonalLead(id); });
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
      }).filter((r) => r.name);
      startImport(async () => { await importPersonalLeads(rows as Parameters<typeof importPersonalLeads>[0]); router.refresh(); });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function exportCSV() {
    const headers = ["name","handle_or_url","phone","email","where_found","date_found","follow_up_date","date_contacted","notes","status"];
    const rows = leads.map((l) => headers.map((h) => {
      const v = sanitizeCsvCell(String((l as unknown as Record<string, unknown>)[h] ?? ""));
      return `"${v.replace(/"/g, '""')}"`;
    }).join(","));
    const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "personal-outreach.csv"; a.click();
  }

  const counts = useMemo(() => {
    const obj: Record<string, number> = {};
    for (const f of P_FILTERS) {
      switch (f.id) {
        case "active":   obj[f.id] = leads.filter((l) => l.status !== "Dead" && l.status === "Active").length; break;
        case "due":      obj[f.id] = leads.filter((l) => l.status !== "Dead" && l.status === "Active" && isDueDate(l.follow_up_date, today)).length; break;
        case "archived": obj[f.id] = leads.filter((l) => l.status !== "Dead" && l.status === "Archived").length; break;
        case "deleted":  obj[f.id] = leads.filter((l) => l.status === "Dead").length; break;
      }
    }
    return obj;
  }, [leads, today]);

  const filtered = useMemo(() => {
    let base: Lead[];
    switch (filter) {
      case "active":   base = leads.filter((l) => l.status !== "Dead" && l.status === "Active"); break;
      case "due":      base = leads.filter((l) => l.status !== "Dead" && l.status === "Active" && isDueDate(l.follow_up_date, today)); break;
      case "archived": base = leads.filter((l) => l.status !== "Dead" && l.status === "Archived"); break;
      case "deleted":  base = leads.filter((l) => l.status === "Dead"); break;
      default:         base = leads.filter((l) => l.status !== "Dead");
    }
    return [...base].sort((a, b) => {
      if (sort === "az") return a.name.localeCompare(b.name);
      const da = a.date_contacted ? new Date(a.date_contacted).getTime() : 0;
      const db = b.date_contacted ? new Date(b.date_contacted).getTime() : 0;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return sort === "newest" ? da - db : db - da;
    });
  }, [leads, filter, sort, today]);

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  return (
    <div className="fade-in">
      {/* Mobile: inject Add + Import/Export into TopBar */}
      <MobileActionsPortal>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "var(--accent)", color: "#1a1208", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add lead
        </button>
        <MobileMoreMenu onImport={() => fileInputRef.current?.click()} onExport={exportCSV} />
      </MobileActionsPortal>

      <PersonalStats leads={leads} today={today}/>

      {/* Mobile: filter + sort trigger */}
      <button
        className="mobile-filter-trigger"
        onClick={() => setFiltersOpen((v) => !v)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <span>{P_FILTERS.find((f) => f.id === filter)?.label}</span>
          <span className="mono" style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 5, background: "var(--accent-dim)", color: "var(--accent)", fontWeight: 600 }}>{counts[filter] || 0}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{sort === "newest" ? "Newest" : sort === "oldest" ? "Oldest" : "A → Z"}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
        </span>
      </button>

      {/* Filter row */}
      <div className={`filter-row${filtersOpen ? " open" : ""}`} style={{ display: "flex", alignItems: "center", gap: 4, padding: 3, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 12 }}>
        {P_FILTERS.map((f) => {
          const isActive = filter === f.id;
          return (
            <button key={f.id} onClick={() => { setFilter(f.id); setSelected(new Set()); setFiltersOpen(false); }} style={{
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
              <span className="mono" style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 5, background: isActive ? "var(--accent-dim)" : "var(--surface-3)", color: isActive ? "var(--accent)" : "var(--text-muted)", fontWeight: 600 }}>{counts[f.id] || 0}</span>
            </button>
          );
        })}
        <div style={{ flex: 1 }}/>
        <button className="filter-sort-btn" onClick={() => setSort((s) => SORT_CYCLE[s])} style={{
          padding: "6px 10px", fontSize: 12, color: "var(--text-muted)",
          background: "transparent", border: "1px solid var(--border)", borderRadius: 7,
          display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
        }}>
          Sort: {sort === "newest" ? "Newest" : sort === "oldest" ? "Oldest" : "A → Z"}
        </button>
      </div>

      {/* Toolbar */}
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileChange}/>
      <div className={`page-toolbar${selected.size > 0 ? " has-selection" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        {selected.size > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--accent-line)", borderRadius: 9, fontSize: 12.5 }}>
            <span style={{ color: "var(--text)" }}><span className="mono" style={{ color: "var(--accent)" }}>{selected.size}</span> selected</span>
            <span style={{ width: 1, height: 14, background: "var(--border)" }}/>
            <button onClick={() => { selected.forEach((id) => updateLocal(id, "status", "Archived")); setSelected(new Set()); }} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12.5, cursor: "pointer" }}>Archive</button>
            <button onClick={() => { selected.forEach((id) => softDelete(id)); setSelected(new Set()); }} style={{ background: "transparent", border: "none", color: "var(--red)", fontSize: 12.5, cursor: "pointer" }}>Delete</button>
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
            Add lead
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 1050 }}>
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "36px 44px 200px 160px 95px 85px 120px 100px 1fr 70px",
              padding: "10px 14px", background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              fontSize: 10.5, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, alignItems: "center",
            }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button onClick={() => setSelected(allSelected ? new Set() : new Set(filtered.map((l) => l.id)))} style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: "1px solid " + (allSelected ? "var(--accent)" : "var(--border-strong)"),
                  background: allSelected ? "var(--accent)" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1208",
                }}>{allSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</button>
              </div>
              <div style={{ textAlign: "center" }}>#</div>
              <div style={{ paddingLeft: 4 }}>Name</div>
              <div>Handle / URL</div>
              <div>Email</div>
              <div>Phone</div>
              <div style={{ textAlign: "center" }}>Contacted</div>
              <div style={{ textAlign: "center" }}>Follow-up</div>
              <div>Notes</div>
              <div style={{ textAlign: "center" }}>Actions</div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: "64px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 32, color: "var(--text-dim)", marginBottom: 8 }}>○</div>
                <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 4 }}>No leads here</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Try a different filter or add a lead.</div>
              </div>
            ) : (
              filtered.map((lead, i) => (
                <LeadRow
                  key={lead.id} lead={lead} num={i + 1} today={today}
                  selected={selected.has(lead.id)}
                  onSelect={selectOne}
                  onUpdate={updateLocal}
                  onDelete={softDelete}
                  onPermDelete={permDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <AddLeadModal
          today={today}
          onClose={() => setShowAdd(false)}
          onAdd={(fd) => startTransition(async () => {
            fd.set("status", "Active");
            await createPersonalLead(fd);
          })}
        />
      )}
    </div>
  );
}
