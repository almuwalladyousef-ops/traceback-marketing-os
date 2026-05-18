"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Mail, Users, User, FileText, MessageSquare, Target, LogOut,
} from "lucide-react";
import { signOut } from "@/server/actions/auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/email-outreach", label: "Email Outreach", icon: Mail },
  { href: "/influencer-outreach", label: "Influencer", icon: Users },
  { href: "/personal-outreach", label: "Personal", icon: User },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/comment-hacking", label: "Comment Hacking", icon: MessageSquare },
  { href: "/paid-ads", label: "Paid Ads", icon: Target },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  badges?: Record<string, number>;
}

export function Sidebar({ collapsed, onToggle, badges = {} }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      style={{
        width: collapsed ? 56 : 232,
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      {/* Brand + toggle */}
      <div style={{
        padding: collapsed ? "15px 0" : "15px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        justifyContent: collapsed ? "center" : "flex-start",
        height: 72,
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: "linear-gradient(135deg, oklch(0.78 0.14 75) 0%, oklch(0.62 0.15 50) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px oklch(0.78 0.14 75 / 0.25)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1208", letterSpacing: "-0.04em" }}>T</span>
          </div>
        )}
        {!collapsed && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", lineHeight: 1.1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap", color: "var(--text)" }}>Traceback</span>
            <span style={{ fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 1 }}>Marketing OS</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="btn-icon"
          title={collapsed ? "Expand" : "Collapse"}
          style={{ width: 26, height: 26, flexShrink: 0, color: "var(--text-dim)" }}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.22s" }}
          >
            <path d="M15 6l-6 6 6 6"/>
          </svg>
        </button>
      </div>

      {/* Section label */}
      {!collapsed && (
        <div style={{ padding: "10px 18px 6px", fontSize: 10.5, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, whiteSpace: "nowrap" }}>
          Workspace
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: collapsed ? "4px 6px" : "4px 8px", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const badge = badges[href] ?? null;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`nav-item${active ? " active" : ""}`}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 11,
                padding: collapsed ? "9px 0" : "8px 12px",
                marginBottom: 1,
                borderRadius: 7,
                color: active ? "var(--text)" : "var(--text-muted)",
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                textDecoration: "none",
              }}
            >
              <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.85 }} />
              {!collapsed && <span style={{ flex: 1, whiteSpace: "nowrap" }}>{label}</span>}
              {!collapsed && badge != null && badge > 0 && (
                <span style={{
                  fontSize: 10.5, fontWeight: 600, padding: "1px 6px", borderRadius: 5,
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  fontFamily: "JetBrains Mono, monospace",
                }}>{badge}</span>
              )}
              {collapsed && badge != null && badge > 0 && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  width: 7, height: 7, borderRadius: "50%",
                  background: "var(--accent)", border: "1.5px solid var(--surface)",
                }}/>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? "8px 6px" : 12, flexShrink: 0 }}>
        <form action={signOut} style={{ margin: 0 }}>
          <button
            type="submit"
            title={collapsed ? "Sign out" : undefined}
            className="nav-item"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
              width: "100%",
              padding: collapsed ? "8px 0" : "8px 10px",
              borderRadius: 7,
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, oklch(0.5 0.08 280), oklch(0.4 0.08 240))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 600, color: "white",
            }}>MK</div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, textAlign: "left", lineHeight: 1.2, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" }}>Marketing team</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>2 members</div>
                </div>
                <LogOut size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
              </>
            )}
          </button>
        </form>
      </div>
    </aside>
  );
}
