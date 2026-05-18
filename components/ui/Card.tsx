import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-6",
        className
      )}
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {title}
      </h2>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
