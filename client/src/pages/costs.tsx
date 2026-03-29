import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ui/error-alert";
import { DateRange } from "@/components/ui/date-range";
import { LineChart } from "@/components/charts/line-chart";
import { DataTable } from "@/components/ui/data-table";
import { useCosts } from "@/hooks/use-queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { SourceBadge } from "@/components/ui/source-badge";

export function CostsPage() {
	const [range, setRange] = useState("90d");
	const { data, isLoading, isError, error, refetch } = useCosts(range);

	// Get all model names from cumulative data
	const modelKeys = useMemo(() => {
		if (!data?.cumulative.length) return [];
		const last = data.cumulative[data.cumulative.length - 1];
		return Object.keys(last.cumulativeByModel);
	}, [data]);

	const cumulativeData = useMemo(() => {
		if (!data) return [];
		return data.cumulative.map((c) => ({
			date: c.date,
			total: c.cumulativeCostUSD,
			...c.cumulativeByModel,
		}));
	}, [data]);

	return (
		<div>
			<Header title="Costs" source={data?.source} />
			<div className="p-8">
				{/* KPI row */}
				<div className="grid grid-cols-3 gap-4 mb-8">
					{isLoading ? (
						Array.from({ length: 2 }).map((_, i) => <StatCardSkeleton key={i} />)
					) : isError ? (
						<div className="col-span-3">
							<ErrorAlert
								title="Failed to load costs"
								message={error instanceof ApiError ? error.message : "Could not load cost data"}
								onRetry={() => refetch()}
							/>
						</div>
					) : data ? (
						<>
							<StatCard
								label="Total Est. API Cost"
								value={formatCurrency(data.totalEstimatedCostUSD)}
								sub="if billed per-token at API rates"
							/>
							<StatCard label="This Month" value={formatCurrency(data.thisMonthCostUSD)} sub="estimated at API rates" />
							<StatCard
								label="Daily Average"
								value={data.daily.length > 0 ? formatCurrency(data.totalEstimatedCostUSD / data.daily.length) : "$0.00"}
							/>
						</>
					) : null}
				</div>

				<div className="flex justify-end mb-6">
					<DateRange value={range} onChange={setRange} />
				</div>

				{/* Cumulative cost chart */}
				<div className="border border-border p-6 mb-6">
					<div className="flex items-center gap-1.5 mb-4">
						<h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
							Cumulative cost over time
						</h3>
						<SourceBadge source={data?.source} />
					</div>
					{isLoading ? (
						<ChartSkeleton />
					) : (
						<LineChart
							data={cumulativeData}
							xKey="date"
							series={[{ key: "total", label: "Total" }, ...modelKeys.map((k) => ({ key: k, label: k }))]}
							formatValue={formatCurrency}
						/>
					)}
				</div>

				{/* Daily cost table */}
				<div className="border border-border">
					<div className="px-6 pt-5 pb-3">
						<div className="flex items-center gap-1.5">
							<h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">Daily costs</h3>
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
							...Object.keys(data?.daily[0]?.costByModel || {}).map((model) => ({
								key: model,
								header: model,
								align: "right" as const,
								render: (row: NonNullable<typeof data>["daily"][0]) => formatCurrency(row.costByModel[model] || 0),
							})),
							{
								key: "total",
								header: "Total",
								align: "right" as const,
								render: (row: NonNullable<typeof data>["daily"][0]) => formatCurrency(row.totalCostUSD),
							},
						]}
						data={data?.daily.slice().reverse() || []}
					/>
				</div>
			</div>
		</div>
	);
}
