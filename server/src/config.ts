import path from "path";

const apiKey = process.env.ANTHROPIC_ADMIN_API_KEY || "";

export const config = {
  port: parseInt(process.env.PORT || "3080", 10),
  claudeDataDir: process.env.CLAUDE_DATA_DIR || path.join(process.env.HOME || "~", ".claude"),
  anthropicAdminApiKey: apiKey,
  // Default to "api" if key is configured, otherwise "local"
  dataSourceMode: (apiKey ? "api" : "local") as "local" | "api",
  cacheTtlMs: 60_000,
};
