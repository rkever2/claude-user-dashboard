/** Per-million-token pricing for each model family. */
interface ModelPricing {
	inputPer1M: number;
	outputPer1M: number;
	cacheReadPer1M: number;
	cacheWritePer1M: number;
}

const PRICING: Record<string, ModelPricing> = {
	"claude-sonnet": {
		inputPer1M: 3.0,
		outputPer1M: 15.0,
		cacheReadPer1M: 0.3,
		cacheWritePer1M: 3.75,
	},
	"claude-opus": {
		inputPer1M: 15.0,
		outputPer1M: 75.0,
		cacheReadPer1M: 1.5,
		cacheWritePer1M: 18.75,
	},
	"claude-haiku": {
		inputPer1M: 0.8,
		outputPer1M: 4.0,
		cacheReadPer1M: 0.08,
		cacheWritePer1M: 1.0,
	},
};

function getPricing(model: string): ModelPricing {
	if (model.includes("opus")) return PRICING["claude-opus"];
	if (model.includes("haiku")) return PRICING["claude-haiku"];
	if (model.includes("sonnet")) return PRICING["claude-sonnet"];
	return PRICING["claude-sonnet"]; // default fallback
}

export interface TokenCounts {
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
}

/**
 * Estimate the USD cost for a given model and token counts.
 * Uses per-million-token pricing. Returns cost in dollars.
 */
export function calculateCost(model: string, tokens: TokenCounts): number {
	const pricing = getPricing(model);
	return (
		(tokens.inputTokens / 1_000_000) * pricing.inputPer1M +
		(tokens.outputTokens / 1_000_000) * pricing.outputPer1M +
		(tokens.cacheReadTokens / 1_000_000) * pricing.cacheReadPer1M +
		(tokens.cacheWriteTokens / 1_000_000) * pricing.cacheWritePer1M
	);
}

/** Map raw model IDs (e.g. "claude-opus-4-6") to user-friendly names. */
export function getModelDisplayName(model: string): string {
	if (model.includes("opus-4-6")) return "Claude Opus 4.6";
	if (model.includes("opus-4-5")) return "Claude Opus 4.5";
	if (model.includes("sonnet-4-5")) return "Claude Sonnet 4.5";
	if (model.includes("haiku")) return "Claude Haiku";
	return model;
}
