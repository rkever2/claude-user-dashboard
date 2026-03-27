const ranges = ["7d", "30d", "90d", "all"] as const;

interface DateRangeProps {
  value: string;
  onChange: (range: string) => void;
}

export function DateRange({ value, onChange }: DateRangeProps) {
  return (
    <div className="flex gap-0 border border-border">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            value === r
              ? "bg-brand text-white"
              : "hover:bg-surface text-muted-light"
          } ${r !== ranges[0] ? "border-l border-border" : ""}`}
        >
          {r === "all" ? "All" : r}
        </button>
      ))}
    </div>
  );
}
