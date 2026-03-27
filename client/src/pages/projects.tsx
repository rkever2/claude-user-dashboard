import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { BarChart } from "@/components/charts/bar-chart";
import { DataTable } from "@/components/ui/data-table";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ChartSkeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useProjects } from "@/hooks/use-queries";
import { formatNumber, formatDateFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { ProjectStats } from "@shared/types";

type SortKey = "name" | "sessions" | "messages" | "first" | "last";

function getSortValue(row: ProjectStats, key: SortKey): string | number {
  switch (key) {
    case "name": return row.displayName.toLowerCase();
    case "sessions": return row.totalSessions;
    case "messages": return row.totalMessages;
    case "first": return row.firstActive || "";
    case "last": return row.lastActive || "";
  }
}

export function ProjectsPage() {
  const { data, isLoading, isError, error, refetch } = useProjects();

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("sessions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setSortDir("desc");
    }
  }

  const projects = data?.projects || [];
  const projectNames = useMemo(() => [...new Set(projects.map((p) => p.displayName))].sort(), [projects]);

  const filtered = useMemo(() => {
    let result = projects;

    // Project filter
    if (projectFilter.length > 0) {
      result = result.filter((p) => projectFilter.includes(p.displayName));
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.branches.some((b) => b.toLowerCase().includes(q)),
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
  }, [projects, projectFilter, search, sortKey, sortDir]);

  const barData =
    filtered.slice(0, 10).map((p) => ({
      name: p.displayName,
      value: p.totalSessions,
    }));

  const totalProjects = projects.length;
  const shownProjects = filtered.length;

  return (
    <div>
      <Header title="Projects" />
      <div className="p-8">
        {isError ? (
          <div className="mb-6">
            <ErrorAlert
              title="Failed to load projects"
              message={error instanceof ApiError ? error.message : "Could not load project data"}
              onRetry={() => refetch()}
            />
          </div>
        ) : null}

        {/* Bar chart */}
        <div className="border border-border p-6 mb-6">
          <h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted mb-4">
            Sessions per project
          </h3>
          {isLoading ? (
            <ChartSkeleton />
          ) : isError ? null : (
            <BarChart data={barData} height={Math.max(200, barData.length * 40)} />
          )}
        </div>

        {/* Table */}
        <div className="border border-border">
          <div className="px-6 pt-5 pb-3">
            <h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
              All projects
            </h3>
          </div>

          {/* Search + filter toolbar */}
          <div className="px-6 pb-3 flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="px-3 py-1.5 text-xs border border-border bg-transparent text-inherit placeholder:text-muted focus:outline-none focus:border-brand w-64"
            />
            <MultiSelectFilter
              label="Project"
              options={projectNames}
              selected={projectFilter}
              onChange={setProjectFilter}
            />
            <span className="ml-auto text-xs text-muted">
              {shownProjects === totalProjects
                ? `${totalProjects} projects`
                : `${shownProjects} of ${totalProjects} projects`}
            </span>
          </div>

          <DataTable
            columns={[
              {
                key: "name",
                header: "Project",
                sortable: true,
                render: (row: ProjectStats) => (
                  <span className="font-medium">{row.displayName}</span>
                ),
              },
              { key: "sessions", header: "Sessions", align: "right", sortable: true, render: (row) => formatNumber(row.totalSessions) },
              { key: "messages", header: "Messages", align: "right", sortable: true, render: (row) => formatNumber(row.totalMessages) },
              {
                key: "branches",
                header: "Top Branches",
                render: (row) => (
                  <span className="text-xs font-mono text-muted">
                    {row.branches.slice(0, 3).join(", ")}
                  </span>
                ),
              },
              {
                key: "first",
                header: "First Active",
                align: "right",
                sortable: true,
                render: (row) => (row.firstActive ? formatDateFull(row.firstActive) : "—"),
              },
              {
                key: "last",
                header: "Last Active",
                align: "right",
                sortable: true,
                render: (row) => (row.lastActive ? formatDateFull(row.lastActive) : "—"),
              },
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
