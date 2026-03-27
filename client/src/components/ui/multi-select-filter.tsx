import { useState, useRef, useEffect } from "react";

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const allSelected = selected.length === 0 || selected.length === options.length;
  const activeCount = allSelected ? 0 : selected.length;

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      const next = selected.filter((s) => s !== option);
      onChange(next);
    } else {
      onChange([...selected, option]);
    }
  }

  function selectAll() {
    onChange([]);
  }

  function clearAll() {
    // Select none = show nothing, but we represent "all" as empty array
    // So "clear" means select just the first one to indicate filtering is active
    onChange([filtered[0] || ""]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 text-xs border transition-colors ${
          activeCount > 0
            ? "border-brand text-brand bg-brand-light dark:bg-[oklch(0.2_0.05_150)]"
            : "border-border text-muted-light hover:text-inherit hover:border-[oklch(0.6_0_0)]"
        }`}
      >
        {label}
        {activeCount > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] bg-brand text-white font-medium">
            {activeCount}
          </span>
        )}
        <span className="ml-1.5 text-[10px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 border border-border bg-white dark:bg-[oklch(0.14_0_0)] text-[oklch(0.14_0_0)] dark:text-[oklch(0.92_0_0)] shadow-lg">
          {/* Search within filter */}
          {options.length > 5 && (
            <div className="p-2 border-b border-border">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="w-full px-2 py-1 text-xs border border-border bg-transparent text-inherit placeholder:text-muted focus:outline-none focus:border-brand"
              />
            </div>
          )}

          {/* Actions */}
          <div className="px-3 py-1.5 border-b border-border flex gap-3">
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] uppercase tracking-[0.05em] text-brand hover:underline font-medium"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] uppercase tracking-[0.05em] text-muted hover:underline font-medium"
            >
              Clear
            </button>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((option) => {
              const isChecked = allSelected || selected.includes(option);
              return (
                <label
                  key={option}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-surface dark:hover:bg-[oklch(0.18_0_0)] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(option)}
                    className="accent-[oklch(72.27%_0.192_149.58)]"
                  />
                  <span className="truncate">{option || "(empty)"}</span>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
