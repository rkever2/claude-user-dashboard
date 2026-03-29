import path from "path";

export const config = {
	port: parseInt(process.env.PORT || "3080", 10),
	claudeDataDir: process.env.CLAUDE_DATA_DIR || path.join(process.env.HOME || "~", ".claude"),
	cacheTtlMs: 60_000,
};
