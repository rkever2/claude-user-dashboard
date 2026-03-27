import { Hono } from "hono";
import { getStatsCache } from "../parsers/stats-cache.js";
import { calculateCost, getModelDisplayName } from "../services/cost-calculator.js";
import type { ModelsResponse } from "../types.js";

const app = new Hono();

app.get("/", async (c) => {
  const stats = await getStatsCache();

  let grandTotalTokens = 0;
  let grandTotalCost = 0;

  const models = Object.entries(stats.modelUsage).map(([model, usage]) => {
    const totalTokens =
      usage.inputTokens + usage.outputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens;

    const cost = calculateCost(
      model,
      usage.inputTokens,
      usage.outputTokens,
      usage.cacheReadInputTokens,
      usage.cacheCreationInputTokens,
    );

    grandTotalTokens += totalTokens;
    grandTotalCost += cost;

    return {
      model,
      displayName: getModelDisplayName(model),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadInputTokens,
      cacheWriteTokens: usage.cacheCreationInputTokens,
      totalTokens,
      estimatedCostUSD: Math.round(cost * 100) / 100,
      percentage: 0,
    };
  });

  for (const m of models) {
    m.percentage = grandTotalTokens > 0 ? Math.round((m.totalTokens / grandTotalTokens) * 1000) / 10 : 0;
  }

  models.sort((a, b) => b.totalTokens - a.totalTokens);

  const response: ModelsResponse = {
    models,
    totalTokens: grandTotalTokens,
    totalEstimatedCostUSD: Math.round(grandTotalCost * 100) / 100,
  };

  return c.json(response);
});

export default app;
