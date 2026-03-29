import { Hono } from "hono";
import { getStatsCache } from "../parsers/stats-cache.js";
import { getModelDisplayName } from "../services/cost-calculator.js";
import type { InsightsResponse } from "../types.js";

const app = new Hono();

app.get("/", async (c) => {
	const stats = await getStatsCache();

	// Cache hit rate
	let totalCacheRead = 0;
	let totalInput = 0;
	let totalCacheWrite = 0;

	for (const usage of Object.values(stats.modelUsage)) {
		totalCacheRead += usage.cacheReadInputTokens;
		totalInput += usage.inputTokens;
		totalCacheWrite += usage.cacheCreationInputTokens;
	}

	const totalInputContext = totalCacheRead + totalInput + totalCacheWrite;
	const cacheHitRate = totalInputContext > 0 ? (totalCacheRead / totalInputContext) * 100 : 0;

	// Average messages per session
	const avgMessagesPerSession = stats.totalSessions > 0 ? Math.round(stats.totalMessages / stats.totalSessions) : 0;

	// Peak hour
	let peakHour = 0;
	let peakCount = 0;
	for (const [hour, count] of Object.entries(stats.hourCounts)) {
		if (count > peakCount) {
			peakCount = count;
			peakHour = parseInt(hour, 10);
		}
	}

	// Top model by total tokens
	let topModel = "";
	let topTokens = 0;
	for (const [model, usage] of Object.entries(stats.modelUsage)) {
		const total = usage.inputTokens + usage.outputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens;
		if (total > topTokens) {
			topTokens = total;
			topModel = getModelDisplayName(model);
		}
	}

	// Hour distribution (0-23)
	const hourDistribution = Array.from({ length: 24 }, (_, i) => ({
		hour: i,
		count: stats.hourCounts[String(i)] || 0,
	}));

	const response: InsightsResponse = {
		source: "local",
		cacheHitRate: Math.round(cacheHitRate * 10) / 10,
		avgMessagesPerSession,
		peakHour,
		topModel,
		hourDistribution,
		longestSession: stats.longestSession,
	};

	return c.json(response);
});

export default app;
