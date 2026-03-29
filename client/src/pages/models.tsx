import { Header } from "@/components/layout/header";
import { DonutChart, DonutLegend } from "@/components/charts/donut-chart";
import { DataTable } from "@/components/ui/data-table";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useModels } from "@/hooks/use-queries";
import { formatTokens, formatPercent } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { SourceBadge } from "@/components/ui/source-badge";

export function ModelsPage() {
	const { data, isLoading, isError, error, refetch } = useModels();

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

	return (
		<div>
			<Header title="Models" source={data?.source} />
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
								sub={`${(((data.totalTokens - donutTotal) / data.totalTokens) * 100).toFixed(1)}% of all tokens`}
							/>
							<StatCard label="Models Used" value={String(data.models.length)} />
						</>
					) : null}
				</div>

				{/* Donut + legend */}
				<div className="grid grid-cols-3 gap-4 mb-8">
					<div className="col-span-2 border border-border p-6">
						<div className="flex items-center gap-1.5 mb-4">
							<h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
								Token distribution by model
							</h3>
							<SourceBadge source={data?.source} />
						</div>
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
						<div className="flex items-center gap-1.5">
							<h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">Model breakdown</h3>
							<SourceBadge source={data?.source} />
						</div>
					</div>
					<DataTable
						columns={[
							{
								key: "model",
								header: "Model",
								render: (row: NonNullable<typeof data>["models"][0]) => (
									<span className="font-medium">{row.displayName}</span>
								),
							},
							{ key: "input", header: "Input", align: "right", render: (row) => formatTokens(row.inputTokens) },
							{ key: "output", header: "Output", align: "right", render: (row) => formatTokens(row.outputTokens) },
							{
								key: "cacheRead",
								header: "Cache Read",
								align: "right",
								render: (row) => formatTokens(row.cacheReadTokens),
							},
							{
								key: "cacheWrite",
								header: "Cache Write",
								align: "right",
								render: (row) => formatTokens(row.cacheWriteTokens),
							},
							{ key: "total", header: "Total", align: "right", render: (row) => formatTokens(row.totalTokens) },
							{ key: "pct", header: "%", align: "right", render: (row) => formatPercent(row.percentage) },
						]}
						data={data?.models || []}
					/>
				</div>
			</div>
		</div>
	);
}
