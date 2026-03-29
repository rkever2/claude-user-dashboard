import { Hono } from "hono";
import { getStatsCache } from "../parsers/stats-cache.js";
import { calculateCost, getModelDisplayName } from "../services/cost-calculator.js";
import { isAdminApiConfigured, getCostReport } from "../services/anthropic-api.js";
import { config } from "../config.js";
import { getApiCosts } from "../services/api-data-provider.js";
import type { CostsResponse } from "../types.js";

const app = new Hono();

app.get("/", async (c) => {
	const range = c.req.query("range") || "all";

	if (config.anthropicAdminApiKey) {
		const result = await getApiCosts(range);
		if (!result.ok) return c.json({ error: true, code: result.error, message: result.message }, 502);
		return c.json({ ...result.data, source: "api" });
	}

	const stats = await getStatsCache();

	let tokenData = stats.dailyModelTokens;

	if (range !== "all") {
		const days = parseInt(range.replace("d", ""), 10);
		if (!isNaN(days)) {
			const cutoff = new Date();
			cutoff.setDate(cutoff.getDate() - days);
			const cutoffStr = cutoff.toISOString().split("T")[0];
			tokenData = tokenData.filter((t) => t.date >= cutoffStr);
		}
	}

	// Calculate daily costs
	const daily = tokenData.map((t) => {
		const costByModel: Record<string, number> = {};
		let totalCost = 0;

		for (const [model, tokens] of Object.entries(t.tokensByModel)) {
			const displayName = getModelDisplayName(model);
			const cost = calculateCost(model, 0, tokens, 0, 0);
			costByModel[displayName] = Math.round(cost * 100) / 100;
			totalCost += cost;
		}

		return {
			date: t.date,
			costByModel,
			totalCostUSD: Math.round(totalCost * 100) / 100,
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

	// Calculate overall totals using full model usage data for accuracy
	let totalEstimatedCost = 0;
	for (const [model, usage] of Object.entries(stats.modelUsage)) {
		totalEstimatedCost += calculateCost(
			model,
			usage.inputTokens,
			usage.outputTokens,
			usage.cacheReadInputTokens,
			usage.cacheCreationInputTokens,
		);
	}

	// This month
	const now = new Date();
	const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const thisMonthCost = daily
		.filter((d) => d.date.startsWith(thisMonthPrefix))
		.reduce((sum, d) => sum + d.totalCostUSD, 0);

	const response: CostsResponse = {
		source: "local",
		daily,
		cumulative,
		totalEstimatedCostUSD: Math.round(totalEstimatedCost * 100) / 100,
		thisMonthCostUSD: Math.round(thisMonthCost * 100) / 100,
	};

	return c.json(response);
});

app.get("/admin", async (c) => {
	if (!isAdminApiConfigured()) {
		return c.json({
			available: false,
			error: "NOT_CONFIGURED",
			message: "Admin API key not configured. Set ANTHROPIC_ADMIN_API_KEY in your .env file.",
		});
	}

	const endDate = new Date().toISOString().split("T")[0];
	const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

	const result = await getCostReport(startDate, endDate);
	if (!result.ok) {
		return c.json({ available: false, error: result.error, message: result.message });
	}

	return c.json({ available: true, data: result.data });
});

export default app;
