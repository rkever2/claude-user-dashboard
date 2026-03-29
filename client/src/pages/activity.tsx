import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { DateRange } from "@/components/ui/date-range";
import { AreaChart } from "@/components/charts/area-chart";
import { DataTable } from "@/components/ui/data-table";
import { ChartSkeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useActivity } from "@/hooks/use-queries";
import { formatTokens, formatNumber, formatDate } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { SourceBadge } from "@/components/ui/source-badge";

export function ActivityPage() {
	const [range, setRange] = useState("30d");
	const { data, isLoading, isError, error, refetch } = useActivity(range);

	// Extract all unique model keys for stacked chart
	const modelKeys = useMemo(() => {
		if (!data) return [];
		const keys = new Set<string>();
		for (const d of data.daily) {
			for (const k of Object.keys(d.tokensByModel)) {
				keys.add(k);
			}
		}
		return Array.from(keys);
	}, [data]);

	const chartData = useMemo(() => {
		if (!data) return [];
		return data.daily.map((d) => ({
			date: d.date,
			...d.tokensByModel,
			messages: d.messageCount,
			sessions: d.sessionCount,
			tools: d.toolCallCount,
		}));
	}, [data]);

	const activityChartData = useMemo(() => {
		if (!data) return [];
		return data.daily.map((d) => ({
			date: d.date,
			messages: d.messageCount,
			sessions: d.sessionCount,
		}));
	}, [data]);

	// Friendly model names
	const modelLabel = (k: string) => {
		if (k.includes("opus-4-6")) return "Opus 4.6";
		if (k.includes("opus-4-5")) return "Opus 4.5";
		if (k.includes("sonnet-4-5")) return "Sonnet 4.5";
		return k;
	};

	return (
		<div>
			<Header title="Activity" source={data?.source} />
			<div className="p-8">
				<div className="flex justify-end mb-6">
					<DateRange value={range} onChange={setRange} />
				</div>

				{isError ? (
					<div className="mb-6">
						<ErrorAlert
							title="Failed to load activity"
							message={error instanceof ApiError ? error.message : "Could not load activity data"}
							onRetry={() => refetch()}
						/>
					</div>
				) : null}

				{/* Token chart */}
				<div className="border border-border p-6 mb-6">
					<div className="flex items-center gap-1.5 mb-4">
						<h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
							Daily tokens by model
						</h3>
						<SourceBadge source={data?.source} />
					</div>
					{isLoading ? (
						<ChartSkeleton />
					) : isError ? null : (
						<AreaChart
							data={chartData}
							xKey="date"
							series={modelKeys.map((k) => ({ key: k, label: modelLabel(k) }))}
							stacked
							formatValue={formatTokens}
						/>
					)}
				</div>

				{/* Sessions / messages chart */}
				<div className="border border-border p-6 mb-6">
					<div className="flex items-center gap-1.5 mb-4">
						<h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
							Daily sessions & messages
						</h3>
						<SourceBadge source={data?.source} />
					</div>
					{isLoading ? (
						<ChartSkeleton />
					) : (
						<AreaChart
							data={activityChartData}
							xKey="date"
							series={[
								{ key: "messages", label: "Messages" },
								{ key: "sessions", label: "Sessions" },
							]}
							formatValue={formatNumber}
						/>
					)}
				</div>

				{/* Data table */}
				<div className="border border-border">
					<div className="px-6 pt-5 pb-3">
						<div className="flex items-center gap-1.5">
							<h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">Daily breakdown</h3>
							<SourceBadge source={data?.source} />
						</div>
					</div>
					<DataTable
						columns={[
							{
								key: "date",
								header: "Date",
								render: (row: NonNullable<typeof data>["daily"][0]) => formatDate(row.date),
							},
							{ key: "messages", header: "Messages", align: "right", render: (row) => formatNumber(row.messageCount) },
							{ key: "sessions", header: "Sessions", align: "right", render: (row) => formatNumber(row.sessionCount) },
							{ key: "tools", header: "Tool Calls", align: "right", render: (row) => formatNumber(row.toolCallCount) },
							{ key: "tokens", header: "Tokens", align: "right", render: (row) => formatTokens(row.totalTokens) },
						]}
						data={data?.daily.slice().reverse() || []}
					/>
				</div>
			</div>
		</div>
	);
}
