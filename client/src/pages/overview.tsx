import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ui/error-alert";
import { DonutChart, DonutLegend } from "@/components/charts/donut-chart";
import { AreaChart } from "@/components/charts/area-chart";
import { DataTable } from "@/components/ui/data-table";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { useOverview, useActivity, useProjects } from "@/hooks/use-queries";
import { formatTokens, formatNumber, formatDateFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { ProjectStats } from "@shared/types";

type SortKey = "name" | "sessions" | "messages" | "branches" | "lastActive";

export function OverviewPage() {
  const { data: overview, isLoading: overviewLoading, isError: overviewError, error: overviewErr, refetch: refetchOverview } = useOverview();
  const { data: activity, isLoading: activityLoading, isError: activityError, error: activityErr, refetch: refetchActivity } = useActivity("30d");
  const { data: projects } = useProjects();

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("sessions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const allProjects = projects?.projects || [];

  const projectNames = useMemo(
    () => [...new Set(allProjects.map((p) => p.displayName))].sort(),
    [allProjects],
  );

  function getSortValue(row: ProjectStats, key: SortKey): string | number {
    switch (key) {
      case "name": return row.displayName.toLowerCase();
      case "sessions": return row.totalSessions;
      case "messages": return row.totalMessages;
      case "branches": return row.branches.length;
      case "lastActive": return row.lastActive || "";
    }
  }

  const filtered = useMemo(() => {
    let result = allProjects;

    if (projectFilter.length > 0) {
      result = result.filter((p) => projectFilter.includes(p.displayName));
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.displayName.toLowerCase().includes(q));
    }

    result = [...result].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [allProjects, projectFilter, search, sortKey, sortDir]);

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setSortDir("desc");
    }
  }

  const isFiltered = search || projectFilter.length > 0;

  const chartData =
    activity?.daily.map((d) => ({
      date: d.date,
      tokens: d.totalTokens,
      messages: d.messageCount,
    })) || [];

  const directTokens = overview
    ? overview.totalInputTokens + overview.totalOutputTokens
    : 0;

  const donutData =
    overview?.modelBreakdown.map((m) => ({
      name: m.model,
      value: m.inputTokens + m.outputTokens,
      percentage: 0,
    })) || [];

  // Recalculate percentages based on input+output only
  const donutTotal = donutData.reduce((sum, d) => sum + d.value, 0);
  for (const d of donutData) {
    d.percentage = donutTotal > 0 ? Math.round((d.value / donutTotal) * 1000) / 10 : 0;
  }

  return (
    <div>
      <Header title="Overview" />
      <div className="p-8">
        {/* KPI row */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {overviewLoading ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : overviewError ? (
            <div className="col-span-5">
              <ErrorAlert
                title="Failed to load overview"
                message={overviewErr instanceof ApiError ? overviewErr.message : "Could not connect to the server"}
                onRetry={() => refetchOverview()}
              />
            </div>
          ) : overview ? (
            <>
              <StatCard
                label="Input + Output Tokens"
                value={formatTokens(directTokens)}
                sub={`${formatTokens(overview.totalInputTokens)} in, ${formatTokens(overview.totalOutputTokens)} out`}
                tooltip="Total tokens sent to and received from Claude. Input tokens are your prompts and context; output tokens are Claude's responses. Excludes cache tokens."
              />
              <StatCard
                label="Sessions"
                value={formatNumber(overview.totalSessions)}
                sub={`${overview.activeDays} active days`}
                tooltip="A session is a single Claude Code conversation — from opening the CLI to closing it or starting a new thread."
              />
              <StatCard
                label="Messages"
                value={formatNumber(overview.totalMessages)}
                tooltip="Total back-and-forth messages across all sessions. Each prompt you send and each response Claude gives counts as one message."
              />
              <StatCard
                label="Avg Messages/Session"
                value={overview.totalSessions > 0
                  ? String(Math.round(overview.totalMessages / overview.totalSessions))
                  : "0"}
                sub={`${formatNumber(overview.totalMessages)} total messages`}
                tooltip="Average number of messages exchanged per session. Higher numbers suggest longer, more iterative conversations with Claude."
              />
              <StatCard
                label="Cache Hit Rate"
                value={
                  overview.totalTokens > 0
                    ? `${((overview.totalCacheReadTokens / overview.totalTokens) * 100).toFixed(1)}%`
                    : "0%"
                }
                sub={`${formatTokens(overview.totalCacheReadTokens)} cache reads`}
                tooltip="Percentage of tokens served from Anthropic's prompt cache instead of being reprocessed. Higher rates mean faster responses and lower cost for repeated context."
              />
            </>
          ) : null}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="col-span-2 border border-border p-6">
            <h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted mb-4">
              Output tokens — last 30 days
            </h3>
            {activityLoading ? (
              <ChartSkeleton height="h-56" />
            ) : activityError ? (
              <ErrorAlert
                title="Failed to load chart"
                message={activityErr instanceof ApiError ? activityErr.message : "Could not load activity data"}
                onRetry={() => refetchActivity()}
              />
            ) : (
              <AreaChart
                data={chartData}
                xKey="date"
                series={[{ key: "tokens", label: "Tokens" }]}
                height={220}
                formatValue={formatTokens}
              />
            )}
          </div>

          <div className="border border-border p-6">
            <h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted mb-4">
              Model distribution
            </h3>
            <DonutChart
              data={donutData}
              height={160}
              centerLabel="in + out"
              centerValue={overview ? formatTokens(directTokens) : "—"}
              formatValue={formatTokens}
            />
            <div className="mt-4">
              <DonutLegend data={donutData} />
            </div>
          </div>
        </div>

        {/* Projects table */}
        <div className="border border-border">
          <div className="px-6 pt-5 pb-3">
            <h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
              Projects
            </h3>
          </div>

          {/* Search + filter toolbar */}
          <div className="px-6 pb-3 flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="px-3 py-1.5 text-xs border border-border bg-transparent text-inherit placeholder:text-muted focus:outline-none focus:border-brand w-56"
            />
            <MultiSelectFilter
              label="Project"
              options={projectNames}
              selected={projectFilter}
              onChange={setProjectFilter}
            />
            <span className="ml-auto text-xs text-muted">
              {isFiltered
                ? `${filtered.length} of ${allProjects.length} projects`
                : `${allProjects.length} projects`}
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
              {
                key: "sessions",
                header: "Sessions",
                align: "right",
                sortable: true,
                render: (row) => formatNumber(row.totalSessions),
              },
              {
                key: "messages",
                header: "Messages",
                align: "right",
                sortable: true,
                render: (row) => formatNumber(row.totalMessages),
              },
              {
                key: "branches",
                header: "Branches",
                align: "right",
                sortable: true,
                render: (row) => row.branches.length,
              },
              {
                key: "lastActive",
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
