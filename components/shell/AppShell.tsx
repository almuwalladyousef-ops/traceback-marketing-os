"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { MobileNav } from "@/components/shell/MobileNav";

export function AppShell({ children, badges }: { children: React.ReactNode; badges?: Record<string, number> }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)" }}>
      <div className="sidebar-wrapper">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} badges={badges} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar />
        <main className="main-content" style={{ flex: 1, overflowY: "auto", background: "var(--bg)", padding: "28px 28px" }}>
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
