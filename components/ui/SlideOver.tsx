"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function SlideOver({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative ml-auto h-full w-[85vw] sm:w-full ${width} flex flex-col overflow-hidden`}
        style={{ backgroundColor: "var(--surface)", borderLeft: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="font-semibold text-sm" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--surface-2)] transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
