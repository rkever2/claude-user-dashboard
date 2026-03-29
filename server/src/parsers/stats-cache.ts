import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import { AppError } from "../errors.js";
import { computeStatsFromJsonl, mergeStats } from "./stats-from-jsonl.js";
import type { StatsCache } from "../types.js";

let cache: { data: StatsCache; timestamp: number } | null = null;

export async function getStatsCache(): Promise<StatsCache> {
	const now = Date.now();
	if (cache && now - cache.timestamp < config.cacheTtlMs) {
		return cache.data;
	}

	const filePath = path.join(config.claudeDataDir, "stats-cache.json");

	// Try to read the pre-computed cache as a baseline
	let baseline: StatsCache | null = null;
	try {
		const raw = await fs.readFile(filePath, "utf-8");
		baseline = JSON.parse(raw);
	} catch {
		// stats-cache.json doesn't exist or is invalid — we'll compute from scratch
	}

	// Compute incremental stats from JSONL files modified after the baseline's last date
	const afterDate = baseline?.lastComputedDate || "1970-01-01";
	const incremental = await computeStatsFromJsonl(afterDate);

	let data: StatsCache;
	if (baseline) {
		data = mergeStats(baseline, incremental);
	} else if (incremental.totalSessions > 0) {
		data = incremental;
	} else {
		throw new AppError(
			"STATS_CACHE_MISSING",
			"No usage data found. stats-cache.json is missing and no session JSONL files were found. Have you used Claude Code CLI yet?",
			404,
		);
	}

	cache = { data, timestamp: now };
	return data;
}
