"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  emailDue: number;
  influencerDue: number;
  personalDue: number;
  totalDue: number;
  emailActive: number;
  influencerActive: number;
  personalActive: number;
  emailRepliesThisWeek: number;
  repliesLastWeek: number;
  emailReplyRate: number;
  bars?: number[];
}

function MiniBars({ data = [], color, height = 42, highlight = -1 }: { data: number[]; color: string; height?: number; highlight?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {data.map((v, i) => (
        <div
          key={i}
          className="spark-bar"
          title={`${v}`}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: i === highlight ? color : `color-mix(in oklch, ${color} 35%, transparent)`,
            borderRadius: 2,
            minHeight: 2,
          }}
        />
      ))}
    </div>
  );
}

export function OutreachCard({
  emailDue, influencerDue, personalDue, totalDue,
  emailActive, influencerActive, personalActive,
  emailRepliesThisWeek, repliesLastWeek, emailReplyRate,
  bars,
}: Props) {
  const [timeRange, setTimeRange] = useState<"7d" | "14d" | "30d">("14d");
  const delta = emailRepliesThisWeek - repliesLastWeek;
  const safeBars = bars ?? [];
  const visibleBars = timeRange === "7d" ? safeBars.slice(-7) : safeBars;

  const channels = [
    { key: "email", label: "Email", active: emailActive, due: emailDue, rate: emailReplyRate, color: "var(--accent)" },
    { key: "infl", label: "Influencer", active: influencerActive, due: influencerDue, rate: 8, color: "var(--purple)" },
    { key: "personal", label: "Personal", active: personalActive, due: personalDue, rate: 31, color: "var(--green)" },
  ];

  return (
    <div className="card dash-card" style={{ padding: 22, gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Outreach</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
            <span className="stat-num" style={{ fontSize: 38, color: totalDue > 0 ? "var(--accent)" : "var(--green)" }}>{totalDue}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>due today</span>
          </div>
        </div>
        <Link href="/email-outreach" className="btn-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M9 7h8v8"/>
          </svg>
        </Link>
      </div>

      {/* Channel breakdown */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 1, background: "var(--border)",
        borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)",
      }}>
        {channels.map((c) => (
          <div key={c.key} style={{ background: "var(--surface)", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, display: "block" }}/>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{c.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="stat-num" style={{ fontSize: 20, color: "var(--text)" }}>{c.active}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>active</span>
            </div>
            <div style={{ fontSize: 11, color: c.due > 0 ? "var(--accent)" : "var(--text-dim)", marginTop: 2 }}>
              {c.due} due · {c.rate}% reply
            </div>
          </div>
        ))}
      </div>

      {/* Replies bar chart */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Replies — last 14 days</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
              <span className="stat-num" style={{ fontSize: 22, color: "var(--text)" }}>{emailRepliesThisWeek}</span>
              <span style={{ fontSize: 11, color: delta >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500 }}>
                {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} vs last week
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["7d", "14d", "30d"] as const).map((p, i) => (
              <button key={p} onClick={() => setTimeRange(p)} style={{
                padding: "3px 8px", fontSize: 11, borderRadius: 5,
                background: timeRange === p ? "var(--surface-2)" : "transparent",
                color: timeRange === p ? "var(--text)" : "var(--text-muted)",
                border: "1px solid " + (timeRange === p ? "var(--border)" : "transparent"),
              }}>{p}</button>
            ))}
          </div>
        </div>
        <MiniBars data={visibleBars} color="var(--accent)" height={42} highlight={visibleBars.length - 1}/>
      </div>
    </div>
  );
}
