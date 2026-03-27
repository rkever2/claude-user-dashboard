import { Header } from "@/components/layout/header";
import { BarChart } from "@/components/charts/bar-chart";
import { DataTable } from "@/components/ui/data-table";
import { ChartSkeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useProjects } from "@/hooks/use-queries";
import { formatNumber, formatDateFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { ProjectStats } from "@shared/types";

export function ProjectsPage() {
  const { data, isLoading, isError, error, refetch } = useProjects();

  const barData =
    data?.projects.slice(0, 10).map((p) => ({
      name: p.displayName,
      value: p.totalSessions,
    })) || [];

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
          <DataTable
            columns={[
              {
                key: "name",
                header: "Project",
                render: (row: ProjectStats) => (
                  <span className="font-medium">{row.displayName}</span>
                ),
              },
              { key: "sessions", header: "Sessions", align: "right", render: (row) => formatNumber(row.totalSessions) },
              { key: "messages", header: "Messages", align: "right", render: (row) => formatNumber(row.totalMessages) },
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
                render: (row) => (row.firstActive ? formatDateFull(row.firstActive) : "—"),
              },
              {
                key: "last",
                header: "Last Active",
                align: "right",
                render: (row) => (row.lastActive ? formatDateFull(row.lastActive) : "—"),
              },
            ]}
            data={data?.projects || []}
          />
        </div>
      </div>
    </div>
  );
}
