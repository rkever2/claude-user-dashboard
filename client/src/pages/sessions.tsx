import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useSessions } from "@/hooks/use-queries";
import { formatNumber, formatDateFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { SessionListItem } from "@shared/types";

export function SessionsPage() {
  const { data, isError, error, refetch } = useSessions();

  return (
    <div>
      <Header title="Sessions" />
      <div className="p-8">
        {isError ? (
          <div className="mb-6">
            <ErrorAlert
              title="Failed to load sessions"
              message={error instanceof ApiError ? error.message : "Could not load session data"}
              onRetry={() => refetch()}
            />
          </div>
        ) : null}

        <div className="border border-border">
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
              All sessions
            </h3>
            <span className="text-xs text-muted">{data?.total || 0} sessions</span>
          </div>
          <DataTable
            columns={[
              {
                key: "project",
                header: "Project",
                render: (row: SessionListItem) => (
                  <span className="font-medium">{row.projectDisplayName}</span>
                ),
              },
              {
                key: "branch",
                header: "Branch",
                render: (row) => (
                  <span className="text-xs font-mono text-muted">{row.gitBranch}</span>
                ),
              },
              {
                key: "messages",
                header: "Messages",
                align: "right",
                render: (row) => formatNumber(row.messageCount),
              },
              {
                key: "created",
                header: "Created",
                align: "right",
                render: (row) => formatDateFull(row.created),
              },
              {
                key: "prompt",
                header: "First Prompt",
                render: (row) => (
                  <span className="text-xs text-muted truncate max-w-[300px] block">
                    {row.firstPrompt || "—"}
                  </span>
                ),
              },
            ]}
            data={data?.sessions || []}
          />
        </div>
      </div>
    </div>
  );
}
