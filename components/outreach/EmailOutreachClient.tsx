"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateCompanyField,
  archiveCompany,
  unarchiveCompany,
  reEngageCompany,
  softDeleteCompany,
  restoreCompany,
  deleteCompany,
  bulkSoftDeleteCompanies,
  bulkDeleteCompanies,
  bulkArchiveCompanies,
  bulkUnarchiveCompanies,
  bulkRestoreCompanies,
  createCompany,
  importCompanies,
} from "@/server/actions/companies";
import { createContact, bulkCreateContacts, deleteContact, updateContactField, getCompanyContacts, getAllContactsByCompany } from "@/server/actions/contacts";
import type { Company, Contact } from "@/lib/supabase/types";
import { Plus, Upload, X, ExternalLink, ArchiveRestore, Trash2, RotateCcw, Archive } from "lucide-react";
import { MobileActionsPortal, MobileMoreMenu } from "@/components/shell/MobileActionsPortal";

type CompanyWithDue = Company & { due: boolean; dueArchive: boolean; reEngageDue: boolean };
type Filter = "not_started" | "sent" | "bump1" | "bump2" | "bump3" | "breakup" | "replied" | "archived" | "deleted";
type Sort = "oldest" | "newest" | "az";

interface Props {
  companies: CompanyWithDue[];
}

const FILTERS = [
  { id: "not_started" as Filter, label: "Not contacted", icon: "○" },
  { id: "sent" as Filter, label: "Sent", icon: "↗" },
  { id: "bump1" as Filter, label: "Bump 1", icon: "↻" },
  { id: "bump2" as Filter, label: "Bump 2", icon: "↻↻" },
  { id: "bump3" as Filter, label: "Bump 3", icon: "↻↻↻" },
  { id: "breakup" as Filter, label: "Close", icon: "✗" },
  { id: "replied" as Filter, label: "Replied", icon: "✓" },
  { id: "archived" as Filter, label: "Archived", icon: "▤" },
  { id: "deleted" as Filter, label: "Deleted", icon: "✕" },
];

const COLS = "36px 44px 200px 130px 80px 80px 80px 80px 80px 140px 130px 140px 180px 80px";
const MIN_WIDTH = "1520px";

const TODAY = new Date().toISOString().split("T")[0];

function daysAgo(d: string | null) {
  if (!d) return null;
  return Math.floor((new Date(TODAY).getTime() - new Date(d).getTime()) / 86400000);
}

function fmtDate(d: string | null) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
}

/* ─── Mini spark bars ─────────────────────────────────────────────────── */
function MiniBars({ data, color, height = 20 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${(v / max) * 100}%`,
          background: i === data.length - 1 ? color : `color-mix(in oklch, ${color} 35%, transparent)`,
          borderRadius: 2, minHeight: 2,
        }}/>
      ))}
    </div>
  );
}

/* ─── Stats strip ─────────────────────────────────────────────────────── */
function StatsStrip({ companies }: { companies: CompanyWithDue[] }) {
  const active = companies.filter((c) => !c.archived && !c.soft_deleted);
  const replied = companies.filter((c) => ["Replied", "In Conversation"].includes(c.status)).length;
  const sent = active.filter((c) => !!c.outreach_date).length;
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
  const dueToday = active.filter((c) => {
    if (!c.outreach_date || c.status === "Replied" || c.status === "Dead") return false;
    const d1 = daysAgo(c.outreach_date) ?? 0;
    if (!c.follow_up_date) return d1 >= 2;
    const d2 = daysAgo(c.follow_up_date) ?? 0;
    if (!c.follow_up_2_date) return d2 >= 4;
    const d3 = daysAgo(c.follow_up_2_date) ?? 0;
    if (!c.follow_up_3_date) return d3 >= 5;
    const d4 = daysAgo(c.follow_up_3_date) ?? 0;
    if (!c.follow_up_4_date) return d4 >= 6;
    return false;
  }).length + companies.filter((c) => c.reEngageDue).length;

  const stats = [
    { label: "Due", value: dueToday, color: "var(--accent)", note: "outreach + bumps" },
    { label: "Active pipeline", value: active.length, color: "var(--text)", note: `${sent} contacted` },
    { label: "Replies", value: replied, color: "var(--green)", note: `${replyRate}% reply rate` },
    { label: "This week sent", value: 0, color: "var(--text)", note: "emails this week", spark: [0, 0, 0, 0, 0, 0, 0] },
  ];

  return (
    <div className="stats-grid" style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      gap: 1, background: "var(--border)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden", marginBottom: 18,
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{ background: "var(--surface)", padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{s.label}</span>
            {s.spark && <div style={{ width: 56 }}><MiniBars data={s.spark} color={s.color} height={20}/></div>}
          </div>
          <div className="stat-num" style={{ fontSize: 26, color: s.color, marginTop: 6, letterSpacing: "-0.02em" }}>{s.value}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{s.note}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Filter row ──────────────────────────────────────────────────────── */
function FilterRow({
  filter,
  setFilter,
  counts,
  sort,
  onSortCycle,
  className,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  counts: Record<string, number>;
  sort: Sort;
  onSortCycle: () => void;
  className?: string;
}) {
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 4, padding: 3, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 14 }}>
      {FILTERS.map((f) => {
        const isActive = filter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "6px 12px", borderRadius: 7,
              background: isActive ? "var(--surface-2)" : "transparent",
              color: isActive ? "var(--text)" : "var(--text-muted)",
              border: "none", fontSize: 12.5,
              fontWeight: isActive ? 500 : 400,
              boxShadow: isActive ? "inset 0 0 0 1px var(--border), 0 1px 2px rgba(0,0,0,0.3)" : "none",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <span style={{ color: isActive ? "var(--accent)" : "var(--text-dim)", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>{f.icon}</span>
            <span>{f.label}</span>
            <span className="mono" style={{
              fontSize: 10.5, padding: "1px 6px", borderRadius: 5,
              background: isActive ? "var(--accent-dim)" : "var(--surface-3)",
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              fontWeight: 600,
            }}>{counts[f.id] ?? 0}</span>
          </button>
        );
      })}
      <div style={{ flex: 1 }}/>
      <button
        onClick={onSortCycle}
        className="filter-sort-btn"
        style={{
          padding: "6px 10px", fontSize: 12, color: "var(--text-muted)",
          background: "transparent", border: "1px solid var(--border)", borderRadius: 7,
          display: "inline-flex", alignItems: "center", gap: 6,
          cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {sort === "az" ? <><path d="M3 6h18M6 12h12M10 18h4"/></> : sort === "newest" ? <><path d="M3 18l4-12 4 12"/><path d="M5.5 13h5M17 6v12M14 9l3-3 3 3"/></> : <><path d="M3 6l4 12 4-12"/><path d="M5.5 11h5M17 18V6M14 15l3 3 3-3"/></>}
        </svg>
        Sort: {sort === "oldest" ? "Oldest first" : sort === "newest" ? "Newest first" : "A → Z"}
      </button>
    </div>
  );
}

/* ─── Inline edit ─────────────────────────────────────────────────────── */
function InlineEdit({
  value,
  onSave,
  placeholder,
  multiline,
  textStyle,
  disabled,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  textStyle?: React.CSSProperties;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => { if (!focused) setLocal(value); }, [value, focused]);

  const baseStyle: React.CSSProperties = {
    width: "100%",
    background: focused ? "var(--surface-2)" : "transparent",
    border: "1px solid " + (focused ? "var(--accent-line)" : "transparent"),
    borderRadius: 5, padding: "3px 6px",
    color: local ? "var(--text)" : "var(--text-dim)",
    fontSize: 12.5, fontFamily: "inherit", outline: "none", resize: "none",
    transition: "background 0.12s, border-color 0.12s",
    ...textStyle,
  };
  const handlers = {
    value: local,
    placeholder,
    disabled,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLocal(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => { setFocused(false); if (local !== value) onSave(local); },
    onMouseEnter: (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => { if (!focused && !disabled) (e.target as HTMLElement).style.background = "var(--surface-2)"; },
    onMouseLeave: (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => { if (!focused) (e.target as HTMLElement).style.background = "transparent"; },
    style: baseStyle,
  };
  return multiline ? <textarea rows={2} {...handlers as React.TextareaHTMLAttributes<HTMLTextAreaElement>}/> : <input {...handlers as React.InputHTMLAttributes<HTMLInputElement>}/>;
}

/* ─── Touch cell ──────────────────────────────────────────────────────── */
function TouchCell({
  date,
  disabled,
  onToggle,
  onDateChange,
}: {
  date: string | null;
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
  onDateChange: (date: string) => void;
}) {
  const filled = !!date;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <button
        onClick={() => !disabled && onToggle(!filled)}
        disabled={disabled}
        style={{
          width: 22, height: 22, borderRadius: 6,
          background: filled ? "var(--accent)" : "transparent",
          border: "1px solid " + (filled ? "var(--accent)" : (disabled ? "var(--border)" : "var(--border-strong)")),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#1a1208", cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.35 : 1, transition: "all 0.15s",
          boxShadow: filled ? "0 0 0 3px var(--accent-dim)" : "none",
        }}
      >
        {filled && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
      </button>
      {filled && date && (
        <div style={{ position: "relative", display: "inline-block", marginTop: 2 }}>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)", padding: "1px 3px", userSelect: "none" }}>{fmtDate(date)}</div>
          <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", zIndex: 2 }}/>
        </div>
      )}
    </div>
  );
}

/* ─── Status control (replied toggle) ─────────────────────────────────── */
function StatusControl({ status, onChange, disabled }: { status: string; onChange: (s: string) => void; disabled?: boolean }) {
  const isReplied = ["Replied", "In Conversation"].includes(status);
  return (
    <button
      onClick={() => !disabled && onChange(isReplied ? "Not Started" : "Replied")}
      disabled={disabled}
      style={{
        padding: "5px 12px", fontSize: 11.5, fontWeight: 500,
        background: isReplied ? "var(--green-dim)" : "transparent",
        color: isReplied ? "var(--green)" : "var(--text-muted)",
        border: "1px solid " + (isReplied ? "color-mix(in oklch, var(--green) 35%, transparent)" : "var(--border)"),
        borderRadius: 7, display: "inline-flex", alignItems: "center", gap: 6,
        cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s",
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (isReplied) {
          e.currentTarget.style.background = "var(--red-dim)";
          e.currentTarget.style.color = "var(--red)";
          e.currentTarget.style.borderColor = "color-mix(in oklch, var(--red) 35%, transparent)";
        } else {
          e.currentTarget.style.color = "var(--green)";
          e.currentTarget.style.borderColor = "color-mix(in oklch, var(--green) 35%, transparent)";
        }
      }}
      onMouseLeave={(e) => {
        if (isReplied) {
          e.currentTarget.style.background = "var(--green-dim)";
          e.currentTarget.style.color = "var(--green)";
          e.currentTarget.style.borderColor = "color-mix(in oklch, var(--green) 35%, transparent)";
        } else {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {isReplied
        ? <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }}/>
        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.45 }}><path d="M20 6 9 17l-5-5"/></svg>
      }
      {isReplied ? "Replied" : "Mark replied"}
    </button>
  );
}

/* ─── Contact chips (avatar stack) ────────────────────────────────────── */
function ContactChips({ contacts, onOpen, onAdd }: { contacts: Contact[]; onOpen: () => void; onAdd: () => void }) {
  const show = contacts.slice(0, 3);
  const extra = contacts.length - show.length;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "nowrap" }}>
      {contacts.length > 0 && (
        <button onClick={onOpen} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>
          {show.map((c, i) => (
            <div key={c.id} title={c.name} style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "var(--surface-3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9.5, fontWeight: 600, color: "var(--text-muted)",
              marginLeft: i === 0 ? 0 : -6,
              border: "2px solid var(--surface)",
            }}>
              {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
          ))}
          {extra > 0 && (
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "var(--surface-3)", marginLeft: -6,
              border: "2px solid var(--surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 600, color: "var(--text-muted)",
            }}>+{extra}</div>
          )}
        </button>
      )}
      <button onClick={onAdd} title="Add contact" style={{
        width: 22, height: 22, borderRadius: 6,
        background: "transparent", border: "1px dashed var(--border-strong)",
        color: "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
      }}>
        <Plus size={11}/>
      </button>
    </div>
  );
}

/* ─── Messages panel (localStorage, single textarea) ─────────────────── */
function EmailMessagesPanel({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(`email-msg-${companyId}`) ?? "") : ""
  );

  const hasText = text.trim().length > 0;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    localStorage.setItem(`email-msg-${companyId}`, e.target.value);
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "0 6px" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Message"
        style={{
          fontSize: 11.5, padding: "5px 12px", borderRadius: 7,
          background: hasText ? "var(--accent-dim)" : "transparent",
          color: hasText ? "var(--accent)" : "var(--text-muted)",
          border: "1px solid " + (hasText ? "var(--accent-line)" : "var(--border)"),
          cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "all 0.12s", width: "100%", fontWeight: 500,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {hasText ? "Msgs ✓" : "Msgs"}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 58 }}/>
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: 460, maxWidth: "92vw", background: "var(--surface)",
            border: "1px solid var(--border-strong)", borderRadius: 12, padding: 20,
            zIndex: 59, boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Message</div>
              <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
            </div>
            <textarea
              value={text}
              onChange={handleChange}
              placeholder="Paste message here…"
              rows={12}
              style={{
                width: "100%", resize: "vertical",
                background: "var(--surface-3)", border: "1px solid var(--border)",
                borderRadius: 6, padding: "8px 10px",
                color: "var(--text)", fontSize: 11.5,
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                lineHeight: 1.6, outline: "none", whiteSpace: "pre", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Paste contacts parser ───────────────────────────────────────────── */
function parsePastedContacts(text: string) {
  const blocks = text.trim().split(/\n[ \t]*\n/);
  return blocks.map((block) => {
    const lines = block.trim().split("\n");
    const get = (key: string) => {
      const line = lines.find((l) => l.toLowerCase().startsWith(key.toLowerCase() + ":"));
      if (!line) return "";
      return line.slice(line.indexOf(":") + 1).trim();
    };
    return {
      name: get("name"),
      role: get("role"),
      email: get("email"),
      phone: get("phone"),
      x_handle: get("x"),
      linkedin_url: get("linkedin"),
    };
  }).filter((c) => c.name);
}

/* ─── Contact slide-over ──────────────────────────────────────────────── */
function CompanySlideOver({
  company,
  onClose,
  startAddContact,
  onPermDelete,
}: {
  company: CompanyWithDue;
  onClose: () => void;
  startAddContact: boolean;
  onPermDelete: (id: string) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showAdd, setShowAdd] = useState(startAddContact);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState<ReturnType<typeof parsePastedContacts>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingContacts(true);
    getCompanyContacts(company.id).then((data) => {
      setContacts(data);
      setLoadingContacts(false);
    });
  }, [company.id]);

  async function reloadContacts() {
    const data = await getCompanyContacts(company.id);
    setContacts(data);
  }

  function startEdit(ct: Contact) {
    setEditingId(ct.id);
    setEditDraft({ name: ct.name, role: ct.role ?? "", email: ct.email ?? "", phone: ct.phone ?? "", x_handle: ct.x_handle ?? "", linkedin_url: ct.linkedin_url ?? "" });
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      await Promise.all([
        updateContactField(id, "name", editDraft.name || null),
        updateContactField(id, "role", editDraft.role || null),
        updateContactField(id, "email", editDraft.email || null),
        updateContactField(id, "phone", editDraft.phone || null),
        updateContactField(id, "x_handle", editDraft.x_handle || null),
        updateContactField(id, "linkedin_url", editDraft.linkedin_url || null),
      ]);
      setEditingId(null);
      await reloadContacts();
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("company_id", company.id);
    startTransition(async () => {
      await createContact(fd);
      setShowAdd(false);
      await reloadContacts();
    });
  }

  function handlePasteChange(text: string) {
    setPasteText(text);
    setPastePreview(parsePastedContacts(text));
  }

  async function handlePasteImport() {
    const parsed = parsePastedContacts(pasteText);
    if (!parsed.length) return;
    setIsImporting(true);
    try {
      const result = await bulkCreateContacts(company.id, parsed);
      if (result && "error" in result) {
        alert("Import failed: " + result.error);
        return;
      }
      setShowPaste(false);
      setPasteText("");
      setPastePreview([]);
      await reloadContacts();
    } catch (err) {
      alert("Import error: " + String(err));
    } finally {
      setIsImporting(false);
    }
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContact(id);
      if (editingId === id) setEditingId(null);
      await reloadContacts();
    });
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "6px 9px", borderRadius: 6,
    background: "var(--surface)", border: "1px solid var(--border)",
    color: "var(--text)", fontSize: 12.5, fontFamily: "inherit", outline: "none",
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)", zIndex: 50,
      }}/>
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "85vw", maxWidth: 520,
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        zIndex: 51, display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: "var(--surface-3)", border: "1px solid var(--border-strong)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 600, color: "var(--text)",
              }}>{company.name[0]}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{company.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{company.industry ?? "—"} · {company.url ?? "—"}</div>
              </div>
            </div>
            <button onClick={onClose} className="btn-icon">
              <X size={14}/>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Timeline */}
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 12 }}>Outreach timeline</div>
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
            {[
              { label: "Initial", date: company.outreach_date },
              { label: "Bump 1", date: company.follow_up_date },
              { label: "Bump 2", date: company.follow_up_2_date },
              { label: "Bump 3", date: company.follow_up_3_date },
              { label: "Close", date: company.follow_up_4_date },
            ].map((step, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: step.date ? "var(--accent)" : "var(--surface-3)",
                    border: step.date ? "none" : "1px dashed var(--border-strong)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#1a1208",
                    boxShadow: step.date ? "0 0 0 4px var(--accent-dim)" : "none",
                    flexShrink: 0,
                  }}>
                    {step.date
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      : <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>{i + 1}</span>
                    }
                  </div>
                  {i < arr.length - 1 && (
                    <span style={{ flex: 1, minHeight: 8, width: 1, background: "var(--border)", marginTop: 3 }}/>
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: i < arr.length - 1 ? 10 : 0, paddingTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{step.label}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {step.date ? `${fmtDate(step.date)} · ${daysAgo(step.date)}d ago` : "Not sent"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {company.reply_notes && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>Reply notes</div>
              <div style={{ padding: 14, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, lineHeight: 1.55, color: "var(--text)" }}>
                {company.reply_notes}
              </div>
            </div>
          )}

          {/* Contacts */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Contacts{loadingContacts ? " …" : ` · ${contacts.length}`}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => { setShowPaste((v) => { if (!v) setShowAdd(false); return !v; }); setPasteText(""); setPastePreview([]); }}
                  title="Paste multiple contacts at once"
                  style={{
                    fontSize: 11.5, background: showPaste ? "color-mix(in oklch, var(--text-muted) 15%, transparent)" : "transparent",
                    color: showPaste ? "var(--text)" : "var(--text-muted)",
                    border: "1px solid " + (showPaste ? "var(--border-strong)" : "var(--border)"),
                    borderRadius: 6, padding: "4px 9px",
                    display: "inline-flex", alignItems: "center", gap: 5,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M8 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2"/><path d="M10 12h4M10 16h4"/></svg>
                  {showPaste ? "Cancel" : "Paste"}
                </button>
                <button
                  onClick={() => { setShowAdd((v) => !v); if (!showAdd) setShowPaste(false); setTimeout(() => nameRef.current?.focus(), 0); }}
                  style={{
                    fontSize: 11.5, background: showAdd ? "var(--accent-dim)" : "transparent",
                    color: showAdd ? "var(--accent)" : "var(--text-muted)",
                    border: "1px solid " + (showAdd ? "var(--accent-line)" : "var(--border)"),
                    borderRadius: 6, padding: "4px 9px",
                    display: "inline-flex", alignItems: "center", gap: 5,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <Plus size={11} style={{ transform: showAdd ? "rotate(45deg)" : "none", transition: "transform 0.15s" }}/>
                  {showAdd ? "Cancel" : "Add contact"}
                </button>
              </div>
            </div>

            {showPaste && (
              <div style={{
                marginBottom: 12, padding: 14,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 9, display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500 }}>Paste contacts</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
                  Paste one or more contacts separated by a blank line. Each block should have: <span style={{ fontFamily: "JetBrains Mono, monospace" }}>Name:</span>, <span style={{ fontFamily: "JetBrains Mono, monospace" }}>Role:</span>, <span style={{ fontFamily: "JetBrains Mono, monospace" }}>Email:</span>, etc.
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => handlePasteChange(e.target.value)}
                  placeholder={"Name: Jane Smith\nRole: CEO\nEmail: jane@company.com\nPhone: \nX: @janesmith\nLinkedIn: linkedin.com/in/janesmith\n\nName: John Doe\nRole: CTO\nEmail: john@company.com\n..."}
                  rows={10}
                  style={{
                    width: "100%", resize: "vertical",
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "8px 10px",
                    color: "var(--text)", fontSize: 12,
                    fontFamily: "JetBrains Mono, ui-monospace, monospace",
                    lineHeight: 1.6, outline: "none", whiteSpace: "pre", boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                {pastePreview.length > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{pastePreview.length}</span> contact{pastePreview.length !== 1 ? "s" : ""} detected: {pastePreview.map((c) => c.name).join(", ")}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handlePasteImport}
                    disabled={isImporting || pastePreview.length === 0}
                    style={{ padding: "6px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: "var(--accent)", color: "#1a1208", border: "none", cursor: (isImporting || pastePreview.length === 0) ? "not-allowed" : "pointer", opacity: (isImporting || pastePreview.length === 0) ? 0.5 : 1, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}
                  >
                    {isImporting ? "Importing…" : `Import ${pastePreview.length > 0 ? pastePreview.length : ""} contact${pastePreview.length !== 1 ? "s" : ""}`}
                  </button>
                  <button type="button" onClick={() => { setShowPaste(false); setPasteText(""); setPastePreview([]); }} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12.5, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}

            {showAdd && (
              <form onSubmit={handleAdd} style={{
                marginBottom: 12, padding: 14,
                background: "var(--surface-2)", border: "1px solid var(--accent-line)",
                borderRadius: 9, display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500 }}>New contact</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Name *</div><input ref={nameRef} name="name" required placeholder="Full name" autoFocus style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                  <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Role</div><input name="role" placeholder="e.g. VP Marketing" style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Email</div><input name="email" placeholder="name@company.com" style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                  <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Phone</div><input name="phone" placeholder="+1 555 000 0000" style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>X handle</div><input name="x_handle" placeholder="@handle" style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                  <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>LinkedIn</div><input name="linkedin_url" placeholder="linkedin.com/in/..." style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={isPending} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: "var(--accent)", color: "#1a1208", border: "none", cursor: "pointer", opacity: isPending ? 0.5 : 1, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}>Add contact</button>
                  <button type="button" onClick={() => setShowAdd(false)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12.5, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>Cancel</button>
                </div>
              </form>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contacts.map((ct) => {
                const isEditing = editingId === ct.id;
                return (
                  <div key={ct.id} style={{
                    background: "var(--surface-2)",
                    border: "1px solid " + (isEditing ? "var(--accent-line)" : "var(--border)"),
                    borderRadius: 8, overflow: "hidden",
                  }}>
                    <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 11 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-3)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                        {ct.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{ct.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{[ct.role, ct.email].filter(Boolean).join(" · ") || "—"}</div>
                        {(ct.x_handle || ct.linkedin_url) && (
                          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                            {ct.x_handle && (
                              <a
                                href={`https://x.com/${ct.x_handle.replace(/^@/, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", textDecoration: "none" }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.636 5.903-5.636Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                {ct.x_handle.startsWith("@") ? ct.x_handle : `@${ct.x_handle}`}
                              </a>
                            )}
                            {ct.linkedin_url && (
                              <a
                                href={ct.linkedin_url.startsWith("http") ? ct.linkedin_url : `https://${ct.linkedin_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", textDecoration: "none" }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                LinkedIn
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <button onClick={() => isEditing ? saveEdit(ct.id) : startEdit(ct)} className="btn-icon" style={{ width: 26, height: 26, color: isEditing ? "var(--accent)" : "var(--text-muted)" }} title={isEditing ? "Save" : "Edit"}>
                        {isEditing
                          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        }
                      </button>
                      <button onClick={() => handleDelete(ct.id)} className="btn-icon" style={{ width: 26, height: 26 }}>
                        <X size={11} style={{ opacity: 0.6 }}/>
                      </button>
                    </div>
                    {isEditing && (
                      <div style={{ padding: "12px 12px 14px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Name *</div><input value={editDraft.name ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Full name" style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                          <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Role</div><input value={editDraft.role ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value }))} placeholder="e.g. VP Marketing" style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Email</div><input value={editDraft.email ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))} placeholder="name@company.com" style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                          <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>Phone</div><input value={editDraft.phone ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))} placeholder="+1 555 000 0000" style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>X handle</div><input value={editDraft.x_handle ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, x_handle: e.target.value }))} placeholder="@handle" style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                          <div><div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>LinkedIn</div><input value={editDraft.linkedin_url ?? ""} onChange={(e) => setEditDraft((d) => ({ ...d, linkedin_url: e.target.value }))} placeholder="linkedin.com/in/..." style={fieldStyle} onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")}/></div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                          <button type="button" onClick={() => saveEdit(ct.id)} disabled={isPending} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: "var(--accent)", color: "#1a1208", border: "none", cursor: "pointer", opacity: isPending ? 0.5 : 1, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}>Save</button>
                          <button type="button" onClick={() => setEditingId(null)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12.5, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {contacts.length === 0 && !showAdd && (
                <div style={{ padding: 24, textAlign: "center", color: "var(--text-dim)", fontSize: 13, border: "1px dashed var(--border)", borderRadius: 8 }}>
                  No contacts yet — click Add contact above
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Company row ─────────────────────────────────────────────────────── */
function CompanyRow({
  company,
  contacts,
  num,
  selected,
  onSelect,
  onOpenDetail,
  onPermDelete,
  onReEngage,
}: {
  company: CompanyWithDue;
  contacts: Contact[];
  num: number;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onOpenDetail: (c: CompanyWithDue, addContact: boolean) => void;
  onPermDelete: (id: string) => void;
  onReEngage: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isArchived = company.archived;
  const isSoftDeleted = company.soft_deleted;
  const dimmed = isArchived || isSoftDeleted;

  const [vals, setVals] = useState({
    name: company.name,
    url: company.url ?? "",
    industry: company.industry ?? "",
    outreach_date: company.outreach_date ?? "",
    follow_up_date: company.follow_up_date ?? "",
    follow_up_2_date: company.follow_up_2_date ?? "",
    follow_up_3_date: company.follow_up_3_date ?? "",
    follow_up_4_date: company.follow_up_4_date ?? "",
    status: company.status,
    reply_notes: company.reply_notes ?? "",
  });

  useEffect(() => {
    setVals({
      name: company.name,
      url: company.url ?? "",
      industry: company.industry ?? "",
      outreach_date: company.outreach_date ?? "",
      follow_up_date: company.follow_up_date ?? "",
      follow_up_2_date: company.follow_up_2_date ?? "",
      follow_up_3_date: company.follow_up_3_date ?? "",
      follow_up_4_date: company.follow_up_4_date ?? "",
      status: company.status,
      reply_notes: company.reply_notes ?? "",
    });
  }, [company]);

  function save(field: string, value: string | null) {
    startTransition(async () => {
      await updateCompanyField(company.id, field as keyof typeof vals, value);
    });
  }

  function toggleDate(field: string) {
    return (checked: boolean) => {
      const newVal = checked ? TODAY : "";
      setVals((p) => ({ ...p, [field]: newVal }));
      save(field, newVal || null);
    };
  }

  function changeDate(field: string) {
    return (d: string) => {
      setVals((p) => ({ ...p, [field]: d }));
      save(field, d || null);
    };
  }

  function handleStatusChange(newStatus: string) {
    setVals((p) => ({ ...p, status: newStatus as typeof vals.status }));
    save("status", newStatus);
  }

  function run(action: () => Promise<unknown>) {
    startTransition(async () => { await action(); router.refresh(); });
  }

  const isDue = !dimmed && (() => {
    if (company.reEngageDue) return true;
    if (!vals.outreach_date || ["Replied", "In Conversation", "Dead"].includes(vals.status)) return false;
    const d1 = daysAgo(vals.outreach_date) ?? 0;
    if (!vals.follow_up_date) return d1 >= 2;
    const d2 = daysAgo(vals.follow_up_date) ?? 0;
    if (!vals.follow_up_2_date) return d2 >= 4;
    const d3 = daysAgo(vals.follow_up_2_date) ?? 0;
    if (!vals.follow_up_3_date) return d3 >= 5;
    const d4 = daysAgo(vals.follow_up_3_date) ?? 0;
    if (!vals.follow_up_4_date) return d4 >= 6;
    return false;
  })();

  const isDueArchive = !dimmed &&
    !!vals.follow_up_4_date &&
    (daysAgo(vals.follow_up_4_date) ?? 0) >= 3 &&
    !["Replied", "In Conversation", "Dead"].includes(vals.status);

  return (
    <div
      className="row-hover"
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        alignItems: "center",
        gap: 0,
        padding: "12px 14px",
        borderTop: "1px solid var(--border)",
        background: selected ? "color-mix(in oklch, var(--accent) 8%, transparent)" : "transparent",
        borderLeft: isDueArchive ? "2px solid var(--red)" : isDue ? "2px solid var(--accent)" : "2px solid transparent",
        opacity: dimmed ? 0.55 : 1,
        minHeight: 64,
      }}
    >
      {/* checkbox */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={() => onSelect(company.id, !selected)} style={{
          width: 16, height: 16, borderRadius: 4,
          border: "1px solid " + (selected ? "var(--accent)" : "var(--border-strong)"),
          background: selected ? "var(--accent)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#1a1208", cursor: "pointer",
        }}>
          {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
        </button>
      </div>

      {/* row # */}
      <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center" }}>{String(num).padStart(2, "0")}</div>

      {/* company + industry stacked */}
      <div style={{ paddingRight: 1, paddingLeft: 4 }}>
        <InlineEdit value={vals.name} onSave={(v) => { setVals((p) => ({ ...p, name: v })); save("name", v); }} placeholder="Company name" disabled={dimmed} textStyle={{ fontWeight: 500, fontSize: 13.5, color: "var(--text)" }}/>
        <InlineEdit value={vals.industry} onSave={(v) => { setVals((p) => ({ ...p, industry: v })); save("industry", v); }} placeholder="Industry" disabled={dimmed} textStyle={{ fontSize: 11, color: "var(--text-muted)" }}/>
      </div>

      {/* domain */}
      <div style={{ paddingRight: 12, display: "flex", alignItems: "center", gap: 4 }}>
        <InlineEdit value={vals.url} onSave={(v) => { setVals((p) => ({ ...p, url: v })); save("url", v); }} placeholder="domain.com" disabled={dimmed} textStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
        {vals.url && (
          <a href={vals.url.startsWith("http") ? vals.url : `https://${vals.url}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dim)", display: "flex", flexShrink: 0 }}>
            <ExternalLink size={11}/>
          </a>
        )}
      </div>

      {/* Sent */}
      <TouchCell date={vals.outreach_date || null} disabled={dimmed} onToggle={toggleDate("outreach_date")} onDateChange={changeDate("outreach_date")}/>
      {/* Bump 1 */}
      <TouchCell date={vals.follow_up_date || null} disabled={dimmed || !vals.outreach_date} onToggle={toggleDate("follow_up_date")} onDateChange={changeDate("follow_up_date")}/>
      {/* Bump 2 */}
      <TouchCell date={vals.follow_up_2_date || null} disabled={dimmed || !vals.follow_up_date} onToggle={toggleDate("follow_up_2_date")} onDateChange={changeDate("follow_up_2_date")}/>
      {/* Bump 3 */}
      <TouchCell date={vals.follow_up_3_date || null} disabled={dimmed || !vals.follow_up_2_date} onToggle={toggleDate("follow_up_3_date")} onDateChange={changeDate("follow_up_3_date")}/>
      {/* Breakup */}
      <TouchCell date={vals.follow_up_4_date || null} disabled={dimmed || !vals.follow_up_3_date} onToggle={toggleDate("follow_up_4_date")} onDateChange={changeDate("follow_up_4_date")}/>

      {/* status */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <StatusControl status={vals.status} onChange={handleStatusChange} disabled={dimmed}/>
      </div>

      {/* contacts */}
      <ContactChips
        contacts={contacts}
        onOpen={() => onOpenDetail(company, false)}
        onAdd={() => onOpenDetail(company, true)}
      />

      <EmailMessagesPanel companyId={company.id}/>

      {/* reply notes */}
      <div style={{ paddingRight: 8, paddingLeft: 8 }}>
        <InlineEdit value={vals.reply_notes} onSave={(v) => { setVals((p) => ({ ...p, reply_notes: v })); save("reply_notes", v); }} placeholder="Notes…" multiline disabled={dimmed} textStyle={{ fontSize: 12.5, lineHeight: 1.4 }}/>
      </div>

      {/* actions */}
      <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>
        {isSoftDeleted ? (
          <>
            <button onClick={() => run(() => restoreCompany(company.id))} disabled={isPending} className="btn-icon" title="Restore" style={{ width: 26, height: 26 }}><RotateCcw size={13}/></button>
            <button onClick={() => onPermDelete(company.id)} disabled={isPending} className="btn-icon" title="Delete permanently" style={{ width: 26, height: 26, color: "var(--red)" }}><Trash2 size={13}/></button>
          </>
        ) : isArchived && company.reEngageDue ? (
          <>
            <button onClick={() => onReEngage(company.id)} disabled={isPending} className="btn-icon" title="Re-engage" style={{ width: 26, height: 26, color: "var(--accent)" }}>
              <RotateCcw size={13}/>
            </button>
            <button onClick={() => run(() => softDeleteCompany(company.id))} disabled={isPending} className="btn-icon" title="Delete" style={{ width: 26, height: 26 }}><Trash2 size={13}/></button>
          </>
        ) : (
          <>
            <button onClick={() => run(() => isArchived ? unarchiveCompany(company.id) : archiveCompany(company.id))} disabled={isPending} className="btn-icon" title={isArchived ? "Unarchive" : "Archive"} style={{ width: 26, height: 26 }}>
              {isArchived ? <ArchiveRestore size={13}/> : <Archive size={13}/>}
            </button>
            <button onClick={() => run(() => softDeleteCompany(company.id))} disabled={isPending} className="btn-icon" title="Delete" style={{ width: 26, height: 26 }}><Trash2 size={13}/></button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Add company modal ───────────────────────────────────────────────── */
function AddCompanyModal({ onClose, onAdd }: { onClose: () => void; onAdd: (fd: FormData) => void }) {
  const inp: React.CSSProperties = {
    width: "100%", padding: "7px 10px", borderRadius: 7,
    background: "var(--surface-2)", border: "1px solid var(--border)",
    color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none",
  };
  const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    ((e.target as HTMLElement).style.borderColor = "var(--accent-line)");
  const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    ((e.target as HTMLElement).style.borderColor = "var(--border)");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onAdd(new FormData(e.currentTarget));
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
          <div style={{ fontSize: 15, fontWeight: 600 }}>Add company</div>
          <button onClick={onClose} className="btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 5 }}>Company name *</div>
            <input name="name" required autoFocus placeholder="Acme Corp" style={inp} onFocus={focusBorder} onBlur={blurBorder}/>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 5 }}>Website</div>
            <input name="url" placeholder="domain.com" style={inp} onFocus={focusBorder} onBlur={blurBorder}/>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 5 }}>Industry</div>
            <input name="industry" placeholder="e.g. SaaS, E-commerce, Health…" style={inp} onFocus={focusBorder} onBlur={blurBorder}/>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 5 }}>Notes</div>
            <textarea name="reply_notes" rows={2} placeholder="Optional notes…" style={{ ...inp, resize: "none" }} onFocus={focusBorder} onBlur={blurBorder}/>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="submit" style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#1a1208", border: "none", cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}>Add company</button>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ─── CSV parser ──────────────────────────────────────────────────────── */
function sanitizeCsvCell(v: string): string {
  // Prefix formula-starting characters to prevent CSV injection in Excel/Sheets
  return /^[=+\-@|]/.test(v) ? `\t${v}` : v;
}

function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const vs = line.split(",").map((v) => sanitizeCsvCell(v.trim().replace(/^"|"$/g, "")));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { if (vs[i]) row[h] = vs[i]; });
    return row as { name: string };
  }).filter((r) => r.name);
}

/* ─── Main ────────────────────────────────────────────────────────────── */
export function EmailOutreachClient({ companies }: Props) {
  const [filter, setFilter] = useState<Filter>("not_started");
  const [sort, setSort] = useState<Sort>("oldest");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contactsByCompany, setContactsByCompany] = useState<Record<string, Contact[]>>({});

  useEffect(() => {
    getAllContactsByCompany(companies.map((c) => c.id)).then(setContactsByCompany);
  }, []);
  const [showNew, setShowNew] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const PAGE_SIZE = 50;
  const [detail, setDetail] = useState<{ company: CompanyWithDue; addContact: boolean } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [isPendingCreate, startCreate] = useTransition();
  const [isPendingImport, startImport] = useTransition();
  const [isPendingBulk, startBulk] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const SORT_CYCLE: Record<Sort, Sort> = { oldest: "newest", newest: "az", az: "oldest" };

  const active = (c: CompanyWithDue) => !c.archived && !c.soft_deleted && !["Replied", "In Conversation", "Dead"].includes(c.status);

  const counts: Record<string, number> = {
    not_started: companies.filter((c) => active(c) && !c.outreach_date).length,
    sent: companies.filter((c) => active(c) && !!c.outreach_date && !c.follow_up_date).length,
    bump1: companies.filter((c) => active(c) && !!c.follow_up_date && !c.follow_up_2_date).length,
    bump2: companies.filter((c) => active(c) && !!c.follow_up_2_date && !c.follow_up_3_date).length,
    bump3: companies.filter((c) => active(c) && !!c.follow_up_3_date && !c.follow_up_4_date).length,
    breakup: companies.filter((c) => active(c) && !!c.follow_up_4_date).length,
    replied: companies.filter((c) => !c.archived && !c.soft_deleted && ["Replied", "In Conversation"].includes(c.status)).length,
    archived: companies.filter((c) => c.archived && !c.soft_deleted).length,
    deleted: companies.filter((c) => c.soft_deleted).length,
  };

  const filtered = companies
    .filter((c) => {
      if (filter === "deleted") return c.soft_deleted;
      if (c.soft_deleted) return false;
      if (filter === "archived") return c.archived;
      if (c.archived) return false;
      if (filter === "not_started") return active(c) && !c.outreach_date;
      if (filter === "sent") return active(c) && !!c.outreach_date && !c.follow_up_date;
      if (filter === "bump1") return active(c) && !!c.follow_up_date && !c.follow_up_2_date;
      if (filter === "bump2") return active(c) && !!c.follow_up_2_date && !c.follow_up_3_date;
      if (filter === "bump3") return active(c) && !!c.follow_up_3_date && !c.follow_up_4_date;
      if (filter === "breakup") return active(c) && !!c.follow_up_4_date;
      if (filter === "replied") return ["Replied", "In Conversation"].includes(c.status);
      return true;
    })
    .sort((a, b) => {
      if (sort === "az") return a.name.localeCompare(b.name);
      const da = a.outreach_date ? new Date(a.outreach_date).getTime() : 0;
      const db = b.outreach_date ? new Date(b.outreach_date).getTime() : 0;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return sort === "newest" ? da - db : db - da;
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allSelected = paginated.length > 0 && paginated.every((c) => selectedIds.has(c.id));

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }

  function bulkAction(action: "softDelete" | "permanentDelete" | "archive" | "unarchive" | "restore") {
    const ids = Array.from(selectedIds);
    startBulk(async () => {
      if (action === "softDelete") await bulkSoftDeleteCompanies(ids);
      else if (action === "permanentDelete") await bulkDeleteCompanies(ids);
      else if (action === "restore") await bulkRestoreCompanies(ids);
      else if (action === "unarchive") await bulkUnarchiveCompanies(ids);
      else await bulkArchiveCompanies(ids);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  async function handleExport() {
    const compCols = ["name","url","industry","status","outreach_date","follow_up_date","reply_notes"];
    const ctxCols = ["contact_name","contact_role","contact_email","contact_linkedin","contact_x","contact_phone"];
    const headers = [...compCols, ...ctxCols];
    const q = (v: unknown) => { const s = sanitizeCsvCell(String(v ?? "")); return `"${s.replace(/"/g, '""')}"`; };
    const contactsByCompany = await getAllContactsByCompany(companies.map((c) => c.id));
    const rows: string[] = [];
    for (const c of companies) {
      const contacts = contactsByCompany[c.id] ?? [];
      const compVals = compCols.map((h) => q((c as unknown as Record<string, unknown>)[h]));
      if (contacts.length === 0) {
        rows.push([...compVals, ...ctxCols.map(() => '""')].join(","));
      } else {
        for (const ct of contacts) {
          rows.push([...compVals, q(ct.name), q(ct.role), q(ct.email), q(ct.linkedin_url), q(ct.x_handle), q(ct.phone)].join(","));
        }
      }
    }
    const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "email-outreach.csv"; a.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target?.result as string);
      if (!rows.length) { alert("No valid rows found."); return; }
      startImport(async () => { await importCompanies(rows); router.refresh(); });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <>
      <MobileActionsPortal>
        <button onClick={() => setShowNew(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "var(--accent)", color: "#1a1208", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}>
          <Plus size={12}/> Add company
        </button>
        <MobileMoreMenu onImport={() => fileInputRef.current?.click()} onExport={handleExport}/>
      </MobileActionsPortal>

      <div className="fade-in">
        <StatsStrip companies={companies}/>

        <button className="mobile-filter-trigger" onClick={() => setFiltersOpen((v) => !v)}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            {FILTERS.find((f) => f.id === filter)?.label ?? "Filter"}
            <span className="mono" style={{ fontSize: 10.5, padding: "1px 5px", borderRadius: 4, background: "var(--accent-dim)", color: "var(--accent)", fontWeight: 600 }}>{counts[filter] ?? 0}</span>
          </span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: filtersOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
        </button>

        <FilterRow
          className={`filter-row${filtersOpen ? " open" : ""}`}
          filter={filter}
          setFilter={(f) => { setFilter(f); setPage(0); setSelectedIds(new Set()); setFiltersOpen(false); }}
          counts={counts}
          sort={sort}
          onSortCycle={() => { setSort((s) => SORT_CYCLE[s]); setPage(0); }}
        />

        {/* Toolbar */}
        <div className={`page-toolbar${selectedIds.size > 0 ? " has-selection" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          {selectedIds.size > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--accent-line)", borderRadius: 9, fontSize: 12.5 }}>
              <span style={{ color: "var(--text)" }}><span className="mono" style={{ color: "var(--accent)" }}>{selectedIds.size}</span> selected</span>
              <span style={{ width: 1, height: 14, background: "var(--border)" }}/>
              {filter === "deleted" ? (
                <>
                  <button onClick={() => bulkAction("restore")} disabled={isPendingBulk} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12.5, cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Recover</button>
                  <button onClick={() => setConfirmBulkDelete(true)} disabled={isPendingBulk} style={{ background: "transparent", border: "none", color: "var(--red)", fontSize: 12.5, cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Delete permanently</button>
                </>
              ) : filter === "archived" ? (
                <>
                  <button onClick={() => bulkAction("unarchive")} disabled={isPendingBulk} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12.5, cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Unarchive</button>
                  <button onClick={() => bulkAction("softDelete")} disabled={isPendingBulk} style={{ background: "transparent", border: "none", color: "var(--red)", fontSize: 12.5, cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Delete</button>
                </>
              ) : (
                <>
                  <button onClick={() => bulkAction("archive")} disabled={isPendingBulk} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12.5, cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Archive</button>
                  <button onClick={() => bulkAction("softDelete")} disabled={isPendingBulk} style={{ background: "transparent", border: "none", color: "var(--red)", fontSize: 12.5, cursor: "pointer", opacity: isPendingBulk ? 0.5 : 1 }}>Delete</button>
                </>
              )}
              <div style={{ flex: 1 }}/>
              <button onClick={() => setSelectedIds(new Set())} className="btn-icon" style={{ width: 24, height: 24 }}><X size={11}/></button>
            </div>
          ) : <div/>}

          <div className="page-actions" style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fileInputRef.current?.click()} disabled={isPendingImport} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
              <Upload size={13}/>{isPendingImport ? "Importing…" : "Import CSV"}
            </button>
            <button onClick={handleExport} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
            <button onClick={() => setShowNew(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "var(--accent)", color: "#1a1208", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}>
              <Plus size={12}/> Add company
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: MIN_WIDTH }}>
              {/* Header */}
              <div style={{
                display: "grid", gridTemplateColumns: COLS,
                padding: "10px 14px", background: "var(--surface-2)",
                borderBottom: "1px solid var(--border)",
                fontSize: 10.5, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
                alignItems: "center",
              }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button onClick={() => setSelectedIds(allSelected ? new Set() : new Set(paginated.map((c) => c.id)))} style={{
                    width: 16, height: 16, borderRadius: 4,
                    border: "1px solid " + (allSelected ? "var(--accent)" : "var(--border-strong)"),
                    background: allSelected ? "var(--accent)" : "transparent",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1208",
                  }}>{allSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}</button>
                </div>
                <div style={{ textAlign: "center" }}>#</div>
                <div style={{ paddingLeft: 4 }}>Company</div>
                <div>Domain</div>
                <div style={{ textAlign: "center" }}>Sent</div>
                <div style={{ textAlign: "center" }}>Bump 1</div>
                <div style={{ textAlign: "center" }}>Bump 2</div>
                <div style={{ textAlign: "center" }}>Bump 3</div>
                <div style={{ textAlign: "center" }}>Close</div>
                <div style={{ textAlign: "center" }}>Status</div>
                <div style={{ textAlign: "center" }}>Contacts</div>
                <div style={{ textAlign: "center" }}>Msgs</div>
                <div style={{ paddingLeft: 8 }}>Reply notes</div>
                <div style={{ textAlign: "center" }}>Actions</div>
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: "64px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, color: "var(--text-dim)", marginBottom: 8 }}>○</div>
                  <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 4 }}>No companies in this view</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Try a different filter or add a company.</div>
                </div>
              ) : (
                paginated.map((company, i) => (
                  <CompanyRow
                    key={company.id}
                    company={company}
                    contacts={contactsByCompany[company.id] ?? []}
                    num={page * PAGE_SIZE + i + 1}
                    selected={selectedIds.has(company.id)}
                    onSelect={handleSelect}
                    onOpenDetail={(c, add) => setDetail({ company: c, addContact: add })}
                    onPermDelete={setConfirmDeleteId}
                    onReEngage={(id) => startCreate(async () => { await reEngageCompany(id); router.refresh(); })}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16, fontSize: 12.5, color: "var(--text-muted)" }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ padding: "5px 12px", borderRadius: 7, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1, fontSize: 12 }}
            >← Prev</button>
            <span className="mono">Page {page + 1} of {totalPages} · {filtered.length} total</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ padding: "5px 12px", borderRadius: 7, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1, fontSize: 12 }}
            >Next →</button>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileChange}/>

      {detail && (
        <CompanySlideOver
          company={detail.company}
          onClose={() => setDetail(null)}
          startAddContact={detail.addContact}
          onPermDelete={(id) => { setDetail(null); setConfirmDeleteId(id); }}
        />
      )}

      {showNew && (
        <AddCompanyModal
          onClose={() => setShowNew(false)}
          onAdd={(fd) => startCreate(async () => { await createCompany(fd); router.refresh(); })}
        />
      )}

      {confirmDeleteId && (() => {
        const co = companies.find((c) => c.id === confirmDeleteId);
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
                  <Trash2 size={16} color="var(--red, #f87171)"/>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Delete permanently?</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                    <strong style={{ color: "var(--text)" }}>&ldquo;{co?.name}&rdquo;</strong> will be gone forever. This cannot be undone.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { startBulk(async () => { await deleteCompany(confirmDeleteId); router.refresh(); }); setConfirmDeleteId(null); }}
                  style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "var(--red, #f87171)", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  Yes, delete forever
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {confirmBulkDelete && (
        <>
          <div onClick={() => setConfirmBulkDelete(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", zIndex: 70, animation: "fade-in 0.18s" }}/>
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
                <Trash2 size={16} color="var(--red, #f87171)"/>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Delete {selectedIds.size} companies permanently?</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  These {selectedIds.size} companies will be gone forever. This cannot be undone.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { startBulk(async () => { await bulkDeleteCompanies([...selectedIds]); router.refresh(); }); setConfirmBulkDelete(false); setSelectedIds(new Set()); }}
                style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "var(--red, #f87171)", color: "#fff", border: "none", cursor: "pointer" }}
              >
                Yes, delete forever
              </button>
              <button
                onClick={() => setConfirmBulkDelete(false)}
                style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
