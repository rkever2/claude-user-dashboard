interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
  sortable?: boolean;
}

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  sortConfig?: SortConfig | null;
  onSort?: (key: string) => void;
}

export function DataTable<T>({ columns, data, onRowClick, sortConfig, onSort }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => {
              const isSorted = sortConfig?.key === col.key;
              const canSort = col.sortable && onSort;

              return (
                <th
                  key={col.key}
                  onClick={canSort ? () => onSort(col.key) : undefined}
                  className={`text-[10px] uppercase tracking-[0.06em] font-semibold text-muted py-2 px-3 ${
                    col.align === "right" ? "text-right" : "text-left"
                  } ${canSort ? "cursor-pointer select-none hover:text-inherit transition-colors" : ""}`}
                >
                  {col.header}
                  {canSort && (
                    <span className={`ml-1 ${isSorted ? "text-brand" : "opacity-30"}`}>
                      {isSorted
                        ? sortConfig.direction === "asc" ? "▲" : "▼"
                        : "▲"}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border last:border-0 ${
                onRowClick ? "cursor-pointer hover:bg-surface transition-colors" : ""
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-2.5 px-3 text-sm ${
                    col.align === "right" ? "text-right font-mono" : "text-left"
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
