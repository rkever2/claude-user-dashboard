import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import { AppError } from "../errors.js";
import type { StatsCache } from "../types.js";

let cache: { data: StatsCache; timestamp: number } | null = null;

export async function getStatsCache(): Promise<StatsCache> {
  const now = Date.now();
  if (cache && now - cache.timestamp < config.cacheTtlMs) {
    return cache.data;
  }

  const filePath = path.join(config.claudeDataDir, "stats-cache.json");

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      throw new AppError(
        "STATS_CACHE_MISSING",
        "stats-cache.json not found. Have you used Claude Code CLI yet? Usage data is generated automatically as you use it.",
        404,
      );
    }
    throw new AppError(
      "DATA_DIR_ERROR",
      `Cannot read Claude data directory: ${(err as Error).message}`,
      500,
    );
  }

  let data: StatsCache;
  try {
    data = JSON.parse(raw);
  } catch (err: unknown) {
    throw new AppError(
      "PARSE_ERROR",
      `stats-cache.json contains invalid JSON: ${(err as Error).message}`,
      500,
    );
  }

  cache = { data, timestamp: now };
  return data;
}
