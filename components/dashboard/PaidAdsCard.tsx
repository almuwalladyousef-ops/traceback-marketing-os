"use client";

import Link from "next/link";

export function PaidAdsCard() {
  return (
    <div className="card dash-card" style={{ padding: 22, gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Paid Ads</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "var(--surface-3)", color: "var(--text-muted)", fontWeight: 500 }}>Beta</span>
          <Link href="/paid-ads" className="btn-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7M9 7h8v8"/>
            </svg>
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Coming soon</p>
      </div>
    </div>
  );
}
