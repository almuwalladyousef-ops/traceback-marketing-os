"use client";

import { useActionState, useState } from "react";
import { signIn } from "@/server/actions/auth";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(signIn, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-xl border"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--text)" }}>
          Traceback Marketing OS
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Enter the access password to continue.
        </p>

        <form action={action} className="flex flex-col gap-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              autoFocus
              required
              className="w-full px-3 py-2 pr-10 rounded-lg text-sm border outline-none focus:ring-1 focus:ring-[var(--accent)]"
              style={{
                backgroundColor: "var(--surface-2)",
                borderColor: state?.error ? "var(--danger)" : "var(--border)",
                color: "var(--text)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-xs"
              style={{ color: "var(--text-muted)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {state?.error && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)", color: "#fff" }}
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
