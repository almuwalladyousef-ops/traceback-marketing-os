import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export function Checkbox({
  label,
  checked,
  indeterminate,
  onChange,
  name,
  disabled,
}: {
  label?: string;
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  name?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);

  const active = checked || indeterminate;

  return (
    <label className={cn("flex items-center gap-2 cursor-pointer select-none", disabled && "opacity-40 cursor-not-allowed")}>
      {/* Hidden input for form/accessibility */}
      <input
        ref={ref}
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="sr-only"
      />
      {/* Custom visual */}
      <div
        className="w-4 h-4 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
        style={{
          backgroundColor: active ? "var(--accent)" : "transparent",
          border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
        }}
      >
        {indeterminate ? (
          <svg width="8" height="2" viewBox="0 0 8 2" fill="white">
            <rect width="8" height="2" rx="1" />
          </svg>
        ) : checked ? (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,3 3,5 7,1" />
          </svg>
        ) : null}
      </div>
      {label && <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>}
    </label>
  );
}
