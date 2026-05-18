import { cn } from "@/lib/cn";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr style={{ borderBottom: "1px solid var(--border)" }}>
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn("px-3 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap", className)}
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-[var(--surface-2)]",
        className
      )}
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
  colSpan,
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
  style?: React.CSSProperties;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("px-3 py-2.5 whitespace-nowrap", className)}
      style={{ color: "var(--text)", ...style }}
    >
      {children}
    </td>
  );
}
