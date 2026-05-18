const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  grid: (number | null)[][];
  maxWeek: number;
}

export function CommentLogTable({ grid, maxWeek }: Props) {
  const weeks = Array.from({ length: maxWeek + 1 }, (_, i) => `Week ${i + 1}`);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th
              className="px-3 py-2 text-left text-xs font-medium w-16"
              style={{ color: "var(--text-muted)" }}
            >
              Day
            </th>
            {weeks.map((w) => (
              <th
                key={w}
                className="px-3 py-2 text-center text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((day, rowIdx) => (
            <tr key={day} style={{ borderTop: "1px solid var(--border)" }}>
              <td className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                {day}
              </td>
              {weeks.map((_, colIdx) => {
                const val = grid[rowIdx]?.[colIdx];
                return (
                  <td
                    key={colIdx}
                    className="px-3 py-2 text-center text-sm font-medium"
                    style={{
                      color: val && val > 0 ? "var(--text)" : "var(--text-muted)",
                    }}
                  >
                    {val === null ? (
                      <span style={{ color: "var(--border)" }}>—</span>
                    ) : (
                      val
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
