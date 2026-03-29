import { Hono } from "hono";
import { getStatsCache } from "../parsers/stats-cache.js";
import { calculateCost, getModelDisplayName } from "../services/cost-calculator.js";
import { config } from "../config.js";
import { getApiOverview } from "../services/api-data-provider.js";
import type { OverviewResponse } from "../types.js";

const app = new Hono();

app.get("/", async (c) => {
	if (config.anthropicAdminApiKey) {
		const result = await getApiOverview();
		if (!result.ok) return c.json({ error: true, code: result.error, message: result.message }, 502);
		return c.json({ ...result.data, source: "api" });
	}

	const stats = await getStatsCache();

	let totalInputTokens = 0;
	let totalOutputTokens = 0;
	let totalCacheReadTokens = 0;
	let totalCacheWriteTokens = 0;
	let totalEstimatedCost = 0;

	const modelBreakdown = Object.entries(stats.modelUsage).map(([model, usage]) => {
		const cost = calculateCost(
			model,
			usage.inputTokens,
			usage.outputTokens,
			usage.cacheReadInputTokens,
			usage.cacheCreationInputTokens,
		);

		totalInputTokens += usage.inputTokens;
		totalOutputTokens += usage.outputTokens;
		totalCacheReadTokens += usage.cacheReadInputTokens;
		totalCacheWriteTokens += usage.cacheCreationInputTokens;
		totalEstimatedCost += cost;

		return {
			model: getModelDisplayName(model),
			inputTokens: usage.inputTokens,
			outputTokens: usage.outputTokens,
			cacheReadTokens: usage.cacheReadInputTokens,
			cacheWriteTokens: usage.cacheCreationInputTokens,
			estimatedCostUSD: Math.round(cost * 100) / 100,
			percentage: 0,
		};
	});

	const totalTokens = totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheWriteTokens;

	for (const m of modelBreakdown) {
		const modelTotal = m.inputTokens + m.outputTokens + m.cacheReadTokens + m.cacheWriteTokens;
		m.percentage = totalTokens > 0 ? Math.round((modelTotal / totalTokens) * 1000) / 10 : 0;
	}

	const response: OverviewResponse = {
		source: "local",
		totalTokens,
		totalInputTokens,
		totalOutputTokens,
		totalCacheReadTokens,
		totalCacheWriteTokens,
		totalSessions: stats.totalSessions,
		totalMessages: stats.totalMessages,
		estimatedCostUSD: Math.round(totalEstimatedCost * 100) / 100,
		activeDays: stats.dailyActivity.length,
		firstSessionDate: stats.firstSessionDate,
		lastComputedDate: stats.lastComputedDate,
		modelBreakdown,
	};

	return c.json(response);
});

export default app;
