import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { DonutChart, DonutLegend } from "@/components/charts/donut-chart";
import { DataTable } from "@/components/ui/data-table";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useModels } from "@/hooks/use-queries";
import { formatTokens, formatPercent } from "@/lib/format";
import { ApiError } from "@/lib/api";

type SortKey = "model" | "input" | "output" | "cacheRead" | "cacheWrite" | "total" | "pct";

function getSortValue(row: { displayName: string; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; totalTokens: number; percentage: number }, key: SortKey): string | number {
  switch (key) {
    case "model": return row.displayName.toLowerCase();
    case "input": return row.inputTokens;
    case "output": return row.outputTokens;
    case "cacheRead": return row.cacheReadTokens;
    case "cacheWrite": return row.cacheWriteTokens;
    case "total": return row.totalTokens;
    case "pct": return row.percentage;
  }
}

export function ModelsPage() {
  const { data, isLoading, isError, error, refetch } = useModels();

  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setSortDir("desc");
    }
  }

  const models = data?.models || [];
  const modelNames = useMemo(() => [...new Set(models.map((m) => m.displayName))].sort(), [models]);

  const filtered = useMemo(() => {
    let result = models;

    // Model filter
    if (modelFilter.length > 0) {
      result = result.filter((m) => modelFilter.includes(m.displayName));
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) =>
        m.displayName.toLowerCase().includes(q) ||
        formatTokens(m.inputTokens).toLowerCase().includes(q) ||
        formatTokens(m.outputTokens).toLowerCase().includes(q) ||
        formatTokens(m.totalTokens).toLowerCase().includes(q),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [models, modelFilter, search, sortKey, sortDir]);

  const donutData =
    data?.models.map((m) => ({
      name: m.displayName,
      value: m.inputTokens + m.outputTokens,
      percentage: 0,
    })) || [];

  const donutTotal = donutData.reduce((sum, d) => sum + d.value, 0);
  for (const d of donutData) {
    d.percentage = donutTotal > 0 ? Math.round((d.value / donutTotal) * 1000) / 10 : 0;
  }

  const totalModels = models.length;
  const shownModels = filtered.length;

  return (
    <div>
      <Header title="Models" />
      <div className="p-8">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : isError ? (
            <div className="col-span-3">
              <ErrorAlert
                title="Failed to load models"
                message={error instanceof ApiError ? error.message : "Could not load model data"}
                onRetry={() => refetch()}
              />
            </div>
          ) : data ? (
            <>
              <StatCard
                label="Input + Output Tokens"
                value={formatTokens(donutTotal)}
                sub={`${formatTokens(data.totalTokens)} including cache`}
              />
              <StatCard
                label="Cache Tokens"
                value={formatTokens(data.totalTokens - donutTotal)}
                sub={`${((data.totalTokens - donutTotal) / data.totalTokens * 100).toFixed(1)}% of all tokens`}
              />
              <StatCard
                label="Models Used"
                value={String(data.models.length)}
              />
            </>
          ) : null}
        </div>

        {/* Donut + legend */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="col-span-2 border border-border p-6">
            <h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted mb-4">
              Token distribution by model
            </h3>
            {isLoading ? (
              <ChartSkeleton height="h-72" />
            ) : (
              <DonutChart
                data={donutData}
                height={300}
                centerLabel="in + out"
                centerValue={formatTokens(donutTotal)}
                formatValue={formatTokens}
              />
            )}
          </div>
          <div className="border border-border p-6 flex items-center">
            <DonutLegend data={donutData} />
          </div>
        </div>

        {/* Model details table */}
        <div className="border border-border">
          <div className="px-6 pt-5 pb-3">
            <h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
              Model breakdown
            </h3>
          </div>

          {/* Search + filter toolbar */}
          <div className="px-6 pb-3 flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="px-3 py-1.5 text-xs border border-border bg-transparent text-inherit placeholder:text-muted focus:outline-none focus:border-brand w-64"
            />
            <MultiSelectFilter
              label="Model"
              options={modelNames}
              selected={modelFilter}
              onChange={setModelFilter}
            />
            <span className="ml-auto text-xs text-muted">
              {shownModels === totalModels
                ? `${totalModels} models`
                : `${shownModels} of ${totalModels} models`}
            </span>
          </div>

          <DataTable
            columns={[
              {
                key: "model",
                header: "Model",
                sortable: true,
                render: (row: NonNullable<typeof data>["models"][0]) => (
                  <span className="font-medium">{row.displayName}</span>
                ),
              },
              { key: "input", header: "Input", align: "right", sortable: true, render: (row) => formatTokens(row.inputTokens) },
              { key: "output", header: "Output", align: "right", sortable: true, render: (row) => formatTokens(row.outputTokens) },
              { key: "cacheRead", header: "Cache Read", align: "right", sortable: true, render: (row) => formatTokens(row.cacheReadTokens) },
              { key: "cacheWrite", header: "Cache Write", align: "right", sortable: true, render: (row) => formatTokens(row.cacheWriteTokens) },
              { key: "total", header: "Total", align: "right", sortable: true, render: (row) => formatTokens(row.totalTokens) },
              { key: "pct", header: "%", align: "right", sortable: true, render: (row) => formatPercent(row.percentage) },
            ]}
            data={filtered}
            sortConfig={{ key: sortKey, direction: sortDir }}
            onSort={handleSort}
          />
        </div>
      </div>
    </div>
  );
}
