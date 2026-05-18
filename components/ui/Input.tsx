import { cn } from "@/lib/cn";

export function Input({
  label,
  name,
  type = "text",
  defaultValue,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  readOnly,
  className,
}: {
  label?: string;
  name?: string;
  type?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </label>
      )}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className="px-3 py-1.5 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
        style={{
          backgroundColor: "var(--surface-2)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      />
    </div>
  );
}

export function Textarea({
  label,
  name,
  defaultValue,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 3,
  className,
}: {
  label?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </label>
      )}
      <textarea
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y transition-colors"
        style={{
          backgroundColor: "var(--surface-2)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      />
    </div>
  );
}
