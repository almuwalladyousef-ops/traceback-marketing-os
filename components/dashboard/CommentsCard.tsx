"use client";

import Link from "next/link";

interface Props {
  todayLogged: boolean;
  thisWeekComments: number;
  lastWeekComments: number;
  streak: number;
  personalBest: number;
  bars?: number[];
}

function MiniBars({ data = [], color, height = 36, highlight = -1 }: { data: number[]; color: string; height?: number; highlight?: number }) {
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

export function CommentsCard({ todayLogged, thisWeekComments, lastWeekComments, streak, personalBest, bars }: Props) {
  const delta = thisWeekComments - lastWeekComments;

  return (
    <div className="card dash-card" style={{ padding: 22, gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Comment Hacking</div>
          <Link href="/comment-hacking" className="btn-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7M9 7h8v8"/>
            </svg>
          </Link>
        </div>
        {todayLogged ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 10.5, padding: "2px 7px", borderRadius: 5,
            background: "var(--green-dim)", color: "var(--green)",
            border: "1px solid color-mix(in oklch, var(--green) 25%, transparent)",
            fontWeight: 500,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            Logged
          </span>
        ) : (
          <span style={{
            fontSize: 10.5, padding: "2px 7px", borderRadius: 5,
            background: "var(--red-dim)", color: "var(--red)",
            fontWeight: 500,
          }}>Not logged</span>
        )}
      </div>

      <div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>This week</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          <span className="stat-num" style={{ fontSize: 38, color: "var(--text)" }}>{thisWeekComments}</span>
          <span style={{ fontSize: 11, color: delta >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500 }}>
            {delta >= 0 ? "+" : ""}{delta}
          </span>
        </div>
      </div>

      <MiniBars data={bars ?? []} color="var(--green)" height={36} highlight={(bars ?? []).length - 1}/>

      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: "color-mix(in oklch, var(--yellow) 15%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.8 0 3-1.4 3-3 0-2-2-3-1-5-4 0-7 3-7 7 0 3.3 2.7 6 6 6s6-2.7 6-6c0-3-2-5-3-7-1.4 1.5-3 1.5-4 0-1-1.5-1 1-1.5 4z"/>
          </svg>
        </div>
        <div style={{ flex: 1, lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{streak} day streak</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Personal best · {personalBest} days</div>
        </div>
      </div>
    </div>
  );
}
