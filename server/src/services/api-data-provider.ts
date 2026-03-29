import { config } from "../config.js";
import { getUsageReport, getCostReport, getClaudeCodeReport, type ApiResult } from "./anthropic-api.js";
import { getModelDisplayName } from "./cost-calculator.js";
import type {
	UsageReportResponse,
	CostReportResponse,
	ClaudeCodeReportResponse,
	UsageReportResult,
	CostReportResult,
} from "./anthropic-api-types.js";
import type {
	OverviewResponse,
	ActivityResponse,
	ModelsResponse,
	CostsResponse,
	InsightsResponse,
} from "../types.js";

// --- Cached API data ---

interface CachedApiData {
	usage: UsageReportResponse;
	costs: CostReportResponse;
	claudeCode: ClaudeCodeReportResponse | null; // null if endpoint unavailable
}

let cachedData: CachedApiData | null = null;
let cacheTimestamp = 0;

function getDateRange(range: string): { startDate: string; endDate: string } {
	const end = new Date();
	const endDate = end.toISOString().split("T")[0];
	let days = 30; // default for "all" — API has a 31-day limit per request
	if (range !== "all") {
		const parsed = Number.parseInt(range.replace("d", ""), 10);
		if (!Number.isNaN(parsed)) days = Math.min(parsed, 31);
	}
	const start = new Date();
	start.setDate(start.getDate() - days);
	const startDate = start.toISOString().split("T")[0];
	return { startDate, endDate };
}

async function fetchAllApiData(): Promise<ApiResult<CachedApiData>> {
	const now = Date.now();
	if (cachedData && now - cacheTimestamp < config.cacheTtlMs) {
		return { ok: true, data: cachedData };
	}

	const { startDate, endDate } = getDateRange("all");

	// Fetch usage and cost in parallel; claude_code is per-day so fetch today
	const [usageResult, costResult, codeResult] = await Promise.all([
		getUsageReport(startDate, endDate, ["model"]),
		getCostReport(startDate, endDate),
		getClaudeCodeReport(endDate).catch(() => null),
	]);

	if (!usageResult.ok) return usageResult;
	if (!costResult.ok) return costResult;

	// claude_code endpoint may not exist — gracefully degrade
	let claudeCode: ClaudeCodeReportResponse | null = null;
	if (codeResult && "ok" in codeResult && codeResult.ok) {
		claudeCode = codeResult.data;
	}

	cachedData = {
		usage: usageResult.data,
		costs: costResult.data,
		claudeCode,
	};
	cacheTimestamp = now;

	return { ok: true, data: cachedData };
}

// --- Helpers ---

function bucketDate(bucket: { starting_at: string }): string {
	return bucket.starting_at.split("T")[0];
}

function centsToDollars(centsStr: string): number {
	return Number.parseFloat(centsStr) / 100;
}

function aggregateUsageByModel(results: UsageReportResult[]): Map<string, {
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
}> {
	const byModel = new Map<string, {
		inputTokens: number;
		outputTokens: number;
		cacheReadTokens: number;
		cacheWriteTokens: number;
	}>();

	for (const r of results) {
		const model = r.model || "unknown";
		const existing = byModel.get(model) || {
			inputTokens: 0,
			outputTokens: 0,
			cacheReadTokens: 0,
			cacheWriteTokens: 0,
		};
		existing.inputTokens += r.uncached_input_tokens;
		existing.outputTokens += r.output_tokens;
		existing.cacheReadTokens += r.cache_read_input_tokens;
		existing.cacheWriteTokens +=
			r.cache_creation.ephemeral_1h_input_tokens + r.cache_creation.ephemeral_5m_input_tokens;
		byModel.set(model, existing);
	}

	return byModel;
}

function aggregateCostByModel(results: CostReportResult[]): Map<string, number> {
	const byModel = new Map<string, number>();
	for (const r of results) {
		const model = r.model || "other";
		byModel.set(model, (byModel.get(model) || 0) + centsToDollars(r.amount));
	}
	return byModel;
}

// --- Public API: transform functions ---

export async function getApiOverview(): Promise<ApiResult<OverviewResponse>> {
	const result = await fetchAllApiData();
	if (!result.ok) return result;
	const { usage, costs, claudeCode } = result.data;

	// Aggregate all usage buckets
	const allResults = usage.data.flatMap((b) => b.results);
	const byModel = aggregateUsageByModel(allResults);

	let totalInputTokens = 0;
	let totalOutputTokens = 0;
	let totalCacheReadTokens = 0;
	let totalCacheWriteTokens = 0;

	for (const m of byModel.values()) {
		totalInputTokens += m.inputTokens;
		totalOutputTokens += m.outputTokens;
		totalCacheReadTokens += m.cacheReadTokens;
		totalCacheWriteTokens += m.cacheWriteTokens;
	}

	const totalTokens = totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheWriteTokens;

	// Aggregate costs
	const allCostResults = costs.data.flatMap((b) => b.results);
	let totalCostUSD = 0;
	for (const r of allCostResults) {
		totalCostUSD += centsToDollars(r.amount);
	}

	// Cost by model for breakdown
	const costByModel = aggregateCostByModel(allCostResults);

	// Total sessions from claude_code report
	let totalSessions = 0;
	if (claudeCode) {
		for (const record of claudeCode.data) {
			totalSessions += record.core_metrics.num_sessions;
		}
	}

	// Model breakdown
	const modelBreakdown = Array.from(byModel.entries()).map(([model, tokens]) => {
		const modelTotal = tokens.inputTokens + tokens.outputTokens + tokens.cacheReadTokens + tokens.cacheWriteTokens;
		return {
			model: getModelDisplayName(model),
			inputTokens: tokens.inputTokens,
			outputTokens: tokens.outputTokens,
			cacheReadTokens: tokens.cacheReadTokens,
			cacheWriteTokens: tokens.cacheWriteTokens,
			estimatedCostUSD: Math.round((costByModel.get(model) || 0) * 100) / 100,
			percentage: totalTokens > 0 ? Math.round((modelTotal / totalTokens) * 1000) / 10 : 0,
		};
	});

	// Dates
	const dates = usage.data.map((b) => bucketDate(b)).sort();
	const firstDate = dates[0] || "";
	const lastDate = dates[dates.length - 1] || "";

	return {
		ok: true,
		data: {
			totalTokens,
			totalInputTokens,
			totalOutputTokens,
			totalCacheReadTokens,
			totalCacheWriteTokens,
			totalSessions,
			totalMessages: 0, // not available from API
			estimatedCostUSD: Math.round(totalCostUSD * 100) / 100,
			activeDays: usage.data.length,
			firstSessionDate: firstDate,
			lastComputedDate: lastDate,
			modelBreakdown,
		},
	};
}

export async function getApiActivity(range: string): Promise<ApiResult<ActivityResponse>> {
	const result = await fetchAllApiData();
	if (!result.ok) return result;
	const { usage, costs, claudeCode } = result.data;

	// Build session count by date from claude_code report
	const sessionsByDate = new Map<string, number>();
	if (claudeCode) {
		for (const record of claudeCode.data) {
			sessionsByDate.set(record.date, (sessionsByDate.get(record.date) || 0) + record.core_metrics.num_sessions);
		}
	}

	// Build cost by date
	const costByDate = new Map<string, number>();
	for (const bucket of costs.data) {
		const date = bucketDate(bucket);
		let total = 0;
		for (const r of bucket.results) {
			total += centsToDollars(r.amount);
		}
		costByDate.set(date, (costByDate.get(date) || 0) + total);
	}

	// Apply range filter
	let filteredBuckets = usage.data;
	if (range !== "all") {
		const days = Number.parseInt(range.replace("d", ""), 10);
		if (!Number.isNaN(days)) {
			const cutoff = new Date();
			cutoff.setDate(cutoff.getDate() - days);
			const cutoffStr = cutoff.toISOString().split("T")[0];
			filteredBuckets = filteredBuckets.filter((b) => bucketDate(b) >= cutoffStr);
		}
	}

	const daily = filteredBuckets.map((bucket) => {
		const date = bucketDate(bucket);
		const tokensByModel: Record<string, number> = {};
		let totalTokens = 0;

		for (const r of bucket.results) {
			const model = getModelDisplayName(r.model || "unknown");
			const t =
				r.uncached_input_tokens +
				r.output_tokens +
				r.cache_read_input_tokens +
				r.cache_creation.ephemeral_1h_input_tokens +
				r.cache_creation.ephemeral_5m_input_tokens;
			tokensByModel[model] = (tokensByModel[model] || 0) + t;
			totalTokens += t;
		}

		return {
			date,
			messageCount: 0, // not available from API
			sessionCount: sessionsByDate.get(date) || 0,
			toolCallCount: 0, // not available from API
			tokensByModel,
			totalTokens,
			estimatedCostUSD: Math.round((costByDate.get(date) || 0) * 100) / 100,
		};
	});

	return { ok: true, data: { daily } };
}

export async function getApiModels(): Promise<ApiResult<ModelsResponse>> {
	const result = await fetchAllApiData();
	if (!result.ok) return result;
	const { usage, costs } = result.data;

	const allResults = usage.data.flatMap((b) => b.results);
	const byModel = aggregateUsageByModel(allResults);
	const allCostResults = costs.data.flatMap((b) => b.results);
	const costByModel = aggregateCostByModel(allCostResults);

	let grandTotalTokens = 0;
	let grandTotalCost = 0;

	const models = Array.from(byModel.entries()).map(([model, tokens]) => {
		const totalTokens = tokens.inputTokens + tokens.outputTokens + tokens.cacheReadTokens + tokens.cacheWriteTokens;
		const cost = costByModel.get(model) || 0;
		grandTotalTokens += totalTokens;
		grandTotalCost += cost;

		return {
			model,
			displayName: getModelDisplayName(model),
			inputTokens: tokens.inputTokens,
			outputTokens: tokens.outputTokens,
			cacheReadTokens: tokens.cacheReadTokens,
			cacheWriteTokens: tokens.cacheWriteTokens,
			totalTokens,
			estimatedCostUSD: Math.round(cost * 100) / 100,
			percentage: 0,
		};
	});

	for (const m of models) {
		m.percentage = grandTotalTokens > 0 ? Math.round((m.totalTokens / grandTotalTokens) * 1000) / 10 : 0;
	}

	models.sort((a, b) => b.totalTokens - a.totalTokens);

	return {
		ok: true,
		data: {
			models,
			totalTokens: grandTotalTokens,
			totalEstimatedCostUSD: Math.round(grandTotalCost * 100) / 100,
		},
	};
}

export async function getApiCosts(range: string): Promise<ApiResult<CostsResponse>> {
	const result = await fetchAllApiData();
	if (!result.ok) return result;
	const { costs } = result.data;

	// Apply range filter
	let filteredBuckets = costs.data;
	if (range !== "all") {
		const days = Number.parseInt(range.replace("d", ""), 10);
		if (!Number.isNaN(days)) {
			const cutoff = new Date();
			cutoff.setDate(cutoff.getDate() - days);
			const cutoffStr = cutoff.toISOString().split("T")[0];
			filteredBuckets = filteredBuckets.filter((b) => bucketDate(b) >= cutoffStr);
		}
	}

	const daily = filteredBuckets.map((bucket) => {
		const date = bucketDate(bucket);
		const costByModel: Record<string, number> = {};
		let totalCostUSD = 0;

		for (const r of bucket.results) {
			const model = getModelDisplayName(r.model || "other");
			const usd = centsToDollars(r.amount);
			costByModel[model] = (costByModel[model] || 0) + usd;
			totalCostUSD += usd;
		}

		// Round model costs
		for (const key of Object.keys(costByModel)) {
			costByModel[key] = Math.round(costByModel[key] * 100) / 100;
		}

		return {
			date,
			costByModel,
			totalCostUSD: Math.round(totalCostUSD * 100) / 100,
		};
	});

	// Build cumulative
	const cumulativeByModel: Record<string, number> = {};
	let cumulativeTotal = 0;

	const cumulative = daily.map((d) => {
		for (const [model, cost] of Object.entries(d.costByModel)) {
			cumulativeByModel[model] = (cumulativeByModel[model] || 0) + cost;
		}
		cumulativeTotal += d.totalCostUSD;

		return {
			date: d.date,
			cumulativeCostUSD: Math.round(cumulativeTotal * 100) / 100,
			cumulativeByModel: { ...cumulativeByModel },
		};
	});

	// Total and this month
	const allCostResults = costs.data.flatMap((b) => b.results);
	let totalEstimatedCostUSD = 0;
	for (const r of allCostResults) {
		totalEstimatedCostUSD += centsToDollars(r.amount);
	}

	const now = new Date();
	const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const thisMonthCost = daily
		.filter((d) => d.date.startsWith(thisMonthPrefix))
		.reduce((sum, d) => sum + d.totalCostUSD, 0);

	return {
		ok: true,
		data: {
			daily,
			cumulative,
			totalEstimatedCostUSD: Math.round(totalEstimatedCostUSD * 100) / 100,
			thisMonthCostUSD: Math.round(thisMonthCost * 100) / 100,
		},
	};
}

export async function getApiInsights(): Promise<ApiResult<InsightsResponse>> {
	const result = await fetchAllApiData();
	if (!result.ok) return result;
	const { usage, claudeCode } = result.data;

	const allResults = usage.data.flatMap((b) => b.results);
	const byModel = aggregateUsageByModel(allResults);

	// Cache hit rate
	let totalCacheRead = 0;
	let totalInput = 0;
	let totalCacheWrite = 0;

	for (const m of byModel.values()) {
		totalCacheRead += m.cacheReadTokens;
		totalInput += m.inputTokens;
		totalCacheWrite += m.cacheWriteTokens;
	}

	const totalInputContext = totalCacheRead + totalInput + totalCacheWrite;
	const cacheHitRate = totalInputContext > 0 ? (totalCacheRead / totalInputContext) * 100 : 0;

	// Top model by total tokens
	let topModel = "";
	let topTokens = 0;
	for (const [model, tokens] of byModel.entries()) {
		const total = tokens.inputTokens + tokens.outputTokens + tokens.cacheReadTokens + tokens.cacheWriteTokens;
		if (total > topTokens) {
			topTokens = total;
			topModel = getModelDisplayName(model);
		}
	}

	// Total sessions from claude_code
	let totalSessions = 0;
	if (claudeCode) {
		for (const record of claudeCode.data) {
			totalSessions += record.core_metrics.num_sessions;
		}
	}

	return {
		ok: true,
		data: {
			cacheHitRate: Math.round(cacheHitRate * 10) / 10,
			avgMessagesPerSession: 0, // not available from API
			peakHour: 0, // not available from API (would need hourly buckets)
			topModel,
			hourDistribution: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
			longestSession: {
				sessionId: "",
				duration: 0,
				messageCount: 0,
				timestamp: "",
			},
		},
	};
}
