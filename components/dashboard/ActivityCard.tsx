import type { ActivityItem } from "@/server/queries/dashboard";

interface Props {
  items: ActivityItem[];
}

export function ActivityCard({ items }: Props) {
  return (
    <div className="card dash-card" style={{ padding: 22, gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Activity</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "16px 0" }}>No recent activity</div>
        ) : (
          items.map((item, i) => (
            <div
              key={item.id}
              className="row-hover"
              style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 8px", borderRadius: 7, position: "relative" }}
            >
              <div style={{ position: "relative", paddingTop: 4, flexShrink: 0 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: item.color, display: "block",
                  boxShadow: `0 0 0 3px color-mix(in oklch, ${item.color} 15%, transparent)`,
                }}/>
                {i < items.length - 1 && (
                  <span style={{
                    position: "absolute", left: 3, top: 14, bottom: -9,
                    width: 1, background: "var(--border)",
                  }}/>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.4 }}>{item.text}</div>
                <div className="stat-num" style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2 }}>{item.timeAgo}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
