import { Hono } from "hono";
import { getStatsCache } from "../parsers/stats-cache.js";
import { calculateCost } from "../services/cost-calculator.js";
import type { ActivityResponse } from "../types.js";

const app = new Hono();

app.get("/", async (c) => {
	const range = c.req.query("range") || "all";
	const stats = await getStatsCache();

	let activities = stats.dailyActivity;
	const tokenData = stats.dailyModelTokens;

	// Build a map of date -> tokensByModel
	const tokensByDate = new Map<string, Record<string, number>>();
	for (const entry of tokenData) {
		tokensByDate.set(entry.date, entry.tokensByModel);
	}

	// Apply date range filter
	if (range !== "all") {
		const days = parseInt(range.replace("d", ""), 10);
		if (!isNaN(days)) {
			const cutoff = new Date();
			cutoff.setDate(cutoff.getDate() - days);
			const cutoffStr = cutoff.toISOString().split("T")[0];
			activities = activities.filter((a) => a.date >= cutoffStr);
		}
	}

	const daily = activities.map((a) => {
		const tokensByModel = tokensByDate.get(a.date) || {};
		const totalTokens = Object.values(tokensByModel).reduce((sum, t) => sum + t, 0);

		let estimatedCost = 0;
		for (const [model, tokens] of Object.entries(tokensByModel)) {
			estimatedCost += calculateCost(model, 0, tokens, 0, 0);
		}

		return {
			date: a.date,
			messageCount: a.messageCount,
			sessionCount: a.sessionCount,
			toolCallCount: a.toolCallCount,
			tokensByModel,
			totalTokens,
			estimatedCostUSD: Math.round(estimatedCost * 100) / 100,
		};
	});

	const response: ActivityResponse = { daily };
	return c.json(response);
});

export default app;
