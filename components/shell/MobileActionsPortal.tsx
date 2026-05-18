"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function MobileMoreMenu({ onImport, onExport }: { onImport?: () => void; onExport?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const itemStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    width: "100%", padding: "10px 14px",
    background: "transparent", border: "none",
    color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
    fontFamily: "inherit", textAlign: "left",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-icon"
        style={{ width: 34, height: 34, border: "1px solid var(--border)", borderRadius: 8, color: open ? "var(--text)" : "var(--text-muted)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: "fixed", right: 16, top: 56,
          background: "var(--surface)", border: "1px solid var(--border-strong)",
          borderRadius: 10, overflow: "hidden", zIndex: 300,
          minWidth: 152, boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
        }}>
          {onImport && (
            <button
              style={itemStyle}
              onClick={() => { onImport(); setOpen(false); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import CSV
            </button>
          )}
          {onExport && (
            <button
              style={itemStyle}
              onClick={() => { onExport(); setOpen(false); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function MobileActionsPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("topbar-mobile-actions"));
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
