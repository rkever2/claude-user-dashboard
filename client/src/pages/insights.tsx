import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/ui/error-alert";
import { BarChart } from "@/components/charts/bar-chart";
import { useInsights } from "@/hooks/use-queries";
import { formatHour, formatDuration, formatPercent } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { SourceBadge } from "@/components/ui/source-badge";

export function InsightsPage() {
	const { data, isLoading, isError, error, refetch } = useInsights();

	const hourData =
		data?.hourDistribution.map((h) => ({
			name: formatHour(h.hour),
			value: h.count,
		})) || [];

	return (
		<div>
			<Header title="Insights" source="local" />
			<div className="p-8">
				{/* KPI row */}
				<div className="grid grid-cols-4 gap-4 mb-8">
					{isLoading ? (
						Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
					) : isError ? (
						<div className="col-span-4">
							<ErrorAlert
								title="Failed to load insights"
								message={error instanceof ApiError ? error.message : "Could not load insights data"}
								onRetry={() => refetch()}
							/>
						</div>
					) : data ? (
						<>
							<StatCard
								label="Cache Hit Rate"
								value={formatPercent(data.cacheHitRate)}
								sub="cache reads / total input"
							/>
							<StatCard label="Avg Messages/Session" value={String(data.avgMessagesPerSession)} />
							<StatCard label="Peak Hour" value={formatHour(data.peakHour)} sub="most sessions started" />
							<StatCard label="Top Model" value={data.topModel} sub="by total tokens" />
						</>
					) : null}
				</div>

				{/* Hour distribution */}
				<div className="border border-border p-6 mb-6">
					<div className="flex items-center gap-1.5 mb-4">
						<h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">
							Session start by hour of day
						</h3>
						<SourceBadge source="local" />
					</div>
					{isLoading ? <ChartSkeleton /> : <BarChart data={hourData} layout="horizontal" height={280} />}
				</div>

				{/* Longest session */}
				{data?.longestSession && (
					<div className="border border-border p-6">
						<div className="flex items-center gap-1.5 mb-3">
							<h3 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted">Longest session</h3>
							<SourceBadge source="local" />
						</div>
						<div className="grid grid-cols-3 gap-4">
							<div>
								<p className="text-xs text-muted">Duration</p>
								<p className="font-display text-lg font-bold">{formatDuration(data.longestSession.duration)}</p>
							</div>
							<div>
								<p className="text-xs text-muted">Messages</p>
								<p className="font-display text-lg font-bold">{data.longestSession.messageCount}</p>
							</div>
							<div>
								<p className="text-xs text-muted">Date</p>
								<p className="font-display text-lg font-bold">
									{new Date(data.longestSession.timestamp).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									})}
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
