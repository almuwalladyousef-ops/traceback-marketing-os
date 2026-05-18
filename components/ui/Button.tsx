import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantStyles: Record<Variant, string> = {
  primary: "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white",
  secondary: "bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)]",
  ghost: "hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]",
  danger: "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className,
  disabled,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </button>
  );
}
