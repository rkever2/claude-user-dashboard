import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import type { StatsCache, DailyActivity, DailyModelTokens, ModelUsage, LongestSession } from "../types.js";

/**
 * Scan JSONL session files and compute stats for messages after `afterDate`.
 * Uses file mtime to find candidate files (any file modified after afterDate),
 * then filters individual messages by timestamp to avoid double-counting.
 * Only scans top-level session files (not subagent files, which are
 * already reflected in the parent session's token counts).
 */
export async function computeStatsFromJsonl(afterDate: string): Promise<StatsCache> {
	const projectsDir = path.join(config.claudeDataDir, "projects");
	// Use start of afterDate in local time for file mtime comparison
	const afterTimestamp = new Date(`${afterDate}T00:00:00`).getTime();

	// Collect all top-level .jsonl files across project dirs
	const jsonlFiles: string[] = [];
	try {
		const projectDirs = await fs.readdir(projectsDir);
		for (const dir of projectDirs) {
			const dirPath = path.join(projectsDir, dir);
			try {
				const stat = await fs.stat(dirPath);
				if (!stat.isDirectory()) continue;
			} catch {
				continue;
			}

			try {
				const files = await fs.readdir(dirPath);
				for (const file of files) {
					if (!file.endsWith(".jsonl")) continue;
					const filePath = path.join(dirPath, file);
					try {
						const stat = await fs.stat(filePath);
						// Only include files modified after the cutoff
						if (stat.mtimeMs > afterTimestamp) {
							jsonlFiles.push(filePath);
						}
					} catch {
						// skip unreadable files
					}
				}
			} catch {
				// skip unreadable dirs
			}
		}
	} catch {
		// projects dir doesn't exist — return empty stats
		return emptyStats();
	}

	if (jsonlFiles.length === 0) {
		return emptyStats();
	}

	// Aggregation accumulators
	const dailyActivityMap = new Map<string, { messageCount: number; sessionCount: number; toolCallCount: number }>();
	const dailyModelTokensMap = new Map<string, Record<string, number>>();
	const modelUsageMap = new Map<string, ModelUsage>();
	const hourCounts: Record<string, number> = {};
	let totalSessions = 0;
	let totalMessages = 0;
	let longestSession: LongestSession = { sessionId: "", duration: 0, messageCount: 0, timestamp: "" };
	let firstSessionDate = "";
	let latestMessageTimestamp = "";

	// Parse each file — only count messages with timestamps AFTER afterDate
	for (const filePath of jsonlFiles) {
		const sessionId = path.basename(filePath, ".jsonl");
		let raw: string;
		try {
			raw = await fs.readFile(filePath, "utf-8");
		} catch {
			continue;
		}

		const lines = raw.split("\n");
		let sessionStartTime: string | undefined;
		let sessionEndTime: string | undefined;
		let sessionMessageCount = 0;
		let sessionHasNewMessages = false;
		// Track which NEW dates this session has messages on
		const newSessionDates = new Set<string>();

		for (const line of lines) {
			if (!line.trim()) continue;
			let entry: Record<string, unknown>;
			try {
				entry = JSON.parse(line);
			} catch {
				continue;
			}

			const entryType = entry.type as string;
			const timestamp = entry.timestamp as string | undefined;

			// Skip messages on or before afterDate — those are already in the cache.
			// The cache covers data through afterDate, so only count messages
			// from days strictly after it to avoid double-counting.
			if (timestamp) {
				const messageDate = timestamp.split("T")[0];
				if (messageDate <= afterDate) continue;
			}

			if (timestamp) {
				if (!sessionStartTime) sessionStartTime = timestamp;
				sessionEndTime = timestamp;
				if (timestamp > latestMessageTimestamp) latestMessageTimestamp = timestamp;
			}

			if (entryType === "user" || entryType === "assistant") {
				sessionMessageCount++;
				sessionHasNewMessages = true;

				if (timestamp) {
					const date = timestamp.split("T")[0];
					newSessionDates.add(date);

					if (!firstSessionDate || date < firstSessionDate) {
						firstSessionDate = date;
					}

					// Hour distribution
					const hourMatch = timestamp.match(/T(\d{2}):/);
					if (hourMatch) {
						const hour = String(Number.parseInt(hourMatch[1], 10));
						hourCounts[hour] = (hourCounts[hour] || 0) + 1;
					}

					// Daily message count
					const dayActivity = dailyActivityMap.get(date) || { messageCount: 0, sessionCount: 0, toolCallCount: 0 };
					dayActivity.messageCount++;
					dailyActivityMap.set(date, dayActivity);
				}
			}

			if (entryType === "assistant" && entry.message) {
				const message = entry.message as Record<string, unknown>;
				const model = message.model as string | undefined;
				const usage = message.usage as Record<string, number> | undefined;

				if (model && usage) {
					const inputTokens = usage.input_tokens || 0;
					const outputTokens = usage.output_tokens || 0;
					const cacheReadTokens = usage.cache_read_input_tokens || 0;
					const cacheWriteTokens = usage.cache_creation_input_tokens || 0;
					const totalTokens = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;

					// Aggregate model usage
					const existing = modelUsageMap.get(model) || {
						inputTokens: 0,
						outputTokens: 0,
						cacheReadInputTokens: 0,
						cacheCreationInputTokens: 0,
						webSearchRequests: 0,
						costUSD: 0,
						contextWindow: 0,
						maxOutputTokens: 0,
					};
					existing.inputTokens += inputTokens;
					existing.outputTokens += outputTokens;
					existing.cacheReadInputTokens += cacheReadTokens;
					existing.cacheCreationInputTokens += cacheWriteTokens;
					modelUsageMap.set(model, existing);

					// Daily model tokens
					if (timestamp) {
						const date = timestamp.split("T")[0];
						const dayTokens = dailyModelTokensMap.get(date) || {};
						dayTokens[model] = (dayTokens[model] || 0) + totalTokens;
						dailyModelTokensMap.set(date, dayTokens);
					}
				}

				// Count tool uses
				const content = message.content as Array<Record<string, unknown>> | undefined;
				if (Array.isArray(content)) {
					for (const block of content) {
						if (block.type === "tool_use" && timestamp) {
							const date = timestamp.split("T")[0];
							const dayActivity = dailyActivityMap.get(date) || {
								messageCount: 0,
								sessionCount: 0,
								toolCallCount: 0,
							};
							dayActivity.toolCallCount++;
							dailyActivityMap.set(date, dayActivity);
						}
					}
				}
			}
		}

		if (!sessionHasNewMessages) continue;

		// Count session on the first NEW date it has messages
		totalSessions++;
		totalMessages += sessionMessageCount;

		const sortedDates = Array.from(newSessionDates).sort();
		if (sortedDates.length > 0) {
			const firstNewDate = sortedDates[0];
			const dayActivity = dailyActivityMap.get(firstNewDate) || {
				messageCount: 0,
				sessionCount: 0,
				toolCallCount: 0,
			};
			dayActivity.sessionCount++;
			dailyActivityMap.set(firstNewDate, dayActivity);
		}

		// Track longest session (only among new messages)
		if (sessionStartTime && sessionEndTime) {
			const duration = new Date(sessionEndTime).getTime() - new Date(sessionStartTime).getTime();
			if (duration > longestSession.duration) {
				longestSession = {
					sessionId,
					duration,
					messageCount: sessionMessageCount,
					timestamp: sessionStartTime,
				};
			}
		}
	}

	// Convert maps to arrays
	const dailyActivity: DailyActivity[] = Array.from(dailyActivityMap.entries())
		.map(([date, data]) => ({ date, ...data }))
		.sort((a, b) => a.date.localeCompare(b.date));

	const dailyModelTokens: DailyModelTokens[] = Array.from(dailyModelTokensMap.entries())
		.map(([date, tokensByModel]) => ({ date, tokensByModel }))
		.sort((a, b) => a.date.localeCompare(b.date));

	const modelUsage: Record<string, ModelUsage> = Object.fromEntries(modelUsageMap);

	const today = new Date().toISOString().split("T")[0];

	return {
		version: 1,
		lastComputedDate: today,
		dailyActivity,
		dailyModelTokens,
		modelUsage,
		totalSessions,
		totalMessages,
		longestSession,
		firstSessionDate,
		hourCounts,
		latestMessageTimestamp,
	};
}

/**
 * Merge a base StatsCache (from stats-cache.json) with incremental data
 * computed from recent JSONL files. For overlapping dates, incremental
 * data replaces base data. Model usage and hour counts are summed.
 * Returns a combined StatsCache covering the full date range.
 */
export function mergeStats(base: StatsCache, incremental: StatsCache): StatsCache {
	if (incremental.totalSessions === 0) {
		return base; // nothing new to merge
	}

	// Merge daily activity — base dates that aren't in incremental + all incremental dates
	const incrementalActivityDates = new Set(incremental.dailyActivity.map((d) => d.date));
	const mergedActivity = [
		...base.dailyActivity.filter((d) => !incrementalActivityDates.has(d.date)),
		...incremental.dailyActivity,
	].sort((a, b) => a.date.localeCompare(b.date));

	// Merge daily model tokens — same approach
	const incrementalTokenDates = new Set(incremental.dailyModelTokens.map((d) => d.date));
	const mergedTokens = [
		...base.dailyModelTokens.filter((d) => !incrementalTokenDates.has(d.date)),
		...incremental.dailyModelTokens,
	].sort((a, b) => a.date.localeCompare(b.date));

	// Merge model usage — sum values for each model
	const mergedModelUsage: Record<string, ModelUsage> = { ...base.modelUsage };
	for (const [model, usage] of Object.entries(incremental.modelUsage)) {
		const existing = mergedModelUsage[model];
		if (existing) {
			mergedModelUsage[model] = {
				inputTokens: existing.inputTokens + usage.inputTokens,
				outputTokens: existing.outputTokens + usage.outputTokens,
				cacheReadInputTokens: existing.cacheReadInputTokens + usage.cacheReadInputTokens,
				cacheCreationInputTokens: existing.cacheCreationInputTokens + usage.cacheCreationInputTokens,
				webSearchRequests: existing.webSearchRequests + usage.webSearchRequests,
				costUSD: existing.costUSD + usage.costUSD,
				contextWindow: Math.max(existing.contextWindow, usage.contextWindow),
				maxOutputTokens: Math.max(existing.maxOutputTokens, usage.maxOutputTokens),
			};
		} else {
			mergedModelUsage[model] = usage;
		}
	}

	// Merge hour counts
	const mergedHourCounts: Record<string, number> = { ...base.hourCounts };
	for (const [hour, count] of Object.entries(incremental.hourCounts)) {
		mergedHourCounts[hour] = (mergedHourCounts[hour] || 0) + count;
	}

	// Longest session — take the longer one
	const mergedLongestSession =
		incremental.longestSession.duration > base.longestSession.duration
			? incremental.longestSession
			: base.longestSession;

	// First session date — take the earlier one
	const mergedFirstSessionDate =
		base.firstSessionDate && incremental.firstSessionDate
			? base.firstSessionDate < incremental.firstSessionDate
				? base.firstSessionDate
				: incremental.firstSessionDate
			: base.firstSessionDate || incremental.firstSessionDate;

	// Latest message timestamp — take the later one
	const mergedLatestTimestamp =
		(incremental.latestMessageTimestamp || "") > (base.latestMessageTimestamp || "")
			? incremental.latestMessageTimestamp
			: base.latestMessageTimestamp;

	return {
		version: base.version,
		lastComputedDate: incremental.lastComputedDate,
		dailyActivity: mergedActivity,
		dailyModelTokens: mergedTokens,
		modelUsage: mergedModelUsage,
		totalSessions: base.totalSessions + incremental.totalSessions,
		totalMessages: base.totalMessages + incremental.totalMessages,
		longestSession: mergedLongestSession,
		firstSessionDate: mergedFirstSessionDate,
		hourCounts: mergedHourCounts,
		latestMessageTimestamp: mergedLatestTimestamp,
	};
}

function emptyStats(): StatsCache {
	return {
		version: 1,
		lastComputedDate: new Date().toISOString().split("T")[0],
		dailyActivity: [],
		dailyModelTokens: [],
		modelUsage: {},
		totalSessions: 0,
		totalMessages: 0,
		longestSession: { sessionId: "", duration: 0, messageCount: 0, timestamp: "" },
		firstSessionDate: "",
		hourCounts: {},
		latestMessageTimestamp: "",
	};
}
