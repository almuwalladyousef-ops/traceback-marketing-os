"use client";

import { usePathname } from "next/navigation";

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/email-outreach": "Email Outreach",
  "/influencer-outreach": "Influencer",
  "/personal-outreach": "Personal",
  "/content": "Content",
  "/comment-hacking": "Comment Hacking",
  "/paid-ads": "Paid Ads",
};

export function TopBar() {
  const pathname = usePathname();
  const pageLabel =
    Object.entries(PAGE_LABELS).find(([path]) =>
      path === "/" ? pathname === "/" : pathname.startsWith(path)
    )?.[1] ?? "Dashboard";

  return (
    <header className="topbar-wrap" style={{
      padding: "0 28px 0 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 72,
      flexShrink: 0,
      borderBottom: "1px solid var(--border)",
    }}>
      <h1 style={{
        fontSize: 21,
        fontWeight: 700,
        color: "var(--text)",
        letterSpacing: "-0.02em",
        margin: 0,
      }}>{pageLabel}</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Portal target for page-level mobile actions */}
        <div id="topbar-mobile-actions" style={{ display: "flex", alignItems: "center", gap: 6 }} />
        <div className="topbar-avatar" style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, oklch(0.5 0.08 280), oklch(0.4 0.08 240))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0,
        }}>MK</div>
        <span className="topbar-user-label" style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Marketing team</span>
      </div>
    </header>
  );
}
