"use client";

import { useActionState } from "react";
import { signIn } from "@/server/actions/auth";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(signIn, null);

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
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoFocus
            required
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-1 focus:ring-[var(--accent)]"
            style={{
              backgroundColor: "var(--surface-2)",
              borderColor: state?.error ? "var(--danger)" : "var(--border)",
              color: "var(--text)",
            }}
          />
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
