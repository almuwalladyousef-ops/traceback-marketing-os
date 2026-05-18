import { cn } from "@/lib/cn";

type Variant = "default" | "red" | "green" | "yellow" | "blue";

const variants: Record<Variant, string> = {
  default: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  red: "bg-red-500/15 text-red-400 border border-red-500/30",
  green: "bg-green-500/15 text-green-400 border border-green-500/30",
  yellow: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  blue: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
