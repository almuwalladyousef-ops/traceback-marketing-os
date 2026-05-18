"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface ScheduledPiece { id: string; title: string; publish_date: string | null }
interface InProgressPiece { id: string; title: string; status: string; scope: string; kind: string; updated_at: string }

interface Props {
  inProgress: number;
  inProgressPieces: InProgressPiece[];
  scheduledThisWeek: ScheduledPiece[];
  publishedThisMonth: number;
  scheduledCount: number;
  avgCycleDays: number | null;
}

type KindFilter = "all" | "blogs" | "long_form" | "short_form";

const STATUS_COLOR: Record<string, string> = {
  Outline: "var(--text-muted)",
  "Script Draft": "var(--yellow)",
  "Script Final": "var(--yellow)",
  Filming: "var(--purple)",
  Editing: "var(--pink)",
};

const KIND_LABEL: Record<string, string> = {
  blogs: "Blog",
  long_form: "YouTube",
  short_form: "Shorts",
};

const SCOPE_OWNER: Record<string, { initials: string; hue: number }> = {
  personal: { initials: "YA", hue: 280 },
  traceback: { initials: "TB", hue: 200 },
};

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function formatPublishDate(d: string): string {
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Stat({ label, value, color, small }: { label: string; value: string | number; color: string; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
      <div className="stat-num" style={{ fontSize: small ? 22 : 30, color, marginTop: 2, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

export function ContentCard({ inProgress, inProgressPieces, scheduledThisWeek, publishedThisMonth, scheduledCount, avgCycleDays }: Props) {
  const [filter, setFilter] = useState<KindFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return inProgressPieces;
    return inProgressPieces.filter((p) => p.kind === filter);
  }, [filter, inProgressPieces]);

  return (
    <div className="card dash-card" style={{ padding: 22, gridColumn: "span 8", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Content</div>
            <Link href="/content" className="btn-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7M9 7h8v8"/>
              </svg>
            </Link>
          </div>
          <div style={{ display: "flex", gap: 28, marginTop: 10 }}>
            <Stat label="In progress" value={inProgress} color="var(--accent)"/>
            <Stat label="Published / mo" value={publishedThisMonth} color="var(--green)"/>
            <Stat label="Scheduled" value={scheduledCount} color="var(--text)"/>
            <Stat label="Avg cycle" value={avgCycleDays != null ? `${avgCycleDays}d` : "—"} color="var(--text-muted)" small/>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0, padding: 2, background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
          {([["all","All"],["blogs","Blog"],["long_form","YouTube"],["short_form","Shorts"]] as [KindFilter, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: "5px 10px", fontSize: 11.5, borderRadius: 5,
              background: filter === k ? "var(--surface)" : "transparent",
              color: filter === k ? "var(--text)" : "var(--text-muted)",
              border: "none", fontWeight: filter === k ? 500 : 400,
              boxShadow: filter === k ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
              cursor: "pointer",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", borderRadius: 8, border: "1px solid var(--border)", minHeight: 260, display: "flex", flexDirection: "column" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--surface-2)" }}>
              {[["Title","60%"],["Scope","15%"],["Owner","10%"],["Status","15%"]].map(([h, w]) => (
                <th key={h} style={{
                  padding: "9px 14px", textAlign: "left", fontSize: 10.5,
                  color: "var(--text-muted)", textTransform: "uppercase",
                  letterSpacing: "0.08em", fontWeight: 600, width: w,
                  borderBottom: "1px solid var(--border)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "60px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No pieces in progress
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => {
                const days = daysAgo(p.updated_at);
                const statusColor = STATUS_COLOR[p.status] || "var(--text-dim)";
                const owner = SCOPE_OWNER[p.scope] ?? { initials: "?", hue: 0 };
                return (
                  <tr key={p.id} className="row-hover" style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 4, height: 24, borderRadius: 2, background: statusColor, flexShrink: 0 }}/>
                        <div>
                          <Link href={`/content/${p.scope}/piece/${p.id}`} style={{ color: "var(--text)", fontWeight: 500, textDecoration: "none" }}>
                            {p.title}
                          </Link>
                          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 1 }}>
                            Updated {days === 0 ? "today" : `${days}d ago`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: 12 }}>
                      {KIND_LABEL[p.kind] ?? p.kind}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: `linear-gradient(135deg, oklch(0.5 0.08 ${owner.hue}), oklch(0.4 0.08 ${owner.hue + 30}))`,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9.5, fontWeight: 600, color: "white",
                      }}>{owner.initials}</div>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, padding: "2px 8px", borderRadius: 5,
                        background: `color-mix(in oklch, ${statusColor} 12%, transparent)`,
                        color: statusColor,
                        border: `1px solid color-mix(in oklch, ${statusColor} 25%, transparent)`,
                        fontWeight: 500,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }}/>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {scheduledThisWeek.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
            Scheduled this week
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {scheduledThisWeek.map((s) => (
              <div key={s.id} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "5px 10px 5px 5px", borderRadius: 7,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                fontSize: 12,
              }}>
                {s.publish_date && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                    background: "var(--surface-3)", color: "var(--accent)",
                    fontFamily: "JetBrains Mono, monospace",
                  }}>{formatPublishDate(s.publish_date)}</span>
                )}
                <span style={{ color: "var(--text)" }}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
