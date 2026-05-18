"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SCOPES = ["personal", "traceback"] as const;
const KINDS = [
  { href: "long-form", label: "Long Form" },
  { href: "short-form", label: "Short Form" },
  { href: "blogs", label: "Blogs / Text" },
  { href: "analysis", label: "Analysis" },
] as const;

export function ContentScopeNav({ scope }: { scope: string }) {
  const pathname = usePathname();

  return (
    <div
      className="content-scope-nav flex items-center gap-0 px-6 pt-5 flex-shrink-0"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Scope toggle */}
      <div className="flex items-center gap-1 mr-6">
        {SCOPES.map((s) => (
          <Link
            key={s}
            href={`/content/${s}/long-form`}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: scope === s ? "var(--accent)" : "transparent",
              color: scope === s ? "#fff" : "var(--text-muted)",
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {/* Kind tabs */}
      {KINDS.map(({ href, label }) => {
        const active = pathname.endsWith(`/${href}`);
        return (
          <Link
            key={href}
            href={`/content/${scope}/${href}`}
            className="px-4 pb-3 text-sm border-b-2 transition-colors"
            style={{
              color: active ? "var(--text)" : "var(--text-muted)",
              borderColor: active ? "var(--accent)" : "transparent",
            }}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
