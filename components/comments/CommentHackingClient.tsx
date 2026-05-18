"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logComments } from "@/server/actions/comments";
import { getBrowserClient } from "@/lib/supabase/browser";
import { format } from "date-fns";

interface ChartEntry {
  date: string;
  day: number;
  count: number;
}

interface Props {
  chartData: ChartEntry[];
  dayOneOffset: number;
  daysInMonth: number;
  todayLogged: boolean;
  streak: number;
  today: string;
  thisWeek: number;
  lastWeek: number;
  monthTotal: number;
  todayCount: number;
}

/* ─── SVG Line Chart ─────────────────────────────────────────────────── */
function LineChart({ data, today }: { data: ChartEntry[]; today: string }) {
  const W = 900, H = 160, PAD = { t: 16, r: 24, b: 32, l: 40 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const max = Math.max(...data.map((d) => d.count), 1);
  const todayDay = parseInt(today.split("-")[2]);
  const daysInMonth = 31;

  const pts = data.map((d) => {
    const x = PAD.l + (d.day - 1) / daysInMonth * chartW;
    const y = PAD.t + (1 - d.count / max) * chartH;
    return [x, y, d] as [number, number, ChartEntry];
  });

  if (pts.length === 0) return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}/>;

  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L${pts[pts.length-1][0].toFixed(1)},${(PAD.t+chartH).toFixed(1)} L${PAD.l},${(PAD.t+chartH).toFixed(1)} Z`;

  const ticks = [0, Math.round(max / 2), max];
  const todayPt = pts.find(([,,d]) => d.day === todayDay);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="ch-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {ticks.map((t, i) => {
        const y = PAD.t + (1 - t / max) * chartH;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--border)" strokeDasharray="3 3"/>
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)" fontFamily="JetBrains Mono, monospace">{t}</text>
          </g>
        );
      })}

      {[1, 5, 10, 15, 20, 25, 30].map((d) => {
        const x = PAD.l + (d - 1) / daysInMonth * chartW;
        return (
          <text key={d} x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontFamily="JetBrains Mono, monospace">{d}</text>
        );
      })}

      <path d={areaPath} fill="url(#ch-grad)"/>
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>

      {todayPt && (
        <circle cx={todayPt[0]} cy={todayPt[1]} r="4" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2"/>
      )}

      {pts.filter(([,,d]) => d.count > 0).map(([x, y, d]) => (
        <circle key={d.day} cx={x} cy={y} r="2.5" fill="var(--accent)" opacity="0.5"/>
      ))}
    </svg>
  );
}

/* ─── Calendar grid ─────────────────────────────────────────────────── */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CalendarGrid({
  chartData,
  dayOneOffset,
  daysInMonth,
  today,
  onUpdate,
}: {
  chartData: ChartEntry[];
  dayOneOffset: number;
  daysInMonth: number;
  today: string;
  onUpdate: (day: number, count: number) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const todayDay = parseInt(today.split("-")[2]);
  const max = Math.max(...chartData.map((d) => d.count), 1);

  const slots = Array(35).fill(null) as (null | { day: number; count: number })[];
  for (let d = 1; d <= daysInMonth; d++) {
    const slotIdx = dayOneOffset + (d - 1);
    if (slotIdx < 35) {
      const entry = chartData.find((x) => x.day === d);
      slots[slotIdx] = { day: d, count: entry?.count ?? 0 };
    }
  }
  const weeks = [
    slots.slice(0, 7),
    slots.slice(7, 14),
    slots.slice(14, 21),
    slots.slice(21, 28),
    slots.slice(28, 35),
  ];

  function startEdit(cell: { day: number; count: number }) {
    setEditing(cell.day);
    setDraft(String(cell.count));
  }

  function commitEdit(day: number) {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0) onUpdate(day, n);
    setEditing(null);
  }

  return (
    <div style={{ padding: "16px 20px 20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 0" }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
          {week.map((cell, di) => {
            if (!cell) return <div key={di} style={{ height: 64, borderRadius: 9, background: "var(--surface-2)", opacity: 0.18 }}/>;
            const isToday = cell.day === todayDay;
            const isFuture = cell.day > todayDay;
            const intensity = cell.count > 0 && max > 0 ? cell.count / max : 0;
            const isEditingCell = editing === cell.day;
            const bg = isToday
              ? "var(--accent-dim)"
              : isFuture
              ? "var(--surface-2)"
              : cell.count > 0
              ? `color-mix(in oklch, var(--accent) ${Math.round(intensity * 65 + 12)}%, var(--surface-2))`
              : "var(--surface-2)";

            return (
              <div
                key={di}
                onClick={() => !isFuture && !isEditingCell && startEdit(cell)}
                style={{
                  height: 64, borderRadius: 9, padding: "8px 10px",
                  background: isEditingCell ? "var(--surface-3)" : bg,
                  border: `1px solid ${isEditingCell ? "var(--accent-line)" : isToday ? "var(--accent-line)" : "var(--border)"}`,
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  opacity: isFuture ? 0.4 : 1,
                  cursor: isFuture ? "default" : "pointer",
                  transition: "background 0.12s, border-color 0.12s",
                }}
                onMouseEnter={(e) => { if (!isFuture && !isEditingCell) e.currentTarget.style.borderColor = "var(--border-strong)"; }}
                onMouseLeave={(e) => { if (!isEditingCell) e.currentTarget.style.borderColor = isToday ? "var(--accent-line)" : "var(--border)"; }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? "var(--accent)" : "var(--text-muted)", lineHeight: 1 }}>{cell.day}</div>
                {isEditingCell ? (
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitEdit(cell.day)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitEdit(cell.day); if (e.key === "Escape") setEditing(null); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: "100%", background: "transparent", border: "none", outline: "none",
                      fontSize: 17, fontWeight: 600, color: "var(--text)",
                      fontFamily: "JetBrains Mono, monospace", padding: 0,
                    }}
                  />
                ) : (
                  <div className="stat-num" style={{ fontSize: 18, color: cell.count > 0 ? "var(--text)" : "var(--text-dim)", lineHeight: 1, opacity: isFuture ? 0 : 1 }}>
                    {cell.count > 0 ? cell.count : <span style={{ fontSize: 12, opacity: 0.35 }}>—</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Click any day to edit its count</div>
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────── */
export function CommentHackingClient({
  chartData: initialData,
  dayOneOffset,
  daysInMonth,
  todayLogged: initialLogged,
  streak: initialStreak,
  today,
  thisWeek: initialThisWeek,
  lastWeek: initialLastWeek,
  monthTotal: initialMonthTotal,
  todayCount: initialTodayCount,
}: Props) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialData);
  const [todayLogged, setTodayLogged] = useState(initialLogged);
  const [streak, setStreak] = useState(initialStreak);
  const [countInput, setCountInput] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const todayDay = parseInt(today.split("-")[2]);

  const thisWeek = logs
    .filter((d) => {
      // Approximate: days within the same calendar week as today
      // For simplicity, use the same logic as the server (Mon-Sun week)
      return true; // We'll just use the initial values and refresh
    })
    .reduce((s, d) => s + d.count, 0);

  const monthTotal = logs.reduce((s, d) => s + d.count, 0);
  const todayCount = logs.find((d) => d.day === todayDay)?.count ?? 0;

  // Use initial week values since we can't easily compute them client-side
  const weekDelta = initialThisWeek - initialLastWeek;

  const monthLabel = (() => {
    const [y, m] = today.split("-");
    return format(new Date(parseInt(y), parseInt(m) - 1, 1), "MMMM yyyy");
  })();

  useEffect(() => {
    const client = getBrowserClient();
    const channel = client
      .channel("realtime:comment_logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_logs" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [router]);

  function handleLog(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(countInput, 10);
    if (isNaN(n) || n < 0) { setError("Enter a valid number"); return; }
    setError("");
    const formData = new FormData();
    formData.set("count", String(n));
    startTransition(async () => {
      await logComments(formData);
      setLogs((prev) => prev.map((d) => d.day === todayDay ? { ...d, count: n } : d));
      setTodayLogged(true);
      if (!todayLogged) setStreak((s) => s + 1);
      setCountInput("");
    });
  }

  function handleCalendarUpdate(day: number, count: number) {
    setLogs((prev) => prev.map((d) => d.day === day ? { ...d, count } : d));
    if (day === todayDay) setTodayLogged(count > 0);
    const formData = new FormData();
    formData.set("count", String(count));
    formData.set("date", today.substring(0, 8) + String(day).padStart(2, "0"));
    startTransition(async () => { await logComments(formData); });
  }

  return (
    <div className="fade-in">
      {/* Stats strip */}
      <div className="stats-grid" style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 1, background: "var(--border)", border: "1px solid var(--border)",
        borderRadius: 12, overflow: "hidden", marginBottom: 18,
      }}>
        {[
          { label: "Streak", value: `${streak}d`, color: streak > 0 ? "var(--yellow)" : "var(--text-muted)", note: "consecutive days", icon: "🔥" },
          { label: "This week", value: initialThisWeek, color: "var(--text)", note: weekDelta >= 0 ? `+${weekDelta} vs last` : `${weekDelta} vs last` },
          { label: "Last week", value: initialLastWeek, color: "var(--text-muted)", note: "prev 7 days" },
          { label: "Month total", value: monthTotal, color: "var(--text)", note: monthLabel },
        ].map((s, i) => (
          <div key={i} style={{ background: "var(--surface)", padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 6 }}>
              {s.icon && <span style={{ fontSize: 12 }}>{s.icon}</span>}
              {s.label}
            </div>
            <div className="stat-num" style={{ fontSize: 26, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: weekDelta >= 0 && s.label === "This week" ? "var(--green)" : "var(--text-muted)", marginTop: 1 }}>{s.note}</div>
          </div>
        ))}
      </div>

      {/* Log form */}
      <div className="card log-form-card" style={{ padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 2 }}>Log today</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {format(new Date(today + "T00:00:00"), "MMMM d, yyyy")}
            </div>
          </div>
          {todayLogged ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: "var(--green-dim)", color: "var(--green)",
              border: "1px solid color-mix(in oklch, var(--green) 25%, transparent)",
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              Logged — {todayCount} comments
            </span>
          ) : (
            <span style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: "var(--red-dim)", color: "var(--red)",
              border: "1px solid color-mix(in oklch, var(--red) 25%, transparent)",
            }}>Not logged yet</span>
          )}
        </div>

        <form onSubmit={handleLog} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {error && <span style={{ fontSize: 11.5, color: "var(--red)" }}>{error}</span>}
          <div style={{ position: "relative" }}>
            <input
              type="number"
              min="0"
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              placeholder="0"
              style={{
                width: 80, padding: "8px 12px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                color: "var(--text)", outline: "none", fontFamily: "JetBrains Mono, monospace",
                textAlign: "center",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <span className="log-cmts-label" style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              fontSize: 9.5, color: "var(--text-dim)", pointerEvents: "none",
            }}>cmts</span>
          </div>
          <button
            type="submit"
            disabled={isPending || !countInput}
            style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: "var(--accent)", color: "#1a1208",
              border: "none", cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
              opacity: countInput && !isPending ? 1 : 0.5,
            }}
          >Log</button>
        </form>
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Comments — {monthLabel}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>Day 1 → {todayDay} of {daysInMonth}</div>
        </div>
        <div style={{ height: 160 }}>
          <LineChart data={logs} today={today}/>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 22px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Weekly breakdown — {monthLabel}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--text-muted)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--surface-2)", border: "1px solid var(--border)", display: "inline-block" }}/>
            <span>0</span>
            {[20, 50, 80].map((p) => (
              <span key={p} style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: `color-mix(in oklch, var(--accent) ${p}%, var(--surface-2))` }}/>
            ))}
            <span>high</span>
          </div>
        </div>
        <CalendarGrid
          chartData={logs}
          dayOneOffset={dayOneOffset}
          daysInMonth={daysInMonth}
          today={today}
          onUpdate={handleCalendarUpdate}
        />
      </div>
    </div>
  );
}
