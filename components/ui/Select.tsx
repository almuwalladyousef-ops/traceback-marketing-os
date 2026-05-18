import { cn } from "@/lib/cn";

export function Select({
  label,
  name,
  defaultValue,
  value,
  onChange,
  options,
  className,
}: {
  label?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </label>
      )}
      <select
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        className="px-3 py-1.5 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
        style={{
          backgroundColor: "var(--surface-2)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
