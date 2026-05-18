export const dynamic = "force-dynamic";

export default function PaidAdsPage() {
  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 420, gap: 16 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: "var(--surface-2)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Paid Ads</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 280, lineHeight: 1.6 }}>Coming soon — not in use yet.</div>
      </div>
    </div>
  );
}
